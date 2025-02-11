/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { css } from '@emotion/react';
import {
  LabelNodeContainer,
  LabelShape,
  HandleStyleOverride,
  LabelShapeOnHover,
  NodeButton,
  LABEL_PADDING_X,
  LABEL_BORDER_WIDTH,
  LABEL_HEIGHT,
} from './styles';
import type { LabelNodeViewModel, NodeProps } from '../types';
import { NodeExpandButton } from './node_expand_button';
import { getTextWidth } from '../graph/utils';

const LABEL_MIN_WIDTH = 100;

export const LabelNode = memo<NodeProps>((props: NodeProps) => {
  const { id, color, label, interactive, nodeClick, expandButtonClick } =
    props.data as LabelNodeViewModel;
  const text = label ? label : id;
  const labelWidth = Math.max(
    LABEL_MIN_WIDTH,
    getTextWidth(text ?? '') + LABEL_PADDING_X * 2 + LABEL_BORDER_WIDTH * 2
  );

  return (
    <LabelNodeContainer>
      {interactive && <LabelShapeOnHover color={color} />}
      <LabelShape color={color} textAlign="center">
        {text}
      </LabelShape>
      {interactive && (
        <>
          <NodeButton
            css={css`
              margin-top: -${LABEL_HEIGHT}px;
            `}
            height={LABEL_HEIGHT}
            width={labelWidth}
            onClick={(e) => nodeClick?.(e, props)}
          />
          <NodeExpandButton
            color={color}
            onClick={(e, unToggleCallback) => expandButtonClick?.(e, props, unToggleCallback)}
            x={`${labelWidth}px`}
            y={`${-LABEL_HEIGHT + (LABEL_HEIGHT - NodeExpandButton.ExpandButtonSize) / 2}px`}
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
    </LabelNodeContainer>
  );
});

LabelNode.displayName = 'LabelNode';
