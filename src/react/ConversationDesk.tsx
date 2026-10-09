import { useEffect, useMemo, useRef, useState, type DragEvent, type PointerEvent } from "react";

import {
  archivedCards,
  activeCards,
  CARD_HEIGHT,
  CARD_WIDTH,
  CHAT_POPUP_HEIGHT,
  CHAT_POPUP_WIDTH,
  cardsInView,
  fitViewportToCards,
  STATUS_LABEL,
  worldViewport,
  type ArchiveViewMode,
  type CanvasModel,
  type ConversationCard,
  type FileNode,
} from "../core/model.ts";
import { type CanvasAction } from "../controller/reduce.ts";
import { peekLastMessage } from "../core/messagePeek.ts";

const DRAG_THRESHOLD_PX = 5;

interface DeskProps {
  model: CanvasModel;
  dispatch: (action: CanvasAction) => void;
  openChatId: string | null;
  onOpenChat: (id: string | null) => void;
  fitRequest?: number;
}

export function ConversationDesk({ model, dispatch, openChatId, onOpenChat, fitRequest = 0 }: DeskProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 960, height: 640 });
  const dragRef = useRef<{
    kind: "card" | "file" | "pan" | "link" | "popup";
    id: string;
    dx: number;
    dy: number;
    startClientX: number;
    startClientY: number;
    moved: boolean;
    openChatOnClick: boolean;
  } | null>(null);
  const [popupAt, setPopupAt] = useState<{ x: number; y: number } | null>(null);
  const popupPlacementForRef = useRef<string | null>(null);

  const view = worldViewport(model.viewport, stageSize.width, stageSize.height, 80);
  const live = activeCards(model);
  const mounted = useMemo(() => cardsInView(live, view), [live, view]);
  const archived = archivedCards(model);
  const openCard = openChatId ? live.find((item) => item.id === openChatId) : undefined;

  useEffect(() => {
    if (!openChatId) {
      popupPlacementForRef.current = null;
      setPopupAt(null);
      return;
    }
    if (popupPlacementForRef.current === openChatId) return;
    popupPlacementForRef.current = openChatId;
    const card = activeCards(model).find((item) => item.id === openChatId);
    if (!card) return;
    const z = model.viewport.zoom || 1;
    const pad = 12;
    const w = Math.min(CHAT_POPUP_WIDTH, stageSize.width - pad * 2);
    const h = Math.min(CHAT_POPUP_HEIGHT, stageSize.height - pad * 2);
    let x = model.viewport.x + card.x * z + CARD_WIDTH * z + 16;
    let y = model.viewport.y + card.y * z;
    if (x + w > stageSize.width - pad) {
      x = model.viewport.x + card.x * z - w - 16;
    }
    x = Math.max(pad, Math.min(x, stageSize.width - w - pad));
    y = Math.max(pad, Math.min(y, stageSize.height - h - pad));
    setPopupAt({ x, y });
  }, [openChatId, stageSize.width, stageSize.height, model]);

  useEffect(() => {
    if (fitRequest === 0) return;
    const next = fitViewportToCards(activeCards(model), stageSize.width, stageSize.height);
    dispatch({ type: "set-viewport", ...next });
  }, [fitRequest, dispatch, model, stageSize.width, stageSize.height]);

  function worldPoint(event: { clientX: number; clientY: number }) {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const zoom = model.viewport.zoom || 1;
    return {
      x: (event.clientX - rect.left - model.viewport.x) / zoom,
      y: (event.clientY - rect.top - model.viewport.y) / zoom,
    };
  }

  function zoomAt(clientX: number, clientY: number, nextZoom: number) {
    if (openChatId) return;
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    const zoom = model.viewport.zoom || 1;
    const clamped = Math.min(2.5, Math.max(0.25, nextZoom));
    const ratio = clamped / zoom;
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    dispatch({
      type: "set-viewport",
      x: px - (px - model.viewport.x) * ratio,
      y: py - (py - model.viewport.y) * ratio,
      zoom: clamped,
    });
  }

  function onPointerMove(event: PointerEvent) {
    const drag = dragRef.current;
    if (!drag) return;
    if (
      !drag.moved &&
      (Math.abs(event.clientX - drag.startClientX) > DRAG_THRESHOLD_PX ||
        Math.abs(event.clientY - drag.startClientY) > DRAG_THRESHOLD_PX)
    ) {
      drag.moved = true;
    }
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
    if (drag.kind === "popup") {
      const rect = stageRef.current?.getBoundingClientRect();
      if (!rect) return;
      const pad = 8;
      const w = Math.min(CHAT_POPUP_WIDTH, stageSize.width - pad * 2);
      const h = Math.min(CHAT_POPUP_HEIGHT, stageSize.height - pad * 2);
      const x = Math.max(pad, Math.min(event.clientX - rect.left - drag.dx, stageSize.width - w - pad));
      const y = Math.max(pad, Math.min(event.clientY - rect.top - drag.dy, stageSize.height - h - pad));
      setPopupAt({ x, y });
    }
  }

  function onPointerUp(event: PointerEvent) {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;
    if (drag.kind === "link") {
      const point = worldPoint(event);
      const hit = live.find(
        (card) =>
          point.x >= card.x &&
          point.x <= card.x + CARD_WIDTH &&
          point.y >= card.y &&
          point.y <= card.y + CARD_HEIGHT,
      );
      if (hit) dispatch({ type: "link", fileId: drag.id, cardId: hit.id });
      return;
    }
    if (drag.kind === "card" && !drag.moved && drag.openChatOnClick) {
      onOpenChat(drag.id);
    }
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    const dropped = [...event.dataTransfer.files];
    if (dropped.length === 0) return;
    const point = worldPoint(event);
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

  const zoom = model.viewport.zoom || 1;

  return (
    <div className="desk">
      <div className="desk-bar">
        <div className="view-tools">
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => zoomAt(stageSize.width / 2, stageSize.height / 2, zoom / 1.15)}
          >
            −
          </button>
          <span className="zoom-readout">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => zoomAt(stageSize.width / 2, stageSize.height / 2, zoom * 1.15)}
          >
            +
          </button>
          <button
            type="button"
            onClick={() => {
              if (openChatId) return;
              dispatch({ type: "set-viewport", ...fitViewportToCards(live, stageSize.width, stageSize.height) });
            }}
          >
            Fit
          </button>
        </div>
        <button type="button" className="archive-toggle" onClick={() => dispatch({ type: "toggle-archive" })}>
          <ArchiveIcon />
          <span className="sr-only">Archive bin</span>
          {archived.length > 0 ? <span className="archive-count">{archived.length}</span> : null}
        </button>
      </div>
      <div
        ref={(node) => {
          stageRef.current = node;
          if (node && (node.clientWidth !== stageSize.width || node.clientHeight !== stageSize.height)) {
            setStageSize({ width: node.clientWidth, height: node.clientHeight });
          }
        }}
        className={openChatId ? "stage stage-modal-open" : "stage"}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onWheel={(event) => {
          if (openChatId) return;
          event.preventDefault();
          const delta = event.deltaY > 0 ? 1 / 1.08 : 1.08;
          zoomAt(event.clientX, event.clientY, zoom * delta);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={onDrop}
      >
        <div
          className="stage-pan"
          aria-hidden="true"
          onPointerDown={(event) => {
            if (openChatId) return;
            if (event.button !== 0) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            dragRef.current = {
              kind: "pan",
              id: "viewport",
              dx: event.clientX - model.viewport.x,
              dy: event.clientY - model.viewport.y,
              startClientX: event.clientX,
              startClientY: event.clientY,
              moved: false,
              openChatOnClick: false,
            };
          }}
        />
        <div
          className="world"
          style={{
            transform: `translate(${model.viewport.x}px, ${model.viewport.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
          }}
        >
          <svg className="edges" aria-hidden="true">
            {model.edges.map((edge) => {
              const file = model.files.find((item) => item.id === edge.fileId);
              const card = model.cards.find((item) => item.id === edge.cardId);
              if (!file || !card) return null;
              return (
                <line key={edge.id} x1={file.x + 72} y1={file.y + 28} x2={card.x} y2={card.y + 40} />
              );
            })}
          </svg>
          {model.files.map((file) => (
            <article
              key={file.id}
              className="file-node"
              style={{ left: file.x, top: file.y, zIndex: file.zIndex }}
              onPointerDown={(event) => {
                event.stopPropagation();
                event.currentTarget.setPointerCapture(event.pointerId);
                const point = worldPoint(event);
                dragRef.current = {
                  kind: "file",
                  id: file.id,
                  dx: point.x - file.x,
                  dy: point.y - file.y,
                  startClientX: event.clientX,
                  startClientY: event.clientY,
                  moved: false,
                  openChatOnClick: false,
                };
              }}
            >
              <strong>{file.name}</strong>
              <button
                type="button"
                className="port"
                aria-label={`Connect ${file.name} to a chat`}
                title="Drag onto a chat card"
                onPointerDown={(event) => {
                  event.stopPropagation();
                  dragRef.current = {
                    kind: "link",
                    id: file.id,
                    dx: 0,
                    dy: 0,
                    startClientX: event.clientX,
                    startClientY: event.clientY,
                    moved: false,
                    openChatOnClick: false,
                  };
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
              chatOpen={openChatId === card.id}
              historyOpen={model.openTopicsId === card.id}
              onOpenChat={() => {
                dispatch({ type: "focus", id: card.id });
                onOpenChat(card.id);
              }}
              onPointerDown={(event, openChatOnClick) => {
                dispatch({ type: "focus", id: card.id });
                const root = (event.target as HTMLElement).closest(".card");
                root?.setPointerCapture(event.pointerId);
                const point = worldPoint(event);
                dragRef.current = {
                  kind: "card",
                  id: card.id,
                  dx: point.x - card.x,
                  dy: point.y - card.y,
                  startClientX: event.clientX,
                  startClientY: event.clientY,
                  moved: false,
                  openChatOnClick,
                };
              }}
              onArchive={() => dispatch({ type: "archive", id: card.id, at: new Date().toISOString() })}
              onToggleHistory={() => dispatch({ type: "toggle-topics", id: card.id })}
              onRetitle={(title) =>
                dispatch({ type: "retitle", id: card.id, title, at: new Date().toISOString() })
              }
            />
          ))}
        </div>
        {openCard && popupAt ? (
          <>
            <button
              type="button"
              className="canvas-scrim"
              aria-label="Close chat and return to canvas"
              onClick={() => onOpenChat(null)}
            />
            <ChatPopup
              card={openCard}
              left={popupAt.x}
              top={popupAt.y}
              width={Math.min(CHAT_POPUP_WIDTH, stageSize.width - 24)}
              height={Math.min(CHAT_POPUP_HEIGHT, stageSize.height - 24)}
              onClose={() => onOpenChat(null)}
              onDragStart={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                dragRef.current = {
                  kind: "popup",
                  id: openCard.id,
                  dx: event.clientX - (stageRef.current?.getBoundingClientRect().left ?? 0) - popupAt.x,
                  dy: event.clientY - (stageRef.current?.getBoundingClientRect().top ?? 0) - popupAt.y,
                  startClientX: event.clientX,
                  startClientY: event.clientY,
                  moved: false,
                  openChatOnClick: false,
                };
              }}
            />
          </>
        ) : null}
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
  chatOpen,
  historyOpen,
  onOpenChat,
  onPointerDown,
  onArchive,
  onToggleHistory,
  onRetitle,
}: {
  card: ConversationCard;
  chatOpen: boolean;
  historyOpen: boolean;
  onOpenChat: () => void;
  onPointerDown: (event: PointerEvent, openChatOnClick: boolean) => void;
  onArchive: () => void;
  onToggleHistory: () => void;
  onRetitle: (title: string) => void;
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState(card.title);

  useEffect(() => {
    if (!editingTitle) setDraftTitle(card.title);
  }, [card.title, editingTitle]);

  function commitTitle() {
    setEditingTitle(false);
    const trimmed = draftTitle.trim();
    if (trimmed && trimmed !== card.title) onRetitle(trimmed);
    else setDraftTitle(card.title);
  }

  const lastMessage = peekLastMessage(card.blurb);

  return (
    <article
      className={chatOpen ? "card card-source-open" : "card"}
      style={{ left: card.x, top: card.y, zIndex: card.zIndex, width: CARD_WIDTH }}
      onPointerDown={(event) => {
        const target = event.target as HTMLElement;
        if (target.closest(".card-title-bar")) return;
        const button = target.closest("button");
        if (button && !button.classList.contains("card-preview")) return;
        const openChatOnClick = Boolean(target.closest(".card-preview"));
        onPointerDown(event, openChatOnClick);
      }}
    >
      <header className="card-title-bar" onPointerDown={(event) => event.stopPropagation()}>
        <span
          className={`status-dot status-${card.status}`}
          title={STATUS_LABEL[card.status]}
          aria-label={`Status: ${STATUS_LABEL[card.status]}`}
        />
        {editingTitle ? (
          <input
            className="title-input"
            value={draftTitle}
            autoFocus
            onChange={(event) => setDraftTitle(event.target.value)}
            onBlur={commitTitle}
            onKeyDown={(event) => {
              if (event.key === "Enter") commitTitle();
              if (event.key === "Escape") {
                setDraftTitle(card.title);
                setEditingTitle(false);
              }
            }}
            onPointerDown={(event) => event.stopPropagation()}
          />
        ) : (
          <h2
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => setEditingTitle(true)}
          >
            {card.title}
          </h2>
        )}
      </header>
      <button
        type="button"
        className="card-preview preview-snapshot"
        aria-label={`Open chat. Last message: ${lastMessage.text}${lastMessage.truncated ? "…" : ""}`}
        onClick={(event) => {
          event.stopPropagation();
          onOpenChat();
        }}
      >
        <span className="preview-text">
          {lastMessage.text}
          {lastMessage.truncated ? (
            <span className="preview-ellipsis" aria-hidden="true">
              …
            </span>
          ) : null}
        </span>
      </button>
      <footer onPointerDown={(event) => event.stopPropagation()}>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggleHistory();
          }}
        >
          History
        </button>
        <button
          type="button"
          className="icon-button"
          aria-label={`Archive ${card.title}`}
          onClick={(event) => {
            event.stopPropagation();
            onArchive();
          }}
        >
          <ArchiveIcon />
        </button>
      </footer>
      {historyOpen ? (
        <ol className="history">
          <li aria-current="true">{card.title}</li>
          {card.topics.map((topic) => (
            <li key={topic.id}>{topic.title}</li>
          ))}
        </ol>
      ) : null}
    </article>
  );
}

function ChatPopup({
  card,
  left,
  top,
  width,
  height,
  onClose,
  onDragStart,
}: {
  card: ConversationCard;
  left: number;
  top: number;
  width: number;
  height: number;
  onClose: () => void;
  onDragStart: (event: PointerEvent<HTMLElement>) => void;
}) {
  return (
    <div
      className="chat-popup"
      role="dialog"
      aria-modal="true"
      aria-label={`Chat: ${card.title}`}
      style={{ left, top, width, height }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="chat-popup-chrome" onPointerDown={onDragStart}>
        <span className={`status-dot status-${card.status}`} title={STATUS_LABEL[card.status]} />
        <strong className="chat-popup-title">{card.title}</strong>
        <button type="button" className="chat-popup-close" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="chat-thread-expanded">
        <p className="bubble user">Can you pick this back up where we left off?</p>
        <p className="bubble agent">{card.blurb}</p>
        <p className="bubble user">Yes — keep going on that thread.</p>
        <p className="bubble agent">
          Still on it. I will post an update when the next checkpoint lands.
        </p>
        <p className="chat-note">Demo transcript — the product loads the full thread here.</p>
      </div>
    </div>
  );
}

function ArchiveIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M2 3h12v2H2V3zm1 3h10l-.5 7H3.5L3 6zm3 1v4h4V7H6z"
      />
    </svg>
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
            className="card"
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
