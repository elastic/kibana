/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useEdgeColor } from './styles';

/** Filled equilateral tip — sits cleanly on the target node edge. */
const getArrowPoints = (width: number, height: number): string => {
  return `${-width},${-height} 0,0 ${-width},${height}`;
};

const ArrowMarker = ({
  id,
  color,
  width = 9,
  height = 6,
}: {
  id: string;
  color: string;
  width?: number;
  height?: number;
}) => {
  const points = getArrowPoints(width, height);

  return (
    <marker
      id={id}
      markerWidth={width * 2}
      markerHeight={height * 2.5}
      viewBox={`${-width - 1} ${-height - 1} ${width + 2} ${height * 2 + 2}`}
      markerUnits="userSpaceOnUse"
      orient="auto-start-reverse"
      /* Tip lands on the path end (node border). */
      refX={0}
      refY={0}
    >
      <polygon
        points={points}
        fill={color}
        stroke={color}
        strokeWidth={0.5}
        strokeLinejoin="round"
      />
    </marker>
  );
};

const MarkerEndType = {
  primary: 'url(#arrowPrimary)',
  subdued: 'url(#arrowSubdued)',
  warning: 'url(#arrowWarning)',
  danger: 'url(#arrowDanger)',
};

export const getMarkerEnd = (color: string) => {
  const colorKey = color as keyof typeof MarkerEndType;
  return MarkerEndType[colorKey] ?? MarkerEndType.primary;
};

export const SvgDefsMarker = () => {
  return (
    <svg css={{ position: 'absolute', width: 0, height: 0 }}>
      <defs>
        <ArrowMarker id="arrowPrimary" color={useEdgeColor('primary')} />
        <ArrowMarker id="arrowSubdued" color={useEdgeColor('subdued')} />
        <ArrowMarker id="arrowWarning" color={useEdgeColor('warning')} />
        <ArrowMarker id="arrowDanger" color={useEdgeColor('danger')} />
      </defs>
    </svg>
  );
};
