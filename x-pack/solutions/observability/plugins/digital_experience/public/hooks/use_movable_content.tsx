/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const contentNode = (): HTMLDivElement => {
  const node = document.createElement('div');
  // Takes no part in the layout, so wherever the slot sits, the content lays out as its child.
  node.style.display = 'contents';
  return node;
};

function MovableSlot({ node }: { node: HTMLElement }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const host = ref.current;
    host?.appendChild(node);
    return () => {
      if (node.parentNode === host) {
        host?.removeChild(node);
      }
    };
  }, [node]);
  return <div ref={ref} style={{ display: 'contents' }} />;
}

/**
 * Content that stays mounted while the layout around it changes, so it keeps its state and
 * doesn't load again. Render `portal` at a fixed place of the tree, and `slot` wherever the
 * content should show: the content moves to wherever the slot is.
 */
export const useMovableContent = (content: ReactNode): { portal: ReactNode; slot: ReactNode } => {
  const [node] = useState(contentNode);
  return { portal: createPortal(content, node), slot: <MovableSlot node={node} /> };
};
