/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSmoothStepPath, getStraightPath, Position } from '@xyflow/react';
import type { EdgeProps } from '../types';
import { GRID_SIZE } from '../constants';

/**
 * Corner radius for stepped graph edges.
 * Clamped at runtime to the available horizontal span so short corridors keep
 * a horizontal stub out of each handle.
 */
export const GRAPH_EDGE_BORDER_RADIUS = 20;

/** Offset for stepped paths so parallel edges do not share the same corridor. */
export const GRAPH_EDGE_STEP_OFFSET = GRID_SIZE * 2;

/**
 * When endpoints are nearly aligned on an axis, small handle offsets create visible
 * mid-path jogs. Snap the *source* onto the target axis (never move the target) so
 * bundled edges still share one endpoint / arrow.
 *
 * Not used for bundled fans — snapping the source off a relationship/label handle
 * breaks the through-line that bridges the pill.
 */
export const GRAPH_EDGE_ALIGN_THRESHOLD = GRID_SIZE * 2;

/** Final shared stem length before the entity (joinX → target). dx-only, not dy. */
const BUNDLE_STEM_LEN = GRID_SIZE * 4;

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
      // Keep the target handle Y — averaging created parallel arrow stems.
      return { sourceX, sourceY: targetY, targetX, targetY };
    }
  }

  if (isVerticalHandle(sourcePosition) && isVerticalHandle(targetPosition)) {
    const xDelta = Math.abs(sourceX - targetX);

    if (xDelta <= threshold) {
      return { sourceX: targetX, sourceY, targetX, targetY };
    }
  }

  return { sourceX, sourceY, targetX, targetY };
};

type EdgePathParams = Pick<
  EdgeProps,
  'sourceX' | 'sourceY' | 'targetX' | 'targetY' | 'sourcePosition' | 'targetPosition'
> & {
  stepOffset?: number;
  /**
   * When true (bundled sibling), stop where the fan joins the shared trunk —
   * only the leader draws the final stem + arrow into the entity.
   */
  truncateAtTrunk?: boolean;
};

/**
 * Shared join X for every edge into the same target — depends on target + dx only,
 * never on sourceY/dy (dy-based radii made sibling joins land on different X).
 */
export const getBundleJoinX = (sourceX: number, targetX: number): number => {
  const dx = Math.abs(targetX - sourceX);
  const signX = targetX >= sourceX ? 1 : -1;
  const stemLen = Math.max(
    GRID_SIZE * 3,
    Math.min(BUNDLE_STEM_LEN, Math.floor(dx / 3) || GRID_SIZE * 3)
  );
  return Math.round(targetX - signX * stemLen);
};

/**
 * Horizontal bundled fan: siblings stop at a shared joinX; only the leader draws
 * joinX → target (+ arrow). Source Y is preserved so relationship through-lines stay continuous.
 */
export const getBundledHorizontalEdgePath = ({
  sourceX,
  sourceY,
  targetX,
  targetY,
  borderRadius,
  truncateAtTrunk = false,
}: {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  borderRadius: number;
  truncateAtTrunk?: boolean;
}): string => {
  const signX = targetX >= sourceX ? 1 : -1;
  const joinX = getBundleJoinX(sourceX, targetX);

  if (sourceY === targetY) {
    if (truncateAtTrunk) {
      return `M ${sourceX},${sourceY}L ${joinX},${targetY}`;
    }
    return `M ${sourceX},${sourceY}L ${targetX},${targetY}`;
  }

  const dx = Math.abs(targetX - sourceX);
  const dy = Math.abs(targetY - sourceY);
  const signY = targetY >= sourceY ? 1 : -1;
  // Corner radius may shrink with dy, but joinX stays fixed (shared across siblings).
  const r = Math.max(
    4,
    Math.min(
      borderRadius,
      Math.floor(dx / 2) - GRID_SIZE,
      Math.floor(dy / 2) - 1,
      Math.abs(joinX - Math.round((sourceX + targetX) / 2)) || borderRadius
    )
  );
  const midX = joinX - signX * r;
  const h1 = midX - signX * r;
  const vEnd = targetY - signY * r;

  const toJoin = [
    `M ${sourceX},${sourceY}`,
    `L ${h1},${sourceY}`,
    `Q ${midX},${sourceY} ${midX},${sourceY + signY * r}`,
    `L ${midX},${vEnd}`,
    `Q ${midX},${targetY} ${joinX},${targetY}`,
  ].join('');

  if (truncateAtTrunk) {
    return toJoin;
  }

  return `${toJoin}L ${targetX},${targetY}`;
};

export const getGraphEdgePath = ({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  stepOffset = GRAPH_EDGE_STEP_OFFSET,
  truncateAtTrunk = false,
}: EdgePathParams): string => {
  const isBundled = stepOffset === 0;

  // Bundled fans keep exact handle Y so the relationship/label through-line
  // stays collinear with the edge leaving the pill (no snap-induced jog).
  const endpoints = isBundled
    ? { sourceX, sourceY, targetX, targetY }
    : alignEdgeEndpoints(sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition);

  const dx = Math.abs(endpoints.targetX - endpoints.sourceX);
  const dy = Math.abs(endpoints.targetY - endpoints.sourceY);
  // Bundled fans must share one radius (dy-based clamps made each stem differ).
  const borderRadius = isBundled
    ? Math.max(4, Math.min(GRAPH_EDGE_BORDER_RADIUS, Math.floor(dx / 2) - GRID_SIZE))
    : Math.max(
        4,
        Math.min(
          GRAPH_EDGE_BORDER_RADIUS,
          Math.floor(dx / 2) - GRID_SIZE,
          Math.floor(dy / 2) - GRID_SIZE
        )
      );

  // Bundled left/right fans: custom trunk so siblings can stop at the join.
  if (isBundled && isHorizontalHandle(sourcePosition) && isHorizontalHandle(targetPosition)) {
    return getBundledHorizontalEdgePath({
      ...endpoints,
      borderRadius,
      truncateAtTrunk,
    });
  }

  const useStraightPath =
    (isHorizontalHandle(sourcePosition) &&
      isHorizontalHandle(targetPosition) &&
      endpoints.sourceY === endpoints.targetY) ||
    (isVerticalHandle(sourcePosition) &&
      isVerticalHandle(targetPosition) &&
      endpoints.sourceX === endpoints.targetX);

  if (useStraightPath) {
    const [path] = getStraightPath(endpoints);

    return path;
  }

  // Shared elbow X so every edge into the same target turns on one vertical trunk.
  const centerX = Math.round((endpoints.sourceX + endpoints.targetX) / 2);

  const [path] = getSmoothStepPath({
    ...endpoints,
    sourcePosition,
    targetPosition,
    borderRadius,
    offset: stepOffset,
    centerX,
  });

  return path;
};
