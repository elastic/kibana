/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { BaseEdge } from '@xyflow/react';
import type { EdgeProps, EdgeViewModel } from '../types';
import { getShapeHandlePosition } from './utils';
import { getMarkerEnd } from './markers';
import { useEdgeColor } from './styles';
import { GRAPH_EDGE_ID } from '../test_ids';
import { getGraphEdgePath } from './get_graph_edge_path';

type EdgeColor = EdgeViewModel['color'];

const dashedStyle = {
  strokeDasharray: '2 2',
};

const NODES_WITHOUT_MARKER = ['label', 'group', 'relationship'];

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

    const edgePath = getGraphEdgePath({
      sourceX: sX,
      sourceY: sY,
      sourcePosition,
      targetX: tX,
      targetY: tY,
      targetPosition,
    });

    return (
      <>
        <BaseEdge
          data-test-subj={GRAPH_EDGE_ID}
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
