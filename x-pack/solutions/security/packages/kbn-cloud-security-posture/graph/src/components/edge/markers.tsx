/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useEuiTheme } from '@elastic/eui';

const ArrowMarker = ({ id, color }: { id: string; color: string }) => {
  return (
    <marker
      id={id}
      markerWidth="12"
      markerHeight="12"
      viewBox="-10 -10 20 20"
      markerUnits="strokeWidth"
      orient="auto-start-reverse"
      refX="0"
      refY="0"
    >
      <polyline
        strokeLinecap="round"
        strokeLinejoin="round"
        points="-5,-4 0,0 -5,4 -5,-4"
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
        <ArrowMarker id="arrowPrimary" color={euiTheme.colors.primary} />
        <ArrowMarker id="arrowDanger" color={euiTheme.colors.danger} />
        <ArrowMarker id="arrowWarning" color={euiTheme.colors.warning} />
        <DotMarker id="dotPrimary" color={euiTheme.colors.primary} />
        <DotMarker id="dotDanger" color={euiTheme.colors.danger} />
        <DotMarker id="dotWarning" color={euiTheme.colors.warning} />
      </defs>
    </svg>
  );
};
