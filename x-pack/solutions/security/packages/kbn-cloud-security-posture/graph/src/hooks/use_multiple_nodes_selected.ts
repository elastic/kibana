/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useNodes } from '@xyflow/react';

/** True when two or more graph nodes are selected (e.g. marquee selection). */
export const useMultipleNodesSelected = (): boolean => {
  const nodes = useNodes();

  return useMemo(() => {
    let selectedCount = 0;

    for (const node of nodes) {
      if (node.selected) {
        selectedCount += 1;

        if (selectedCount > 1) {
          return true;
        }
      }
    }

    return false;
  }, [nodes]);
};
