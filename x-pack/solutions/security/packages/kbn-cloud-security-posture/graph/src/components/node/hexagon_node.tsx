/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { transparentize, useEuiTheme } from '@elastic/eui';
import { Handle, Position } from '@xyflow/react';
import {
  NodeShapeContainer,
  NodeShapeOnHoverSvg,
  NodeShapeSvg,
  NodeIcon,
  NodeButton,
  HandleStyleOverride,
  useNodeFillColor,
} from './styles';
import type { EntityNodeViewModel, NodeProps } from '../types';
import { HexagonHoverShape, HexagonShape } from './shapes/hexagon_shape';
import { NodeExpandButton } from './node_expand_button';
import { NODE_HEIGHT, NODE_WIDTH } from '../constants';
import { NodeDetails } from './node_details';

const NODE_SHAPE_WIDTH = 87;
const NODE_SHAPE_HEIGHT = 105;

export const HexagonNode = memo<NodeProps>((props: NodeProps) => {
  const {
    id,
    color,
    icon,
    label,
    tag,
    count,
    ips,
    countryCodes,
    interactive,
    expandButtonClick,
    nodeClick,
  } = props.data as EntityNodeViewModel;
  const { euiTheme } = useEuiTheme();
  const fillColor = useNodeFillColor(color ?? 'primary');
  const strokeColor = euiTheme.colors[color ?? 'primary'];
  return (
    <>
      <NodeShapeContainer>
        {interactive && (
          <NodeShapeOnHoverSvg
            width={NODE_SHAPE_WIDTH}
            height={NODE_SHAPE_HEIGHT}
            viewBox={`0 0 ${NODE_SHAPE_WIDTH} ${NODE_SHAPE_HEIGHT}`}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <HexagonHoverShape stroke={strokeColor} />
          </NodeShapeOnHoverSvg>
        )}
        <NodeShapeSvg
          width="71"
          height="87"
          viewBox="0 0 71 87"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {!!count && count > 0 && (
            <HexagonShape
              fill={fillColor}
              stroke={strokeColor}
              css={{
                transform: 'scale(0.8) translateY(16px)',
                transformOrigin: 'center',
                stroke: transparentize(strokeColor, 0.3),
              }}
            />
          )}
          {!!count && count > 0 && (
            <HexagonShape
              fill={fillColor}
              stroke={strokeColor}
              css={{
                transform: 'scale(0.9) translateY(7px)',
                transformOrigin: 'center',
                stroke: transparentize(strokeColor, 0.5),
              }}
            />
          )}
          <HexagonShape fill={fillColor} stroke={strokeColor} />
          {icon && <NodeIcon x="11" y="15" icon={icon} color={color} />}
        </NodeShapeSvg>
        {interactive && (
          <>
            <NodeButton onClick={(e) => nodeClick?.(e, props)} />
            <NodeExpandButton
              color={color}
              onClick={(e, unToggleCallback) => expandButtonClick?.(e, props, unToggleCallback)}
              x={`${
                NODE_WIDTH -
                NodeExpandButton.ExpandButtonSize / 2 -
                (NODE_WIDTH - NODE_SHAPE_WIDTH) / 2
              }px`}
              y={`${(NODE_HEIGHT - NodeExpandButton.ExpandButtonSize) / 2}px`}
            />
          </>
        )}
        <Handle
          type="target"
          isConnectable={false}
          position={Position.Left}
          id="in"
          style={HandleStyleOverride}
        />
        <Handle
          type="source"
          isConnectable={false}
          position={Position.Right}
          id="out"
          style={HandleStyleOverride}
        />
      </NodeShapeContainer>
      <NodeDetails
        count={count}
        tag={tag}
        label={label ? label : id}
        ips={ips}
        countryCodes={countryCodes}
      />
    </>
  );
});

HexagonNode.displayName = 'HexagonNode';
