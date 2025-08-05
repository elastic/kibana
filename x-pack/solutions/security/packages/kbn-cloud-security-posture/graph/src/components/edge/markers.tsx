/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useEdgeColor } from './styles';

const getArrowPoints = (width: number, height: number): string => {
  return `${-width},${-height} 0,0 ${-width},${height} ${-width},${-height}`;
};

const ArrowMarker = ({
  id,
  color,
  width = 5,
  height = 4,
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
      markerWidth={width * 2.4} // Scale marker width
      markerHeight={height * 3} // Scale marker height
      viewBox={`${-width * 2} ${-height * 2.5} ${width * 4} ${height * 5}`} // Dynamic viewBox
      markerUnits="strokeWidth"
      orient="auto-start-reverse"
      refX="0"
      refY="0"
    >
      <polyline
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        strokeWidth="1"
        stroke={color}
        fill={color}
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
        <ArrowMarker id="arrowPrimary" color={useEdgeColor('primary')} width={6} height={4.8} />
        <ArrowMarker id="arrowSubdued" color={useEdgeColor('subdued')} width={6} height={4.8} />
        <ArrowMarker id="arrowWarning" color={useEdgeColor('warning')} width={6} height={4.8} />
        <ArrowMarker id="arrowDanger" color={useEdgeColor('danger')} width={6} height={4.8} />
      </defs>
    </svg>
  );
};
