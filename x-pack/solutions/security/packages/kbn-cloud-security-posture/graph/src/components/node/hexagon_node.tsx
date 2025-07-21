/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { transparentize, useEuiShadow, useEuiTheme } from '@elastic/eui';
import { Handle, Position } from '@xyflow/react';
import {
  NodeContainer,
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
import {
  GRAPH_ENTITY_NODE_ID,
  GRAPH_ENTITY_NODE_HOVER_SHAPE_ID,
  GRAPH_STACKED_SHAPE_ID,
} from '../test_ids';
import { showStackedShape } from '../utils';

const NODE_SHAPE_WIDTH = 87;
const NODE_SHAPE_HEIGHT = 105;
const NODE_SHAPE_Y_POS_DELTA = 3;
const NODE_SHAPE_ON_HOVER_Y_POS_DELTA = 3;

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
  const shadow = useEuiShadow('m', { property: 'filter' });
  const fillColor = useNodeFillColor(color ?? 'primary');
  const strokeColor = euiTheme.colors[color ?? 'primary'];
  return (
    <NodeContainer data-test-subj={GRAPH_ENTITY_NODE_ID}>
      <NodeShapeContainer>
        {interactive && (
          <NodeShapeOnHoverSvg
            data-test-subj={GRAPH_ENTITY_NODE_HOVER_SHAPE_ID}
            width={NODE_SHAPE_WIDTH}
            height={NODE_SHAPE_HEIGHT}
            viewBox={`0 0 ${NODE_SHAPE_WIDTH} ${NODE_SHAPE_HEIGHT}`}
            yPosDelta={NODE_SHAPE_ON_HOVER_Y_POS_DELTA}
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
          yPosDelta={NODE_SHAPE_Y_POS_DELTA}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          shadow={shadow}
        >
          {showStackedShape(count) && (
            <HexagonShape
              data-test-subj={GRAPH_STACKED_SHAPE_ID}
              fill={fillColor}
              stroke={strokeColor}
              css={{
                transform: 'scale(0.8) translateY(16px)',
                transformOrigin: 'center',
                stroke: transparentize(strokeColor, 0.3),
              }}
            />
          )}
          {showStackedShape(count) && (
            <HexagonShape
              data-test-subj={GRAPH_STACKED_SHAPE_ID}
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
    </NodeContainer>
  );
});

HexagonNode.displayName = 'HexagonNode';
