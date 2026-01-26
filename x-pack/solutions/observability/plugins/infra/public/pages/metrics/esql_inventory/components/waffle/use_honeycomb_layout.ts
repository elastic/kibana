/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { EsqlWaffleNode } from '../../types';
import { getHexDimensions } from './waffle_utils';

interface NodePosition {
  node: EsqlWaffleNode;
  x: number;
  y: number;
}

interface HoneycombLayout {
  positions: NodePosition[];
  gridWidth: number;
  gridHeight: number;
}

/**
 * Custom hook to calculate honeycomb grid layout positions.
 * Handles the math for positioning pointy-topped hexagons in a honeycomb pattern.
 */
export const useHoneycombLayout = (
  nodes: EsqlWaffleNode[],
  nodeSize: number,
  spacing: number,
  containerWidth: number
): HoneycombLayout => {
  return useMemo(() => {
    const { hexHeight, horizontalStep, verticalStep, oddRowOffset } = getHexDimensions(
      nodeSize,
      spacing
    );

    const effectiveWidth = Math.max(containerWidth, horizontalStep);
    const nodesPerRow = Math.max(1, Math.floor(effectiveWidth / horizontalStep));

    const positions = nodes.map((node, index) => {
      const row = Math.floor(index / nodesPerRow);
      const col = index % nodesPerRow;
      const isOddRow = row % 2 === 1;

      return {
        node,
        x: col * horizontalStep + (isOddRow ? oddRowOffset : 0),
        y: row * verticalStep,
      };
    });

    const numRows = Math.ceil(nodes.length / nodesPerRow);

    // Calculate actual columns used (not max possible)
    const actualColsUsed = numRows === 1 ? nodes.length : Math.min(nodes.length, nodesPerRow);
    const hasOddRow = numRows > 1;

    // Grid width based on actual columns, plus offset if there are odd rows
    const gridWidth = actualColsUsed * horizontalStep + (hasOddRow ? oddRowOffset : 0);
    const gridHeight = numRows > 0 ? (numRows - 1) * verticalStep + hexHeight : 0;

    return { positions, gridWidth, gridHeight };
  }, [nodes, nodeSize, spacing, containerWidth]);
};
