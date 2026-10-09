import {
  archiveCard,
  nextZ,
  restoreCard,
  retitleCard,
  clampViewportZoom,
  type ArchiveViewMode,
  type CanvasModel,
  type ConversationCard,
  type FileNode,
  type InboxStatus,
} from "../core/model.ts";

export type CanvasAction =
  | { type: "move-card"; id: string; x: number; y: number }
  | { type: "focus"; id: string }
  | { type: "pan"; x: number; y: number }
  | { type: "set-viewport"; x: number; y: number; zoom: number }
  | { type: "set-status"; id: string; status: InboxStatus }
  | { type: "archive"; id: string; at: string }
  | { type: "restore"; id: string }
  | { type: "set-archive-view"; mode: ArchiveViewMode }
  | { type: "toggle-archive" }
  | { type: "add-file"; file: FileNode }
  | { type: "move-file"; id: string; x: number; y: number }
  | { type: "link"; fileId: string; cardId: string }
  | { type: "retitle"; id: string; title: string; at: string }
  | { type: "toggle-topics"; id: string }
  | { type: "add-cards"; cards: readonly ConversationCard[] };

function replaceCard(model: CanvasModel, id: string, next: ConversationCard): CanvasModel {
  return { ...model, cards: model.cards.map((card) => (card.id === id ? next : card)) };
}

export function reduceCanvas(model: CanvasModel, action: CanvasAction): CanvasModel {
  switch (action.type) {
    case "move-card": {
      const current = model.cards.find((card) => card.id === action.id);
      if (!current) return model;
      return replaceCard(model, action.id, { ...current, x: action.x, y: action.y });
    }
    case "focus": {
      const zIndex = nextZ(model.cards);
      const current = model.cards.find((card) => card.id === action.id);
      if (!current) return model;
      return replaceCard(model, action.id, { ...current, zIndex });
    }
    case "pan":
      return { ...model, viewport: { ...model.viewport, x: action.x, y: action.y } };
    case "set-viewport":
      return {
        ...model,
        viewport: { x: action.x, y: action.y, zoom: clampViewportZoom(action.zoom) },
      };
    case "set-status": {
      const current = model.cards.find((card) => card.id === action.id);
      if (!current) return model;
      return replaceCard(model, action.id, { ...current, status: action.status });
    }
    case "archive": {
      const current = model.cards.find((card) => card.id === action.id);
      if (!current) return model;
      return replaceCard(model, action.id, archiveCard(current, action.at));
    }
    case "restore": {
      const current = model.cards.find((card) => card.id === action.id);
      if (!current) return model;
      return replaceCard(model, action.id, restoreCard(current, nextZ(model.cards)));
    }
    case "set-archive-view":
      return { ...model, archiveViewMode: action.mode };
    case "toggle-archive":
      return { ...model, archiveOpen: !model.archiveOpen };
    case "add-file":
      return { ...model, files: [...model.files, action.file] };
    case "move-file":
      return {
        ...model,
        files: model.files.map((file) =>
          file.id === action.id ? { ...file, x: action.x, y: action.y } : file,
        ),
      };
    case "link": {
      if (model.edges.some((edge) => edge.fileId === action.fileId && edge.cardId === action.cardId)) {
        return model;
      }
      return {
        ...model,
        edges: [
          ...model.edges,
          { id: `${action.fileId}->${action.cardId}`, fileId: action.fileId, cardId: action.cardId },
        ],
      };
    }
    case "retitle": {
      const current = model.cards.find((card) => card.id === action.id);
      if (!current) return model;
      return replaceCard(model, action.id, retitleCard(current, action.title, action.at));
    }
    case "toggle-topics":
      return { ...model, openTopicsId: model.openTopicsId === action.id ? null : action.id };
    case "add-cards":
      return { ...model, cards: [...model.cards, ...action.cards] };
    default:
      return model;
  }
}
