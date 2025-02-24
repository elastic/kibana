/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from '@emotion/styled';
import {
  type EuiIconProps,
  type EuiTextProps,
  type CommonProps,
  EuiButtonIcon,
  EuiIcon,
  EuiText,
  useEuiBackgroundColor,
  useEuiTheme,
  EuiBadge,
} from '@elastic/eui';
import { rgba } from 'polished';
import { isNumber } from 'lodash';
import { getSpanIcon } from './get_span_icon';
import type { NodeExpandButtonProps } from './node_expand_button';
import type { EntityNodeViewModel, LabelNodeViewModel } from '..';

export const LABEL_HEIGHT = 32;
export const LABEL_PADDING_X = 10;
export const LABEL_BORDER_WIDTH = 1;
export const NODE_WIDTH = 90;
export const NODE_HEIGHT = 90;
export const NODE_LABEL_WIDTH = 160;
type NodeColor = EntityNodeViewModel['color'] | LabelNodeViewModel['color'];

export const LabelNodeContainer = styled.div`
  position: relative;
  text-wrap: nowrap;
  min-width: 100px;
  height: ${LABEL_HEIGHT}px;
`;

interface LabelShapeProps extends EuiTextProps {
  color: LabelNodeViewModel['color'];
}

export const LabelBadge = styled(EuiBadge)`
  padding: 0px 3px;
  line-height: 15px;
  font-weight: normal;

  .euiBadge__content {
    min-block-size: 15px;
  }
`;

export const LabelShape = styled(EuiText)<LabelShapeProps>`
  background: ${(props) => useNodeFillColor(props.color)};
  border: ${(props) => {
    const { euiTheme } = useEuiTheme();
    return `solid ${
      euiTheme.colors[props.color as keyof typeof euiTheme.colors]
    } ${LABEL_BORDER_WIDTH}px`;
  }};

  align-content: center;
  line-height: inherit;
  font-size: inherit;
  padding: 0px ${LABEL_PADDING_X}px;
  border-radius: 8px;
  min-height: 100%;
  min-width: 100%;

  .euiBadge {
    margin-left: 4px;
  }
`;

export const LabelShapeOnHover = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);

  opacity: 0; /* Hidden by default */
  transition: opacity 0.2s ease; /* Smooth transition */
  border: ${(props) => {
    const { euiTheme } = useEuiTheme();
    return `dashed ${rgba(
      euiTheme.colors[props.color as keyof typeof euiTheme.colors] as string,
      0.5
    )} 1px`;
  }};
  border-radius: 10px;
  background: transparent;
  width: 106%;
  height: 134%;

  ${LabelNodeContainer}:hover & {
    opacity: 1; /* Show on hover */
  }

  .react-flow__node:focus:focus-visible & {
    opacity: 1; /* Show on hover */
  }
`;

export const NodeShapeContainer = styled.div`
  position: relative;
  width: ${NODE_WIDTH}px;
  height: ${NODE_HEIGHT}px;
`;

export const NodeShapeSvg = styled.svg`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1;
`;

export interface NodeButtonProps extends CommonProps {
  width?: number | string;
  height?: number;
  onClick?: (e: React.MouseEvent<HTMLElement>) => void;
}

export const NodeButton = ({ onClick, width, height, ...props }: NodeButtonProps) => (
  <StyledNodeContainer width={width} height={height} {...props}>
    <StyledNodeButton width={width} height={height} onClick={onClick} />
  </StyledNodeContainer>
);

const StyledNodeContainer = styled.div<NodeButtonProps>`
  position: absolute;
  width: ${(props) => {
    const width = props.width ?? NODE_WIDTH;
    return isNumber(width) ? `${width}px` : width;
  }};
  height: ${(props) => props.height ?? NODE_HEIGHT}px;
  z-index: 1;
`;

const StyledNodeButton = styled.div<NodeButtonProps>`
  width: ${(props) => {
    const width = props.width ?? NODE_WIDTH;
    return isNumber(width) ? `${width}px` : width;
  }};
  height: ${(props) => props.height ?? NODE_HEIGHT}px;
`;

export const StyledNodeExpandButton = styled.div<NodeExpandButtonProps>`
  opacity: 0; /* Hidden by default */
  transition: opacity 0.2s ease; /* Smooth transition */
  ${(props: NodeExpandButtonProps) =>
    (Boolean(props.x) || Boolean(props.y)) &&
    `transform: translate(${props.x ?? '0'}, ${props.y ?? '0'});`}
  ${(props: NodeExpandButtonProps) => (!props.x || props.x === '0' ? 'right: -18px;' : '')}
  position: absolute;
  z-index: 1;

  &.toggled {
    opacity: 1;
  }

  ${NodeShapeContainer}:hover &, ${LabelNodeContainer}:hover & {
    opacity: 1; /* Show on hover */
  }

  &:has(button:focus) {
    opacity: 1; /* Show when button is active */
  }

  .react-flow__node:focus:focus-visible & {
    opacity: 1; /* Show on node focus */
  }
`;

export const NodeShapeOnHoverSvg = styled(NodeShapeSvg)`
  opacity: 0; /* Hidden by default */
  transition: opacity 0.2s ease; /* Smooth transition */

  ${NodeShapeContainer}:hover &, ${LabelNodeContainer}:hover & {
    opacity: 1; /* Show on hover */
  }

  ${NodeShapeContainer}:has(${StyledNodeExpandButton}.toggled) &, ${LabelNodeContainer}:has(${StyledNodeExpandButton}.toggled) & {
    opacity: 1; /* Show on hover */
  }

  .react-flow__node:focus:focus-visible & {
    opacity: 1; /* Show on hover */
  }
`;

interface NodeIconProps {
  icon: string;
  color?: EuiIconProps['color'];
  x: string;
  y: string;
}

export const NodeIcon = ({ icon, color, x, y }: NodeIconProps) => {
  return (
    <foreignObject x={x} y={y} width="50" height="50">
      <div
        css={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}
      >
        <EuiIcon type={getSpanIcon(icon) ?? icon} size="l" color={color ?? 'primary'} />
      </div>
    </foreignObject>
  );
};

export const ExpandButtonSize = 18;

export const RoundEuiButtonIcon = styled(EuiButtonIcon)`
  border-radius: 50%;
  background-color: ${(_props) => useEuiBackgroundColor('plain')};
  width: ${ExpandButtonSize}px;
  height: ${ExpandButtonSize}px;

  > svg {
    transform: translate(0.75px, 0.75px);
  }

  :hover,
  :focus,
  :active {
    background-color: ${(_props) => useEuiBackgroundColor('plain')};
  }
`;

export const HandleStyleOverride: React.CSSProperties = {
  background: 'none',
  border: 'none',
};

export const useNodeFillColor = (color: NodeColor | undefined) => {
  const fillColor = (color === 'danger' ? 'primary' : color) ?? 'primary';
  return useEuiBackgroundColor(fillColor);
};

export const GroupStyleOverride = (size?: {
  width: number;
  height: number;
}): React.CSSProperties => ({
  backgroundColor: 'transparent',
  border: '0px solid',
  boxShadow: 'none',
  width: size?.width ?? 140,
  height: size?.height ?? 75,
});
