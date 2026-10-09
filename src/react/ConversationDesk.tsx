import { useEffect, useMemo, useRef, useState, type DragEvent, type PointerEvent, type PointerEventHandler } from "react";

import {
  archivedCards,
  activeCards,
  CARD_HEIGHT,
  CARD_WIDTH,
  CHAT_POPUP_HEIGHT,
  CHAT_POPUP_WIDTH,
  cardsInView,
  clampViewportZoom,
  fitViewportToCards,
  inboxStatusForDisplay,
  showsInboxStatusLight,
  statusLampTitle,
  type LampDisplayStatus,
  worldViewport,
  type ArchiveViewMode,
  type CanvasModel,
  type ConversationCard,
  type FileNode,
} from "../core/model.ts";
import { initialChatPanelPlacement, isDesktopMultiChat, popOutChatWindow } from "../chatDetach.ts";
import { ChatThreadDemo } from "./ChatThreadDemo.tsx";
import { type CanvasAction } from "../controller/reduce.ts";
import { peekLastMessage } from "../core/messagePeek.ts";

interface ChatPanelPlacement {
  readonly id: string;
  readonly x: number;
  readonly y: number;
}

const DRAG_THRESHOLD_PX = 5;

function wheelShouldZoomCanvas(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.closest(".desk-bar")) return false;
  if (target.closest(".chat-thread-expanded, .chat-composer")) return false;
  if (target.closest(".archive-body")) return false;
  return true;
}

interface DeskProps {
  model: CanvasModel;
  dispatch: (action: CanvasAction) => void;
  fitRequest?: number;
}

