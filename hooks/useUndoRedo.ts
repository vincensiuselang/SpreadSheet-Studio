
import { useState, useCallback } from 'react';

export interface UseUndoRedoReturn<T> {
  state: T;
  setState: (newState: T | ((prev: T) => T), mode?: 'push' | 'replace') => void;
  reset: (initialState: T) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  history: T[];
}

export function useUndoRedo<T>(initialState: T): UseUndoRedoReturn<T> {
  const [history, setHistory] = useState<T[]>([initialState]);
  const [index, setIndex] = useState(0);

  const state = history[index];

  const setState = useCallback((newState: T | ((prev: T) => T), mode: 'push' | 'replace' = 'push') => {
    setHistory((prevHistory) => {
      const currentState = prevHistory[index];
      const resolvedState = typeof newState === 'function' 
        ? (newState as Function)(currentState) 
        : newState;

      if (mode === 'replace') {
        // Replace current entry
        const newHistory = [...prevHistory];
        newHistory[index] = resolvedState;
        return newHistory;
      } else {
        // Push new entry and truncate future
        const newHistory = prevHistory.slice(0, index + 1);
        newHistory.push(resolvedState);
        setIndex(newHistory.length - 1);
        return newHistory;
      }
    });
  }, [index]);

  const reset = useCallback((newInitialState: T) => {
    setHistory([newInitialState]);
    setIndex(0);
  }, []);

  const undo = useCallback(() => {
    setIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const redo = useCallback(() => {
    setIndex((prev) => Math.min(history.length - 1, prev + 1));
  }, [history.length]);

  return {
    state,
    setState,
    reset,
    undo,
    redo,
    canUndo: index > 0,
    canRedo: index < history.length - 1,
    history
  };
}
