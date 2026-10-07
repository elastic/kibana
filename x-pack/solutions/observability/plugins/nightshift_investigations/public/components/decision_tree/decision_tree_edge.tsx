/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { BaseEdge, getSmoothStepPath, type Edge, type EdgeProps } from '@xyflow/react';
import { DECISION_TREE_ROW_GAP } from './layout_decision_graph';

export type DecisionTreeFlowEdge = Edge<Record<string, unknown>, 'decisionTree'>;

const CORNER_RADIUS = 18;

/**
 * Orthogonal connector with rounded elbows. The horizontal run sits in the row gap just below the
 * source rather than halfway down a multi-row span, so it never cuts through a card.
 */
const DecisionTreeEdgeComponent = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
}: EdgeProps<DecisionTreeFlowEdge>): React.ReactElement => {
  const [path] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: CORNER_RADIUS,
    centerY: sourceY + Math.min(Math.abs(targetY - sourceY) / 2, DECISION_TREE_ROW_GAP / 2),
  });

  return <BaseEdge id={id} path={path} style={style} markerEnd={markerEnd} />;
};

export const DecisionTreeEdge = memo(DecisionTreeEdgeComponent);
