/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { css } from '@emotion/react';
import { EuiText } from '@elastic/eui';
import {
  LabelNodeContainer,
  LabelShape,
  HandleStyleOverride,
  LabelShapeOnHover,
  NodeButton,
  LABEL_HEIGHT,
  LabelBadge,
} from './styles';
import type { LabelNodeViewModel, NodeProps } from '../types';
import { NodeExpandButton } from './node_expand_button';
import { calcLabelSize } from '../graph/utils';

export const LabelNode = memo<NodeProps>((props: NodeProps) => {
  const {
    id,
    color,
    label,
    badge,
    successOutcomeCount = 0,
    failureOutcomeCount = 0,
    interactive,
    nodeClick,
    expandButtonClick,
  } = props.data as LabelNodeViewModel;
  const text = label ? label : id;

  const size = calcLabelSize(text, successOutcomeCount, failureOutcomeCount);

  return (
    <LabelNodeContainer data-calc-size={JSON.stringify(size)}>
      {interactive && <LabelShapeOnHover color={color} />}
      <LabelShape color={color} textAlign="center">
        <EuiText size="xs">
          {text}
          {(successOutcomeCount > 1 || (successOutcomeCount === 1 && failureOutcomeCount > 0)) && (
            <LabelBadge color={color}>{successOutcomeCount}</LabelBadge>
          )}
          {failureOutcomeCount > 0 && (
            <LabelBadge color="warning" iconType="errorFilled">
              {failureOutcomeCount}
            </LabelBadge>
          )}
        </EuiText>
      </LabelShape>
      {interactive && (
        <>
          <NodeButton
            css={css`
              margin-top: -${LABEL_HEIGHT}px;
            `}
            height={LABEL_HEIGHT}
            width="100%"
            onClick={(e) => nodeClick?.(e, props)}
          />
          <NodeExpandButton
            color={color}
            onClick={(e, unToggleCallback) => expandButtonClick?.(e, props, unToggleCallback)}
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