export function ConversationDesk({ model, dispatch, fitRequest = 0 }: DeskProps) {
  const multiChat = isDesktopMultiChat();
  const deskRef = useRef<HTMLDivElement>(null);
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
  const [chatPanels, setChatPanels] = useState<ChatPanelPlacement[]>([]);
  const [composerDraftByCard, setComposerDraftByCard] = useState<Record<string, boolean>>({});

  function setComposerDraft(cardId: string, hasDraft: boolean) {
    setComposerDraftByCard((current) => {
      if (hasDraft) return { ...current, [cardId]: true };
      if (!(cardId in current)) return current;
      const next = { ...current };
      delete next[cardId];
      return next;
    });
  }

  const view = worldViewport(model.viewport, stageSize.width, stageSize.height, 80);
  const live = activeCards(model);
  const mounted = useMemo(() => cardsInView(live, view), [live, view]);
  const archived = archivedCards(model);
  const canvasModalOpen = !multiChat && chatPanels.length > 0;
  const openPanelIds = useMemo(() => new Set(chatPanels.map((panel) => panel.id)), [chatPanels]);

  function openChatPanel(id: string) {
    dispatch({ type: "focus", id });
    setChatPanels((current) => {
      const existing = current.find((panel) => panel.id === id);
      if (existing) {
        return [...current.filter((panel) => panel.id !== id), existing];
      }
      const card = activeCards(model).find((item) => item.id === id);
      if (!card) return current;
      if (!multiChat) {
        const place = initialChatPanelPlacement(card, model.viewport, stageSize, 0);
        return [{ id, x: place.x, y: place.y }];
      }
      const place = initialChatPanelPlacement(card, model.viewport, stageSize, current.length);
      return [...current, { id, x: place.x, y: place.y }];
    });
  }

  function closeChatPanel(id: string) {
    setChatPanels((current) => current.filter((panel) => panel.id !== id));
  }

  const modelRef = useRef(model);
  modelRef.current = model;
  const canvasModalOpenRef = useRef(canvasModalOpen);
  canvasModalOpenRef.current = canvasModalOpen;

  useEffect(() => {
    const desk = deskRef.current;
    if (!desk) return;

    function onWheel(event: WheelEvent) {
      if (canvasModalOpenRef.current) return;
      if (!wheelShouldZoomCanvas(event.target)) return;

      event.preventDefault();
      event.stopPropagation();

      const stage = stageRef.current;
      if (!stage) return;
      const rect = stage.getBoundingClientRect();
      const viewport = modelRef.current.viewport;
      const zoom = viewport.zoom || 1;
      const delta = event.deltaY > 0 ? 1 / 1.08 : 1.08;
      const clamped = clampViewportZoom(zoom * delta);
      const ratio = clamped / zoom;
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;
      dispatch({
        type: "set-viewport",
        x: px - (px - viewport.x) * ratio,
        y: py - (py - viewport.y) * ratio,
        zoom: clamped,
      });
    }

    desk.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => desk.removeEventListener("wheel", onWheel, { capture: true });
  }, [dispatch]);

  useEffect(() => {
    if (fitRequest === 0) return;
    const next = fitViewportToCards(
      activeCards(modelRef.current),
      stageSize.width,
      stageSize.height,
    );
    dispatch({ type: "set-viewport", ...next });
  }, [fitRequest, dispatch, stageSize.width, stageSize.height]);

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
    if (canvasModalOpen) return;
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    const zoom = model.viewport.zoom || 1;
    const clamped = clampViewportZoom(nextZoom);
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
      setChatPanels((current) =>
        current.map((panel) => (panel.id === drag.id ? { ...panel, x, y } : panel)),
      );
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
      openChatPanel(drag.id);
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
    <div className="desk" ref={deskRef}>
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
            aria-label="Zoom to 100 percent"
            onClick={() => zoomAt(stageSize.width / 2, stageSize.height / 2, 1)}
          >
            100%
          </button>
          <button
            type="button"
            onClick={() => {
              if (canvasModalOpen) return;
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
        className={canvasModalOpen ? "stage stage-modal-open" : "stage"}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onDragOver={(event) => event.preventDefault()}
        onDrop={onDrop}
      >
        <div
          className="stage-pan"
          aria-hidden="true"
          onPointerDown={(event) => {
            if (canvasModalOpen) return;
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
                title="Drag onto a chat"
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
              lampStatus={inboxStatusForDisplay(
                card.status,
                composerDraftByCard[card.id] ?? false,
              )}
              chatOpen={openPanelIds.has(card.id)}
              historyOpen={model.openTopicsId === card.id}
              onOpenChat={() => openChatPanel(card.id)}
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
              onSignOff={() => dispatch({ type: "set-status", id: card.id, status: "signedOff" })}
            />
          ))}
        </div>
        {canvasModalOpen ? (
          <button
            type="button"
            className="canvas-scrim"
            aria-label="Close chat and return to canvas"
            onClick={() => closeChatPanel(chatPanels[chatPanels.length - 1]?.id ?? "")}
          />
        ) : null}
        {chatPanels.map((panel, index) => {
          const card = live.find((item) => item.id === panel.id);
          if (!card) return null;
          return (
            <ChatPopup
              key={panel.id}
              card={card}
              lampStatus={inboxStatusForDisplay(
                card.status,
                composerDraftByCard[card.id] ?? false,
              )}
              simulatedOsWindow={multiChat}
              onComposerDraftChange={(hasDraft) => setComposerDraft(panel.id, hasDraft)}
              left={panel.x}
              top={panel.y}
              width={Math.min(CHAT_POPUP_WIDTH, stageSize.width - 24)}
              height={Math.min(CHAT_POPUP_HEIGHT, stageSize.height - 24)}
              zIndex={50 + index}
              onClose={() => closeChatPanel(panel.id)}
              onPopOut={() => closeChatPanel(panel.id)}
              onFocus={() => openChatPanel(panel.id)}
              onDragStart={(event) => {
                if (event.button !== 0) return;
                (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
                const rect = stageRef.current?.getBoundingClientRect();
                dragRef.current = {
                  kind: "popup",
                  id: panel.id,
                  dx: event.clientX - (rect?.left ?? 0) - panel.x,
                  dy: event.clientY - (rect?.top ?? 0) - panel.y,
                  startClientX: event.clientX,
                  startClientY: event.clientY,
                  moved: false,
                  openChatOnClick: false,
                };
              }}
            />
          );
        })}
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
  lampStatus,
  chatOpen,
  historyOpen,
  onOpenChat,
  onPointerDown,
  onArchive,
  onToggleHistory,
  onRetitle,
  onSignOff,
}: {
  card: ConversationCard;
  lampStatus: LampDisplayStatus;
  chatOpen: boolean;
  historyOpen: boolean;
  onOpenChat: () => void;
  onPointerDown: (event: PointerEvent, openChatOnClick: boolean) => void;
  onArchive: () => void;
  onToggleHistory: () => void;
  onRetitle: (title: string) => void;
  onSignOff: () => void;
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
        if (target.closest(".title-input")) return;
        const button = target.closest("button");
        if (button && !button.classList.contains("card-preview")) return;
        const openChatOnClick = Boolean(target.closest(".card-preview"));
        onPointerDown(event, openChatOnClick);
      }}
    >
      <header className="card-title-bar">
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
          <div className="card-title-row">
            <h2>{card.title}</h2>
            <button
              type="button"
              className="title-edit icon-button"
              aria-label={`Rename ${card.title}`}
              onClick={(event) => {
                event.stopPropagation();
                setEditingTitle(true);
              }}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <EditIcon />
            </button>
          </div>
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
      <footer className="card-footer" onPointerDown={(event) => event.stopPropagation()}>
        <div className="card-footer-left">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onToggleHistory();
            }}
          >
            History
          </button>
          {showsInboxStatusLight(lampStatus) ? (
            <button
              type="button"
              className={`card-status-light status-dot status-${lampStatus}`}
              title={`${statusLampTitle(lampStatus)} Click to sign off (demo).`}
              aria-label={`${statusLampTitle(lampStatus)} Sign off after review (demo).`}
              onClick={(event) => {
                event.stopPropagation();
                onSignOff();
              }}
            />
          ) : (
            <span className="visually-hidden">Signed off — no status lamp</span>
          )}
        </div>
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
  lampStatus,
  simulatedOsWindow,
  left,
  top,
  width,
  height,
  zIndex,
  onClose,
  onPopOut,
  onFocus,
  onDragStart,
  onComposerDraftChange,
}: {
  card: ConversationCard;
  lampStatus: LampDisplayStatus;
  simulatedOsWindow: boolean;
  left: number;
  top: number;
  width: number;
  height: number;
  zIndex: number;
  onClose: () => void;
  onPopOut: () => void;
  onFocus: () => void;
  onDragStart: PointerEventHandler<HTMLElement>;
  onComposerDraftChange: (hasDraft: boolean) => void;
}) {
  const [popOutBlocked, setPopOutBlocked] = useState(false);

  return (
    <div
      className="chat-popup"
      role="dialog"
      aria-modal={simulatedOsWindow ? "false" : "true"}
      aria-label={`Chat: ${card.title}`}
      style={{ left, top, width, height, zIndex }}
      onPointerDown={(event) => {
        event.stopPropagation();
        onFocus();
      }}
    >
      <div className="chat-popup-chrome">
        <div className="chat-popup-drag" onPointerDown={onDragStart}>
          <strong className="chat-popup-title">{card.title}</strong>
          {showsInboxStatusLight(lampStatus) ? (
            <span
              className={`status-dot status-${lampStatus}`}
              title={statusLampTitle(lampStatus)}
              aria-label={statusLampTitle(lampStatus)}
            />
          ) : (
            <span className="visually-hidden">Signed off</span>
          )}
        </div>
        <div className="chat-popup-actions">
          <button
            type="button"
            className="chat-popup-popout icon-button"
            aria-label={`Pop out ${card.title} to a browser window`}
            title="Pop out to browser window"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              const win = popOutChatWindow(card);
              if (win) {
                setPopOutBlocked(false);
                onPopOut();
                return;
              }
              setPopOutBlocked(true);
            }}
          >
            <PopOutIcon />
          </button>
          <button
            type="button"
            className="chat-popup-close"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onClose();
            }}
          >
            Close
          </button>
        </div>
      </div>
      <ChatThreadDemo
        blurb={card.blurb}
        onComposerDraftChange={onComposerDraftChange}
        standinNote={
          popOutBlocked
            ? "Pop-up blocked by the browser — allow pop-ups for this site or keep chatting in the panel."
            : simulatedOsWindow
              ? "Use Pop out for a real browser window; the shipped desktop app would use OS windows."
              : undefined
        }
      />
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

function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M11.5 2.5a1.8 1.8 0 0 1 2.5 2.5L6.7 12.3 3 13l.7-3.7L11.5 2.5zM2 14h12v1.5H2V14z"
      />
    </svg>
  );
}

function PopOutIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M9 2h5v5h-1.5V4.6L7.8 9.3 6.7 8.2 11.4 3.5H9V2zM3 4h4.5V5.5H4.5v6h6V9.5H12v4.5H3V4z"
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
