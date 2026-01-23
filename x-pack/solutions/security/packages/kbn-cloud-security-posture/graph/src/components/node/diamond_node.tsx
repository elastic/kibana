/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { useEuiShadow, useEuiTheme } from '@elastic/eui';
import { Handle, Position } from '@xyflow/react';
import type { EntityNodeViewModel, NodeProps } from '../types';
import {
  NodeContainer,
  NodeShapeContainer,
  NodeShapeOnHoverSvg,
  NodeShapeSvg,
  NodeIcon,
  NodeButton,
  HandleStyleOverride,
  useNodeFillColor,
  middleEntityNodeShapeStyle,
  bottomEntityNodeShapeStyle,
} from './styles';
import { DiamondHoverShape, DiamondShape } from './shapes/diamond_shape';
import { NodeExpandButton } from './node_expand_button';
import { NODE_HEIGHT, NODE_WIDTH } from '../constants';
import { NodeDetails } from './node_details';
import {
  GRAPH_ENTITY_NODE_ID,
  GRAPH_ENTITY_NODE_HOVER_SHAPE_ID,
  GRAPH_STACKED_SHAPE_ID,
} from '../test_ids';
import { showStackedShape } from '../utils';

const NODE_SHAPE_WIDTH = 99;
const NODE_SHAPE_HEIGHT = 107;
const NODE_SHAPE_Y_POS_DELTA = 4;
const NODE_SHAPE_ON_HOVER_Y_POS_DELTA = 4;
const NODE_SHAPE_ON_HOVER_STACKED_Y_POS_DELTA = 5;

export const DiamondNode = memo<NodeProps>((props: NodeProps) => {
  const {
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
    ipClickHandler,
    countryClickHandler,
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
            yPosDelta={
              showStackedShape(count)
                ? NODE_SHAPE_ON_HOVER_STACKED_Y_POS_DELTA
                : NODE_SHAPE_ON_HOVER_Y_POS_DELTA
            }
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <DiamondHoverShape stroke={strokeColor} />
          </NodeShapeOnHoverSvg>
        )}
        <NodeShapeSvg
          width="79"
          height="87"
          viewBox="0 0 79 87"
          yPosDelta={NODE_SHAPE_Y_POS_DELTA}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          shadow={shadow}
        >
          {showStackedShape(count) && (
            <DiamondShape
              data-test-subj={GRAPH_STACKED_SHAPE_ID}
              fill={fillColor}
              stroke={strokeColor}
              css={bottomEntityNodeShapeStyle(strokeColor)}
            />
          )}
          {showStackedShape(count) && (
            <DiamondShape
              data-test-subj={GRAPH_STACKED_SHAPE_ID}
              fill={fillColor}
              stroke={strokeColor}
              css={middleEntityNodeShapeStyle(strokeColor)}
            />
          )}
          <DiamondShape fill={fillColor} stroke={strokeColor} />
          {icon && <NodeIcon x="14.5" y="14.5" icon={icon} color={color} />}
        </NodeShapeSvg>
        {interactive && (
          <>
            <NodeButton onClick={(e) => nodeClick?.(e, props)} />
            <NodeExpandButton
              color={color}
              onClick={(e, unToggleCallback) => expandButtonClick?.(e, props, unToggleCallback)}
              x={`${NODE_WIDTH - NodeExpandButton.ExpandButtonSize}px`}
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
        label={label}
        ips={ips}
        countryCodes={countryCodes}
        onIpClick={ipClickHandler}
        onCountryClick={countryClickHandler}
      />
    </NodeContainer>
  );
});

DiamondNode.displayName = 'DiamondNode';
