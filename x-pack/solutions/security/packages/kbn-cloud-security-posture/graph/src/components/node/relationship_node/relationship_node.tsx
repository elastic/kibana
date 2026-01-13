/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { css } from '@emotion/react';
import { EuiText, EuiTextTruncate, EuiToolTip, useEuiShadow, useEuiTheme } from '@elastic/eui';
import {
  LabelNodeContainer,
  LabelShape,
  HandleStyleOverride,
  LabelShapeOnHover,
  getLabelColors,
} from '../styles';
import type { RelationshipNodeViewModel, NodeProps } from '../../types';
import { GRAPH_RELATIONSHIP_NODE_ID } from '../../test_ids';

export const TEST_SUBJ_SHAPE = 'relationship-node-shape';
export const TEST_SUBJ_HANDLE = 'relationship-node-handle';
export const TEST_SUBJ_HOVER_OUTLINE = 'relationship-node-hover-outline';
export const TEST_SUBJ_TOOLTIP = 'relationship-node-tooltip';
export const TEST_SUBJ_LABEL_TEXT = 'relationship-node-text';

const MAX_LABEL_LENGTH = 27;

export const RelationshipNode = memo<NodeProps>((props: NodeProps) => {
  const { id, color, label, interactive } = props.data as RelationshipNodeViewModel;

  const { euiTheme } = useEuiTheme();
  const shadow = useEuiShadow('m', { property: 'filter' });

  const text = label ? label : id;

  const { backgroundColor, borderColor, textColor } = useMemo(
    () => getLabelColors(color, euiTheme, 'relationship'),
    [color, euiTheme]
  );

  return (
    <LabelNodeContainer data-test-subj={GRAPH_RELATIONSHIP_NODE_ID}>
      {interactive && <LabelShapeOnHover data-test-subj={TEST_SUBJ_HOVER_OUTLINE} color={color} />}
      <LabelShape
        data-test-subj={TEST_SUBJ_SHAPE}
        backgroundColor={backgroundColor}
        borderColor={borderColor}
        textAlign="center"
        shadow={shadow}
      >
        <div
          css={css`
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
          `}
        >
          <EuiText
            color={textColor}
            css={css`
              flex: 1;
              min-width: 0;
              text-overflow: ellipsis;
              font-weight: ${euiTheme.font.weight.semiBold};
              font-size: ${euiTheme.font.scale.xs * 10.5}px;
            `}
          >
            {text.length > MAX_LABEL_LENGTH ? (
              <EuiToolTip content={text} display="block" data-test-subj={TEST_SUBJ_TOOLTIP}>
                <EuiTextTruncate
                  data-test-subj={TEST_SUBJ_LABEL_TEXT}
                  truncation="middle"
                  text={text}
                />
              </EuiToolTip>
            ) : (
              <EuiTextTruncate
                data-test-subj={TEST_SUBJ_LABEL_TEXT}
                truncation="middle"
                text={text}
              />
            )}
          </EuiText>
        </div>
      </LabelShape>
      <Handle
        data-test-subj={TEST_SUBJ_HANDLE}
        type="target"
        isConnectable={false}
        position={Position.Left}
        id="in"
        style={HandleStyleOverride}
      />
      <Handle
        data-test-subj={TEST_SUBJ_HANDLE}
        type="source"
        isConnectable={false}
        position={Position.Right}
        id="out"
        style={HandleStyleOverride}
      />
    </LabelNodeContainer>
  );
});

RelationshipNode.displayName = 'RelationshipNode';
