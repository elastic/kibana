/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSmoothStepPath, getStraightPath, Position } from '@xyflow/react';
import type { EdgeProps } from '../types';
import { GRID_SIZE } from '../constants';

/** Corner radius for stepped graph edges. */
export const GRAPH_EDGE_BORDER_RADIUS = 8;

/**
 * When endpoints are nearly aligned on an axis, small handle offsets create visible
 * mid-path jogs. Snap within one grid unit so those segments flatten out.
 */
export const GRAPH_EDGE_ALIGN_THRESHOLD = GRID_SIZE;

const isHorizontalHandle = (position: Position): boolean =>
  position === Position.Left || position === Position.Right;

const isVerticalHandle = (position: Position): boolean =>
  position === Position.Top || position === Position.Bottom;

export const alignEdgeEndpoints = (
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  sourcePosition: Position,
  targetPosition: Position,
  threshold = GRAPH_EDGE_ALIGN_THRESHOLD
): { sourceX: number; sourceY: number; targetX: number; targetY: number } => {
  if (isHorizontalHandle(sourcePosition) && isHorizontalHandle(targetPosition)) {
    const yDelta = Math.abs(sourceY - targetY);

    if (yDelta <= threshold) {
      const alignedY = Math.round((sourceY + targetY) / 2);

      return { sourceX, sourceY: alignedY, targetX, targetY: alignedY };
    }
  }

  if (isVerticalHandle(sourcePosition) && isVerticalHandle(targetPosition)) {
    const xDelta = Math.abs(sourceX - targetX);

    if (xDelta <= threshold) {
      const alignedX = Math.round((sourceX + targetX) / 2);

      return { sourceX: alignedX, sourceY, targetX: alignedX, targetY };
    }
  }

  return { sourceX, sourceY, targetX, targetY };
};

type EdgePathParams = Pick<
  EdgeProps,
  'sourceX' | 'sourceY' | 'targetX' | 'targetY' | 'sourcePosition' | 'targetPosition'
>;

export const getGraphEdgePath = ({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
}: EdgePathParams): string => {
  const aligned = alignEdgeEndpoints(
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition
  );

  const useStraightPath =
    (isHorizontalHandle(sourcePosition) &&
      isHorizontalHandle(targetPosition) &&
      aligned.sourceY === aligned.targetY) ||
    (isVerticalHandle(sourcePosition) &&
      isVerticalHandle(targetPosition) &&
      aligned.sourceX === aligned.targetX);

  if (useStraightPath) {
    const [path] = getStraightPath(aligned);

    return path;
  }

  const [path] = getSmoothStepPath({
    ...aligned,
    sourcePosition,
    targetPosition,
    borderRadius: GRAPH_EDGE_BORDER_RADIUS,
    offset: 0,
  });

  return path;
};
