/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useEuiTheme } from '@elastic/eui';

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

const DotMarker = ({ id, color }: { id: string; color: string }) => {
  return (
    <marker id={id} markerWidth="6" markerHeight="6" refX="0.1" refY="3" orient="auto">
      <circle cx="3" cy="3" r="3" fill={color} />
    </marker>
  );
};

const MarkerStartType = {
  primary: 'url(#dotPrimary)',
  danger: 'url(#dotDanger)',
  warning: 'url(#dotWarning)',
};

const MarkerEndType = {
  primary: 'url(#arrowPrimary)',
  danger: 'url(#arrowDanger)',
  warning: 'url(#arrowWarning)',
};

export const getMarkerStart = (color: string) => {
  const colorKey = color as keyof typeof MarkerStartType;
  return MarkerStartType[colorKey] ?? MarkerStartType.primary;
};

export const getMarkerEnd = (color: string) => {
  const colorKey = color as keyof typeof MarkerEndType;
  return MarkerEndType[colorKey] ?? MarkerEndType.primary;
};

export const SvgDefsMarker = () => {
  const { euiTheme } = useEuiTheme();

  return (
    <svg css={{ position: 'absolute', width: 0, height: 0 }}>
      <defs>
        <ArrowMarker id="arrowPrimary" color={euiTheme.colors.primary} width={6} height={4.8} />
        <ArrowMarker id="arrowDanger" color={euiTheme.colors.danger} width={6} height={4.8} />
        <ArrowMarker id="arrowWarning" color={euiTheme.colors.warning} width={6} height={4.8} />
        <DotMarker id="dotPrimary" color={euiTheme.colors.primary} />
        <DotMarker id="dotDanger" color={euiTheme.colors.danger} />
        <DotMarker id="dotWarning" color={euiTheme.colors.warning} />
      </defs>
    </svg>
  );
};
