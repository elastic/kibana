/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { BaseEdge, getSmoothStepPath } from '@xyflow/react';
import { useEuiTheme } from '@elastic/eui';
import type { EdgeProps, EdgeViewModel } from '../types';
import { getShapeHandlePosition } from './utils';
import { getMarkerStart, getMarkerEnd } from './markers';

type EdgeColor = EdgeViewModel['color'];

export function DefaultEdge({
  id,
  label,
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
  data,
}: EdgeProps) {
  const { euiTheme } = useEuiTheme();
  const color: EdgeColor = data?.color ?? 'primary';

  const [edgePath] = getSmoothStepPath({
    // sourceX and targetX are adjusted to account for the shape handle position
    sourceX: sourceX - getShapeHandlePosition(data?.sourceShape),
    sourceY,
    sourcePosition,
    targetX: targetX + getShapeHandlePosition(data?.targetShape),
    targetY,
    targetPosition,
    borderRadius: 15,
    offset: 0,
  });

  return (
    <>
      <BaseEdge
        path={edgePath}
        style={{
          stroke: euiTheme.colors[color],
        }}
        css={
          (!data?.type || data?.type === 'dashed') && {
            strokeDasharray: '2,2',
          }
        }
        markerStart={
          data?.sourceShape !== 'label' && data?.sourceShape !== 'group'
            ? getMarkerStart(color)
            : undefined
        }
        markerEnd={
          data?.targetShape !== 'label' && data?.targetShape !== 'group'
            ? getMarkerEnd(color)
            : undefined
        }
      />
    </>
  );
}
