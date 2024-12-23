/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { BaseEdge, getSmoothStepPath } from '@xyflow/react';
import { useEuiTheme } from '@elastic/eui';
import type { EdgeProps, EdgeViewModel } from '../types';
import { getShapeHandlePosition } from './utils';
import { getMarkerStart, getMarkerEnd } from './markers';

type EdgeColor = EdgeViewModel['color'];

const dashedStyle = {
  strokeDasharray: '2 2',
};

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
    const { euiTheme } = useEuiTheme();
    const color: EdgeColor = data?.color ?? 'primary';
    const sourceMargin = getShapeHandlePosition(data?.sourceShape);
    const targetMargin = getShapeHandlePosition(data?.targetShape);
    const markerStart =
      data?.sourceShape !== 'label' && data?.sourceShape !== 'group'
        ? getMarkerStart(color)
        : undefined;
    const markerEnd =
      data?.targetShape !== 'label' && data?.targetShape !== 'group'
        ? getMarkerEnd(color)
        : undefined;

    const sX = Math.round(sourceX - sourceMargin);
    const sY = Math.round(sourceY);
    const tX = Math.round(targetX + targetMargin);
    const tY = Math.round(targetY);

    const [edgePath] = getSmoothStepPath({
      // sourceX and targetX are adjusted to account for the shape handle position
      sourceX: sX,
      sourceY: sY,
      sourcePosition,
      targetX: tX,
      targetY: tY,
      targetPosition,
      borderRadius: 15,
      offset: 0,
    });

    return (
      <>
        <BaseEdge
          id={id}
          path={edgePath}
          interactionWidth={0}
          style={{
            stroke: euiTheme.colors[color],
            ...(!data?.type || data?.type === 'dashed' ? dashedStyle : {}),
          }}
          markerStart={markerStart}
          markerEnd={markerEnd}
        />
      </>
    );
  }
);

DefaultEdge.displayName = 'DefaultEdge';
