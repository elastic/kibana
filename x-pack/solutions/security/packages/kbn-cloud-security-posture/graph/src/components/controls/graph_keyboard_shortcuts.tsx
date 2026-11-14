/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, type RefObject } from 'react';
import type { FitViewOptions } from '@xyflow/react';
import type { NodeViewModel } from '../types';
import { getGraphKeyboardShortcut, type GraphKeyboardShortcutId } from './keyboard_shortcuts';
import { useGraphViewportActions } from './use_graph_viewport_actions';

const NON_TEXT_INPUT_TYPES: ReadonlySet<string> = new Set([
  'button',
  'checkbox',
  'radio',
  'reset',
  'submit',
]);

const isTextEntryTarget = (target: Element): boolean => {
  if (target instanceof HTMLElement && target.isContentEditable) return true;
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;
  return target instanceof HTMLInputElement && !NON_TEXT_INPUT_TYPES.has(target.type);
};

/**
 * Keys pressed inside an overlay unrelated to the graph (e.g. a modal opened on top of it) must not
 * drive the graph. The graph's own popovers are dialogs that do not contain it, so they are allowed
 * explicitly through `ownPanelRefs`.
 */
const isWithinGraphScope = (
  target: Element,
  graphRoot: HTMLElement,
  ownPanelRefs: ReadonlyArray<RefObject<HTMLElement>>
): boolean => {
  if (ownPanelRefs.some(({ current }) => current?.contains(target))) return true;
  const dialog = target.closest('[role="dialog"]');
  return !dialog || dialog.contains(graphRoot);
};

export interface GraphKeyboardShortcutsProps {
  /** Whether shortcuts are handled, e.g. false while the graph is locked. */
  enabled: boolean;
  graphRootRef: RefObject<HTMLElement>;
  /** Graph-owned popover panels in which shortcuts keep working. */
  ownPanelRefs: ReadonlyArray<RefObject<HTMLElement>>;
  fitViewOptions?: FitViewOptions;
  nodeIdsToCenterOn?: NodeViewModel['id'][];
  onToggleSearch?: () => void;
  onToggleDisplayOptions: () => void;
}

/** Binds the graph keyboard shortcuts to the document. Must be rendered inside ReactFlow. */
export const GraphKeyboardShortcuts = ({
  enabled,
  graphRootRef,
  ownPanelRefs,
  fitViewOptions,
  nodeIdsToCenterOn,
  onToggleSearch,
  onToggleDisplayOptions,
}: GraphKeyboardShortcutsProps): null => {
  const { zoomIn, zoomOut, fitView, center, canCenter } = useGraphViewportActions({
    fitViewOptions,
    nodeIdsToCenterOn,
  });

  const handlers: Partial<Record<GraphKeyboardShortcutId, () => void>> = {
    openSearch: onToggleSearch,
    displayOptions: onToggleDisplayOptions,
    zoomIn,
    zoomOut,
    fitToScreen: fitView,
    centerGraph: canCenter ? center : undefined,
  };

  // Read through a ref so the document listener is not re-attached on every render
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const ownPanelRefsRef = useRef(ownPanelRefs);
  ownPanelRefsRef.current = ownPanelRefs;

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const { target, key, repeat, defaultPrevented, ctrlKey, metaKey, altKey } = event;
      const graphRoot = graphRootRef.current;

      // Leave modifier combos (e.g. Cmd/Ctrl + `+` browser zoom) to the browser
      if (defaultPrevented || ctrlKey || metaKey || altKey || !graphRoot) return;
      if (target instanceof Element) {
        if (isTextEntryTarget(target)) return;
        if (!isWithinGraphScope(target, graphRoot, ownPanelRefsRef.current)) return;
      }

      const shortcut = getGraphKeyboardShortcut(key);
      if (!shortcut || (repeat && !shortcut.repeatable)) return;

      const handler = handlersRef.current[shortcut.id];
      if (!handler) return;

      event.preventDefault();
      handler();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [enabled, graphRootRef]);

  return null;
};
