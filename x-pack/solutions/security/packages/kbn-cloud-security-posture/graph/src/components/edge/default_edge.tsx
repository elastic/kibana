/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { BaseEdge, getSmoothStepPath } from '@xyflow/react';
import type { EdgeProps, EdgeViewModel } from '../types';
import { getShapeHandlePosition } from './utils';
import { getMarkerEnd } from './markers';
import { useEdgeColor } from './styles';
import { STACK_NODE_HORIZONTAL_PADDING } from '../constants';

type EdgeColor = EdgeViewModel['color'];

const dashedStyle = {
  strokeDasharray: '2 2',
};

const NODES_WITHOUT_MARKER = ['label', 'group'];

export const DefaultEdge = memo(
  ({
    id,
    label,
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    data,
  }: EdgeProps) => {
    const color: EdgeColor = data?.color || 'primary';
    const entityToLabel = data?.sourceShape !== 'group' && data?.targetShape === 'label';
    const labelToEntity = data?.sourceShape === 'label' && data?.targetShape !== 'group';
    const isExtraAlignment = entityToLabel || labelToEntity;
    const sourceMargin = getShapeHandlePosition(data?.sourceShape);
    const targetMargin = getShapeHandlePosition(data?.targetShape);
    const markerEnd =
      !data?.targetShape || !NODES_WITHOUT_MARKER.includes(data?.targetShape)
        ? getMarkerEnd(color)
        : undefined;

    const sX = Math.round(sourceX - sourceMargin);
    const sY = Math.round(sourceY);
    const tX = Math.round(targetX + targetMargin);
    const tY = Math.round(targetY);

    const xOffset = Math.abs(targetX - sourceX) / 2;
    const centerX =
      targetX < sourceX
        ? targetX + xOffset
        : targetX -
          xOffset +
          (isExtraAlignment ? STACK_NODE_HORIZONTAL_PADDING / 2 : 0) * (labelToEntity ? 1 : -1);

    const [edgePath] = getSmoothStepPath({
      // sourceX and targetX are adjusted to account for the shape handle position
      sourceX: sX,
      sourceY: sY,
      sourcePosition,
      targetX: tX,
      targetY: tY,
      targetPosition,
      borderRadius: 15,
      centerX,
      offset: 0,
    });

    return (
      <>
        <BaseEdge
          id={id}
          path={edgePath}
          interactionWidth={0}
          style={{
            stroke: useEdgeColor(color),
            // Defaults to solid when type is not available
            ...(data?.type === 'dashed' ? dashedStyle : {}),
          }}
          markerEnd={markerEnd}
        />
      </>
    );
  }
);

DefaultEdge.displayName = 'DefaultEdge';
