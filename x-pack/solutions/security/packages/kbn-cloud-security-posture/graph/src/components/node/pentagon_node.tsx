/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { useEuiTheme } from '@elastic/eui';
import styled from '@emotion/styled';
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
import { PentagonHoverShape, PentagonShape } from './shapes/pentagon_shape';
import { NodeExpandButton } from './node_expand_button';
import { Label } from './label';
import { NODE_HEIGHT, NODE_WIDTH } from '../constants';

const PentagonShapeOnHover = styled(NodeShapeOnHoverSvg)`
  transform: translate(-50%, -51.5%);
`;

const NODE_SHAPE_WIDTH = 91;
const NODE_SHAPE_HEIGHT = 88;

export const PentagonNode = memo<NodeProps>((props: NodeProps) => {
  const { id, color, icon, label, interactive, expandButtonClick, nodeClick, entityType, entityCount, secondaryLabel, flagBadges } =
    props.data as EntityNodeViewModel;
  const { euiTheme } = useEuiTheme();
  return (
    <>
      <NodeShapeContainer>
        {interactive && (
          <PentagonShapeOnHover
            width={NODE_SHAPE_WIDTH}
            height={NODE_SHAPE_HEIGHT}
            viewBox={`0 0 ${NODE_SHAPE_WIDTH} ${NODE_SHAPE_HEIGHT}`}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <PentagonHoverShape stroke={euiTheme.colors[color ?? 'primary']} />
          </PentagonShapeOnHover>
        )}
        <NodeShapeSvg
          width="75"
          height="72"
          viewBox="0 0 75 72"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <PentagonShape
            fill={useNodeFillColor(color)}
            stroke={euiTheme.colors[color ?? 'primary']}
          />
          {icon && <NodeIcon x="12.5" y="14.5" icon={icon} color={color} />}
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
      <Label 
        text={label ? label : id} 
        entityType={entityType}
        entityCount={entityCount}
        secondaryLabel={secondaryLabel}
        flagBadges={flagBadges}
      />
    </>
  );
});

PentagonNode.displayName = 'PentagonNode';
