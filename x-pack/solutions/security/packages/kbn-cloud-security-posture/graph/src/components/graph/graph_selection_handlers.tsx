/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect } from 'react';
import { useStoreApi } from '@xyflow/react';

/**
 * Ensures drag-selection overlays are cleared when a marquee ends, including cases
 * where pointer-up does not reach the React Flow pane (e.g. release over a node).
 */
export const GraphSelectionHandlers = () => {
  const store = useStoreApi();

  const clearSelectionOverlay = useCallback(() => {
    store.setState({
      userSelectionActive: false,
      userSelectionRect: null,
      nodesSelectionActive: false,
    });
  }, [store]);

  useEffect(() => {
    const handlePointerEnd = (event: PointerEvent) => {
      if (event.button !== 0) {
        return;
      }

      // Defer so React Flow can finish its own pointer-up handling first.
      setTimeout(() => {
        const { userSelectionActive, userSelectionRect, nodesSelectionActive } = store.getState();

        if (userSelectionActive || userSelectionRect || nodesSelectionActive) {
          clearSelectionOverlay();
        }
      }, 0);
    };

    document.addEventListener('pointerup', handlePointerEnd);
    document.addEventListener('pointercancel', handlePointerEnd);

    return () => {
      document.removeEventListener('pointerup', handlePointerEnd);
      document.removeEventListener('pointercancel', handlePointerEnd);
    };
  }, [store, clearSelectionOverlay]);

  return null;
};
