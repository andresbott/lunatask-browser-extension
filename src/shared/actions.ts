import type { SaveAction } from "./types";

export type ActionContext = "page" | "link" | "selection";

export interface SaveActionDefinition {
  id: string;
  label: string;
  action: SaveAction;
  contextMenuContexts: readonly ActionContext[];
  popupContexts: readonly ActionContext[];
  successMessage: string;
}

export const SAVE_ACTIONS = [
  {
    id: "page-url-task",
    label: "Save URL to task",
    action: { source: "page-url", target: "task" },
    contextMenuContexts: ["page", "selection"],
    popupContexts: ["page"],
    successMessage: "Saved URL to task",
  },
  {
    id: "page-task",
    label: "Save content to task",
    action: { source: "page", target: "task" },
    contextMenuContexts: ["page", "selection"],
    popupContexts: ["page"],
    successMessage: "Saved content to task",
  },
  {
    id: "page-note",
    label: "Save content to note",
    action: { source: "page", target: "note" },
    contextMenuContexts: ["page", "selection"],
    popupContexts: ["page"],
    successMessage: "Saved content to note",
  },
  {
    id: "page-note-task",
    label: "Save content to note, create linked task",
    action: { source: "page", target: "note-with-task" },
    contextMenuContexts: ["page", "selection"],
    popupContexts: ["page"],
    successMessage: "Saved content to note and created linked task",
  },
  {
    id: "selection-task",
    label: "Save selection to task",
    action: { source: "selection", target: "task" },
    contextMenuContexts: ["selection"],
    popupContexts: ["selection"],
    successMessage: "Saved selection to task",
  },
  {
    id: "selection-note",
    label: "Save selection to note",
    action: { source: "selection", target: "note" },
    contextMenuContexts: ["selection"],
    popupContexts: ["selection"],
    successMessage: "Saved selection to note",
  },
  {
    id: "selection-note-task",
    label: "Save selection to note, create linked task",
    action: { source: "selection", target: "note-with-task" },
    contextMenuContexts: ["selection"],
    popupContexts: ["selection"],
    successMessage: "Saved selection to note and created linked task",
  },
  {
    id: "link-task",
    label: "Save link to task",
    action: { source: "link", target: "task" },
    contextMenuContexts: ["link"],
    popupContexts: [],
    successMessage: "Saved link to task",
  },
] as const satisfies readonly SaveActionDefinition[];

export type SaveActionId = (typeof SAVE_ACTIONS)[number]["id"];

export const SAVE_ACTIONS_BY_ID: Record<SaveActionId, SaveActionDefinition> =
  SAVE_ACTIONS.reduce(
    (actionsById, action) => {
      actionsById[action.id] = action;
      return actionsById;
    },
    {} as Record<SaveActionId, SaveActionDefinition>,
  );
