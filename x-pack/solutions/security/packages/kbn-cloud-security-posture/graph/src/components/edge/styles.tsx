/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from '@emotion/styled';
import { rgba } from 'polished';
import {
  useEuiTheme,
  useEuiBackgroundColor,
  EuiText,
  type EuiTextProps,
  type _EuiBackgroundColor,
} from '@elastic/eui';

export const EdgeLabelHeight = 24;
export const EdgeLabelWidth = 100;

export interface EdgeLabelContainerProps {
  width?: number;
  height?: number;
  scale?: number;
}

export const EdgeLabelContainer = styled.div<EdgeLabelContainerProps>`
  position: absolute;
  ${(props) =>
    props.scale && 0 < props.scale && props.scale < 1
      ? `transform: scale(${props.scale}) translateX(${(1 - props.scale) * 50}%)`
      : ''};
  width: ${(props) => props.width ?? EdgeLabelWidth}px;
  height: ${(props) => props.height ?? EdgeLabelHeight}px;
  // Everything inside EdgeLabelRenderer has no pointer events by default
  // To have an interactive element, set pointer-events: all
  pointer-events: all;
  text-wrap: nowrap;
`;

export interface EdgeLabelProps extends EuiTextProps {
  labelX?: number;
  labelY?: number;
}

export const EdgeLabel = styled(EuiText)<EdgeLabelProps>`
  position: absolute;
  transform: ${(props) =>
    `translate(-50%, -50%)${
      props.labelX && props.labelY ? ` translate(${props.labelX}px,${props.labelY}px)` : ''
    }`};
  background: ${(props) => useEuiBackgroundColor(props.color as _EuiBackgroundColor)};
  border: ${(props) => {
    const { euiTheme } = useEuiTheme();
    return `solid ${euiTheme.colors[props.color as keyof typeof euiTheme.colors]} 1px`;
  }};
  font-weight: ${(_props) => {
    const { euiTheme } = useEuiTheme();
    return `${euiTheme.font.weight.semiBold}`;
  }};
  font-size: ${(_props) => {
    const { euiTheme } = useEuiTheme();
    return `${euiTheme.font.scale.xs * 10.5}px`;
  }};
  padding: 0px 2px;
  border-radius: 16px;
  min-height: 100%;
  min-width: 100%;
`;

export const EdgeLabelOnHover = styled(EdgeLabel)<EdgeLabelProps & EdgeLabelContainerProps>`
  opacity: 0; /* Hidden by default */
  transition: opacity 0.2s ease; /* Smooth transition */
  border: ${(props) => {
    const { euiTheme } = useEuiTheme();
    return `dashed ${rgba(
      euiTheme.colors[props.color as keyof typeof euiTheme.colors] as string,
      0.5
    )} 1px`;
  }};
  border-radius: 20px;
  width: ${(props) => (props.width ?? EdgeLabelWidth) + 10}px;
  height: ${(props) => (props.height ?? EdgeLabelHeight) + 10}px;
  background: transparent;

  ${EdgeLabelContainer}:hover & {
    opacity: 1; /* Show on hover */
  }
`;

const Marker = ({ id, color }: { id: string; color: string }) => {
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

export const MarkerType = {
  primary: 'url(#primary)',
  danger: 'url(#danger)',
  warning: 'url(#warning)',
};

export const getMarker = (color: string) => {
  const colorKey = color as keyof typeof MarkerType;
  return MarkerType[colorKey] ?? MarkerType.primary;
};

export const SvgDefsMarker = () => {
  const { euiTheme } = useEuiTheme();

  return (
    <svg css={{ position: 'absolute', width: 0, height: 0 }}>
      <defs>
        <Marker id="primary" color={euiTheme.colors.primary} />
        <Marker id="danger" color={euiTheme.colors.danger} />
        <Marker id="warning" color={euiTheme.colors.warning} />
      </defs>
    </svg>
  );
};
