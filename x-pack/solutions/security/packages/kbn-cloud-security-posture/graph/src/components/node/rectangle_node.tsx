/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { useEuiBackgroundColor, useEuiTheme } from '@elastic/eui';
import { Handle, Position } from '@xyflow/react';
import {
  NodeShapeContainer,
  NodeLabel,
  NodeShapeOnHoverSvg,
  NodeShapeSvg,
  NodeIcon,
  NodeButton,
  HandleStyleOverride,
} from './styles';
import type { EntityNodeViewModel, NodeProps } from '../types';
import { RectangleHoverShape, RectangleShape } from './shapes/rectangle_shape';
import { NodeExpandButton } from './node_expand_button';

const NODE_WIDTH = 81;
const NODE_HEIGHT = 80;

// eslint-disable-next-line react/display-name
export const RectangleNode: React.FC<NodeProps> = memo((props: NodeProps) => {
  const { id, color, icon, label, interactive, expandButtonClick, nodeClick } =
    props.data as EntityNodeViewModel;
  const { euiTheme } = useEuiTheme();
  return (
    <>
      <NodeShapeContainer>
        {interactive && (
          <NodeShapeOnHoverSvg
            width={NODE_WIDTH}
            height={NODE_HEIGHT}
            viewBox={`0 0 ${NODE_WIDTH} ${NODE_HEIGHT}`}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <RectangleHoverShape stroke={euiTheme.colors[color ?? 'primary']} />
          </NodeShapeOnHoverSvg>
        )}
        <NodeShapeSvg
          width="65"
          height="64"
          viewBox="0 0 65 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <RectangleShape
            fill={useEuiBackgroundColor(color ?? 'primary')}
            stroke={euiTheme.colors[color ?? 'primary']}
          />
          {icon && <NodeIcon x="8" y="7" icon={icon} color={color} />}
        </NodeShapeSvg>
        {interactive && (
          <>
            <NodeButton onClick={(e) => nodeClick?.(e, props)} />
            <NodeExpandButton
              onClick={(e, unToggleCallback) => expandButtonClick?.(e, props, unToggleCallback)}
              x={`${NODE_WIDTH - NodeExpandButton.ExpandButtonSize / 4}px`}
              y={`${(NODE_HEIGHT - NodeExpandButton.ExpandButtonSize / 2) / 2}px`}
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
      <NodeLabel>{label ? label : id}</NodeLabel>
    </>
  );
});
