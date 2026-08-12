/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useStore, useStoreApi, useUpdateNodeInternals } from '@xyflow/react';
import { useViewportZoom } from '../../hooks/use_viewport_zoom';

/**
 * Re-measures node handle positions whenever the viewport zoom changes so edges
 * stay connected after zoom-invariant counter-scaling is applied.
 */
export const ZoomNodeInternalsSync = () => {
  const zoom = useViewportZoom();
  const nodeCount = useStore((state) => state.nodes.length);
  const store = useStoreApi();
  const updateNodeInternals = useUpdateNodeInternals();

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const nodeIds = store.getState().nodes.map((node) => node.id);
      nodeIds.forEach((id) => {
        updateNodeInternals(id);
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [zoom, nodeCount, store, updateNodeInternals]);

  return null;
};
