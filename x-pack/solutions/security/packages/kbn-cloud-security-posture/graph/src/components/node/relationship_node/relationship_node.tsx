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
  getRelationshipColors,
} from '../styles';
import type { RelationshipNodeViewModel, NodeProps } from '../../types';
import {
  GRAPH_RELATIONSHIP_NODE_ID,
  GRAPH_RELATIONSHIP_NODE_SHAPE_ID,
  GRAPH_RELATIONSHIP_NODE_HANDLE_ID,
  GRAPH_RELATIONSHIP_NODE_HOVER_OUTLINE_ID,
  GRAPH_RELATIONSHIP_NODE_TOOLTIP_ID,
  GRAPH_RELATIONSHIP_NODE_LABEL_TEXT_ID,
} from '../../test_ids';

const MAX_LABEL_LENGTH = 27;

export const RelationshipNode = memo<NodeProps>((props: NodeProps) => {
  const { id, label, interactive } = props.data as RelationshipNodeViewModel;

  const { euiTheme } = useEuiTheme();
  const shadow = useEuiShadow('m', { property: 'filter' });

  const text = label ? label : id;

  const { backgroundColor, borderColor, textColor } = useMemo(
    () => getRelationshipColors(euiTheme),
    [euiTheme]
  );

  return (
    <LabelNodeContainer data-test-subj={GRAPH_RELATIONSHIP_NODE_ID}>
      {interactive && (
        <LabelShapeOnHover
          data-test-subj={GRAPH_RELATIONSHIP_NODE_HOVER_OUTLINE_ID}
          color="primary"
        />
      )}
      <LabelShape
        data-test-subj={GRAPH_RELATIONSHIP_NODE_SHAPE_ID}
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
              <EuiToolTip
                content={text}
                display="block"
                data-test-subj={GRAPH_RELATIONSHIP_NODE_TOOLTIP_ID}
              >
                <EuiTextTruncate
                  data-test-subj={GRAPH_RELATIONSHIP_NODE_LABEL_TEXT_ID}
                  truncation="middle"
                  text={text}
                />
              </EuiToolTip>
            ) : (
              <EuiTextTruncate
                data-test-subj={GRAPH_RELATIONSHIP_NODE_LABEL_TEXT_ID}
                truncation="middle"
                text={text}
              />
            )}
          </EuiText>
        </div>
      </LabelShape>
      <Handle
        data-test-subj={GRAPH_RELATIONSHIP_NODE_HANDLE_ID}
        type="target"
        isConnectable={false}
        position={Position.Left}
        id="in"
        style={HandleStyleOverride}
      />
      <Handle
        data-test-subj={GRAPH_RELATIONSHIP_NODE_HANDLE_ID}
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
