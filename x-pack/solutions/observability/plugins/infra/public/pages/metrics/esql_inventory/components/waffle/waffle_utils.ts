/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlWaffleResult, GroupedWaffleResult, WaffleGroup } from '../../types';
import type { WaffleNodeShape } from './waffle_node';

/**
 * Hexagon geometry constants for pointy-topped hexagons
 */
export const HEX_WIDTH_RATIO = 0.866; // sqrt(3)/2
export const HEX_VERTICAL_OVERLAP = 0.75; // Rows overlap by 25%

/**
 * Type guard to check if result is a grouped waffle result
 */
export const isGroupedResult = (
  result: EsqlWaffleResult | GroupedWaffleResult
): result is GroupedWaffleResult => {
  return 'groups' in result;
};

/**
 * Count total nodes in a group including all nested subgroups
 */
export const countAllNodes = (group: WaffleGroup): number => {
  let count = group.nodes.length;
  if (group.subgroups) {
    for (const subgroup of group.subgroups) {
      count += countAllNodes(subgroup);
    }
  }
  return count;
};

/**
 * Size constraints for different node counts
 */
const getSizeConstraints = (
  nodeCount: number,
  isHexagon: boolean
): { minSize: number; maxSize: number } => {
  if (nodeCount <= 10) {
    return { minSize: isHexagon ? 72 : 72, maxSize: isHexagon ? 130 : 120 };
  }
  if (nodeCount <= 50) {
    return { minSize: isHexagon ? 58 : 54, maxSize: isHexagon ? 115 : 108 };
  }
  if (nodeCount <= 200) {
    return { minSize: isHexagon ? 43 : 42, maxSize: isHexagon ? 94 : 90 };
  }
  return { minSize: isHexagon ? 29 : 29, maxSize: isHexagon ? 72 : 72 };
};

/**
 * Calculate optimal tile size based on container dimensions, node count, and shape.
 * For hexagons, prioritizes fitting more nodes per row while maintaining readability.
 */
export const calculateTileSize = (
  containerWidth: number,
  containerHeight: number,
  nodeCount: number,
  shape: WaffleNodeShape = 'hexagon'
): number => {
  if (nodeCount === 0 || containerWidth === 0 || containerHeight === 0) {
    return 96;
  }

  const isHexagon = shape === 'hexagon';
  const { minSize, maxSize } = getSizeConstraints(nodeCount, isHexagon);

  const hexWidthRatio = isHexagon ? HEX_WIDTH_RATIO : 1.0;
  const verticalOverlapRatio = isHexagon ? HEX_VERTICAL_OVERLAP : 1.0;
  const minColumns = isHexagon ? Math.min(4, nodeCount) : 3;

  // Calculate based on fitting minimum columns
  const maxTileSizeForMinColumns = containerWidth / minColumns / hexWidthRatio;

  // Calculate based on area
  const effectiveArea = containerWidth * containerHeight * (isHexagon ? 0.9 : 0.85);
  const areaBased = Math.sqrt(effectiveArea / nodeCount) * 0.85;

  // Calculate based on fitting all rows
  const estimatedRows = Math.ceil(nodeCount / minColumns);
  const heightBased = containerHeight / (1 + (estimatedRows - 1) * verticalOverlapRatio);

  // Use smallest to ensure everything fits, clamped to bounds
  const idealSize = Math.min(maxTileSizeForMinColumns, areaBased, heightBased);
  return Math.max(minSize, Math.min(maxSize, Math.floor(idealSize)));
};

/**
 * Calculate hexagon dimensions from node size
 */
export const getHexDimensions = (nodeSize: number, spacing: number) => {
  const hexWidth = nodeSize * HEX_WIDTH_RATIO;
  const hexHeight = nodeSize;
  const horizontalStep = hexWidth + spacing;
  const verticalStep = hexHeight * HEX_VERTICAL_OVERLAP + spacing;
  const oddRowOffset = horizontalStep / 2;

  return { hexWidth, hexHeight, horizontalStep, verticalStep, oddRowOffset };
};
