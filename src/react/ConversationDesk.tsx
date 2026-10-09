import { useMemo, useRef, useState, type DragEvent, type PointerEvent } from "react";

import {
  archivedCards,
  activeCards,
  CARD_HEIGHT,
  CARD_WIDTH,
  cardsInView,
  STATUS_LABEL,
  worldViewport,
  type ArchiveViewMode,
  type CanvasModel,
  type ConversationCard,
  type FileNode,
  type InboxStatus,
} from "../core/model.ts";
import { type CanvasAction } from "../controller/reduce.ts";

const STATUSES: InboxStatus[] = ["working", "waiting", "unread", "read", "needsResponse", "completed"];

interface DeskProps {
  model: CanvasModel;
  dispatch: (action: CanvasAction) => void;
}

export function ConversationDesk({ model, dispatch }: DeskProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 960, height: 640 });
  const dragRef = useRef<{ kind: "card" | "file" | "pan" | "link"; id: string; dx: number; dy: number } | null>(
    null,
  );

  const view = worldViewport(model.viewport, stageSize.width, stageSize.height, 80);
  const live = activeCards(model);
  const mounted = useMemo(() => cardsInView(live, view), [live, view]);
  const archived = archivedCards(model);

  function worldPoint(event: { clientX: number; clientY: number }) {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const zoom = model.viewport.zoom || 1;
    return {
      x: (event.clientX - rect.left - model.viewport.x) / zoom,
      y: (event.clientY - rect.top - model.viewport.y) / zoom,
    };
  }

  function onPointerMove(event: PointerEvent) {
    const drag = dragRef.current;
    if (!drag) return;
    const point = worldPoint(event);
    if (drag.kind === "pan") {
      dispatch({ type: "pan", x: event.clientX - drag.dx, y: event.clientY - drag.dy });
      return;
    }
    if (drag.kind === "card") {
      dispatch({ type: "move-card", id: drag.id, x: point.x - drag.dx, y: point.y - drag.dy });
    }
    if (drag.kind === "file") {
      dispatch({ type: "move-file", id: drag.id, x: point.x - drag.dx, y: point.y - drag.dy });
    }
  }

  function onPointerUp(event: PointerEvent) {
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag?.kind !== "link") return;
    const point = worldPoint(event);
    const hit = live.find(
      (card) => point.x >= card.x && point.x <= card.x + CARD_WIDTH && point.y >= card.y && point.y <= card.y + CARD_HEIGHT,
    );
    if (hit) dispatch({ type: "link", fileId: drag.id, cardId: hit.id });
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    const point = worldPoint(event);
    const dropped = [...event.dataTransfer.files];
    if (dropped.length === 0) {
      const name = event.dataTransfer.getData("text/plain") || "dropped-note.md";
      dispatch({
        type: "add-file",
        file: { id: `file-${Date.now()}`, name, x: point.x, y: point.y, zIndex: 1 },
      });
      return;
    }
    dropped.forEach((file, index) => {
      const node: FileNode = {
        id: `file-${file.name}-${Date.now()}-${index}`,
        name: file.name,
        x: point.x + index * 28,
        y: point.y + index * 28,
        zIndex: 1,
      };
      dispatch({ type: "add-file", file: node });
    });
  }

  return (
    <div className="desk">
      <div className="desk-bar">
        <p>
          Mounted {mounted.length} of {live.length} cards. Transcripts stay closed.
        </p>
        <button type="button" onClick={() => dispatch({ type: "toggle-archive" })}>
          Archive bin ({archived.length})
        </button>
      </div>
      <div
        ref={(node) => {
          stageRef.current = node;
          if (node && (node.clientWidth !== stageSize.width || node.clientHeight !== stageSize.height)) {
            setStageSize({ width: node.clientWidth, height: node.clientHeight });
          }
        }}
        className="stage"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onDragOver={(event) => event.preventDefault()}
        onDrop={onDrop}
        onPointerDown={(event) => {
          if (event.target !== event.currentTarget) return;
          dragRef.current = {
            kind: "pan",
            id: "viewport",
            dx: event.clientX - model.viewport.x,
            dy: event.clientY - model.viewport.y,
          };
        }}
      >
        <div
          className="world"
          style={{ transform: `translate(${model.viewport.x}px, ${model.viewport.y}px)` }}
        >
          <svg className="edges" aria-hidden="true">
            {model.edges.map((edge) => {
              const file = model.files.find((item) => item.id === edge.fileId);
              const card = model.cards.find((item) => item.id === edge.cardId);
              if (!file || !card) return null;
              return (
                <line
                  key={edge.id}
                  x1={file.x + 72}
                  y1={file.y + 28}
                  x2={card.x}
                  y2={card.y + 40}
                />
              );
            })}
          </svg>
          {model.files.map((file) => (
            <article
              key={file.id}
              className="file-node"
              style={{ left: file.x, top: file.y, zIndex: file.zIndex }}
              onPointerDown={(event) => {
                const point = worldPoint(event);
                dragRef.current = { kind: "file", id: file.id, dx: point.x - file.x, dy: point.y - file.y };
              }}
            >
              <strong>{file.name}</strong>
              <button
                type="button"
                className="port"
                aria-label={`Connect ${file.name}`}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  dragRef.current = { kind: "link", id: file.id, dx: 0, dy: 0 };
                }}
              >
                Link
              </button>
            </article>
          ))}
          {mounted.map((card) => (
            <CardView
              key={card.id}
              card={card}
              topicsOpen={model.openTopicsId === card.id}
              onPointerDown={(event) => {
                dispatch({ type: "focus", id: card.id });
                const point = worldPoint(event);
                dragRef.current = { kind: "card", id: card.id, dx: point.x - card.x, dy: point.y - card.y };
              }}
              onArchive={() => dispatch({ type: "archive", id: card.id, at: new Date().toISOString() })}
              onStatus={(status) => dispatch({ type: "set-status", id: card.id, status })}
              onTopics={() => dispatch({ type: "toggle-topics", id: card.id })}
              onRetitle={() => {
                const title = window.prompt("New topic title", card.title);
                if (title) dispatch({ type: "retitle", id: card.id, title, at: new Date().toISOString() });
              }}
            />
          ))}
        </div>
      </div>
      {model.archiveOpen ? (
        <ArchiveBin
          cards={archived}
          mode={model.archiveViewMode}
          onMode={(mode) => dispatch({ type: "set-archive-view", mode })}
          onRestore={(id) => dispatch({ type: "restore", id })}
          onClose={() => dispatch({ type: "toggle-archive" })}
        />
      ) : null}
    </div>
  );
}

