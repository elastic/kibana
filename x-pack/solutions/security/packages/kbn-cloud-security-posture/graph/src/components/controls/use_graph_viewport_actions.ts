/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useReactFlow, type FitViewOptions } from '@xyflow/react';
import type { NodeViewModel } from '../types';

export interface UseGraphViewportActionsParams {
  fitViewOptions?: FitViewOptions;
  /** Array of node IDs the graph must center on */
  nodeIdsToCenterOn?: NodeViewModel['id'][];
}

export interface GraphViewportActions {
  zoomIn: () => void;
  zoomOut: () => void;
  fitView: () => void;
  /** Fits the view to `nodeIdsToCenterOn`; no-op when `canCenter` is false. */
  center: () => void;
  canCenter: boolean;
}

/** Viewport actions shared by the graph controls and keyboard shortcuts. Must be used inside ReactFlow. */
export const useGraphViewportActions = ({
  fitViewOptions,
  nodeIdsToCenterOn,
}: UseGraphViewportActionsParams): GraphViewportActions => {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  // Memoize a sanitized list of node ids filtering out undefined/null, empty and whitespace strings
  // Converts ['node1', 'node2'] into [{ id: 'node1' }, { id: 'node2' }]
  const sanitizedNodeIds = useMemo(
    () =>
      (nodeIdsToCenterOn ?? []).filter((id) => id && id.trim().length > 0).map((id) => ({ id })),
    [nodeIdsToCenterOn]
  );
  const canCenter = sanitizedNodeIds.length > 0;

  const zoomInHandler = useCallback(() => {
    zoomIn({ duration: fitViewOptions?.duration });
  }, [fitViewOptions?.duration, zoomIn]);

  const zoomOutHandler = useCallback(() => {
    zoomOut({ duration: fitViewOptions?.duration });
  }, [fitViewOptions?.duration, zoomOut]);

  const fitViewHandler = useCallback(() => {
    fitView(fitViewOptions);
  }, [fitViewOptions, fitView]);

  const centerHandler = useCallback(() => {
    if (!canCenter) return;
    fitView({ ...fitViewOptions, nodes: sanitizedNodeIds });
  }, [canCenter, fitViewOptions, fitView, sanitizedNodeIds]);

  return {
    zoomIn: zoomInHandler,
    zoomOut: zoomOutHandler,
    fitView: fitViewHandler,
    center: centerHandler,
    canCenter,
  };
};
