import type { BookDocument } from "./document";
export type History = {
  past: BookDocument[];
  present: BookDocument;
  future: BookDocument[];
};
export function commit(history: History, next: BookDocument): History {
  if (JSON.stringify(history.present) === JSON.stringify(next)) return history;
  return {
    past: [...history.past, history.present].slice(-60),
    present: { ...next, updatedAt: new Date().toISOString() },
    future: [],
  };
}
export function undo(history: History): History {
  if (!history.past.length) return history;
  return {
    past: history.past.slice(0, -1),
    present: { ...history.past.at(-1)!, updatedAt: new Date().toISOString() },
    future: [history.present, ...history.future],
  };
}
export function redo(history: History): History {
  if (!history.future.length) return history;
  return {
    past: [...history.past, history.present],
    present: { ...history.future[0], updatedAt: new Date().toISOString() },
    future: history.future.slice(1),
  };
}