function CardView({
  card,
  topicsOpen,
  onPointerDown,
  onArchive,
  onStatus,
  onTopics,
  onRetitle,
}: {
  card: ConversationCard;
  topicsOpen: boolean;
  onPointerDown: (event: PointerEvent) => void;
  onArchive: () => void;
  onStatus: (status: InboxStatus) => void;
  onTopics: () => void;
  onRetitle: () => void;
}) {
  return (
    <article
      className={`card status-${card.status}`}
      style={{ left: card.x, top: card.y, zIndex: card.zIndex, width: CARD_WIDTH }}
      onPointerDown={onPointerDown}
    >
      <header>
        <span className="status-dot" />
        <span>{STATUS_LABEL[card.status]}</span>
      </header>
      <div className="preview" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <h2>{card.title}</h2>
      <p>{card.blurb}</p>
      <footer>
        <button type="button" onClick={onTopics}>
          Topics
        </button>
        <button type="button" onClick={onRetitle}>
          Retitle
        </button>
        <button type="button" onClick={onArchive}>
          Archive
        </button>
        <select
          aria-label={`Status for ${card.title}`}
          value={card.status}
          onChange={(event) => onStatus(event.target.value as InboxStatus)}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABEL[status]}
            </option>
          ))}
        </select>
      </footer>
      {topicsOpen ? (
        <ol className="topics">
          <li>{card.title}</li>
          {card.topics.map((topic) => (
            <li key={topic.id}>{topic.title}</li>
          ))}
        </ol>
      ) : null}
    </article>
  );
}

function ArchiveBin({
  cards,
  mode,
  onMode,
  onRestore,
  onClose,
}: {
  cards: ConversationCard[];
  mode: ArchiveViewMode;
  onMode: (mode: ArchiveViewMode) => void;
  onRestore: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <aside className="archive" aria-label="Archive bin">
      <header>
        <h2>Archive bin</h2>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </header>
      <div className="view-switch" role="tablist">
        {(["spatial", "grid", "list"] as const).map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={mode === item}
            onClick={() => onMode(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <div className={`archive-body view-${mode}`}>
        {cards.length === 0 ? <p>Nothing archived yet.</p> : null}
        {cards.map((card, index) => (
          <article
            key={card.id}
            className={`card status-${card.status}`}
            style={
              mode === "spatial"
                ? { left: card.x, top: card.y, zIndex: cards.length - index, position: "absolute" }
                : undefined
            }
          >
            <h3>{card.title}</h3>
            <p>{card.blurb}</p>
            <button type="button" onClick={() => onRestore(card.id)}>
              Restore
            </button>
          </article>
        ))}
      </div>
    </aside>
  );
}
