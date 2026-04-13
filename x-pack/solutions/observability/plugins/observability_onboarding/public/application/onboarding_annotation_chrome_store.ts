/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

type Listener = () => void;

let annotationsCanvasVisible = true;
const listeners = new Set<Listener>();

export const ACTIVATE_ANNOTATION_MODE_EVENT = 'obsOnboarding:enterAnnotationMode';

export const PROMPT_REMOVE_ALL_ANNOTATIONS_EVENT = 'obsOnboarding:promptRemoveAllAnnotations';

export const annotationCanvasVisibility = {
  getSnapshot: (): boolean => annotationsCanvasVisible,
  /** Must match `getSnapshot` for `useSyncExternalStore` (hydration / strict checks). */
  getServerSnapshot: (): boolean => annotationsCanvasVisible,
  setVisible(next: boolean): void {
    if (next === annotationsCanvasVisible) return;
    annotationsCanvasVisible = next;
    listeners.forEach((l) => l());
  },
  toggleCanvas(): void {
    this.setVisible(!annotationsCanvasVisible);
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export function requestEnterAnnotationMode(): void {
  window.dispatchEvent(new CustomEvent(ACTIVATE_ANNOTATION_MODE_EVENT));
}

export function requestRemoveAllAnnotationsPrompt(): void {
  window.dispatchEvent(new CustomEvent(PROMPT_REMOVE_ALL_ANNOTATIONS_EVENT));
}
