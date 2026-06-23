/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { Handle, Position } from '@xyflow/react';
import styled from '@emotion/styled';
import { css } from '@emotion/react';
import { EuiTextTruncate, EuiToolTip, useEuiShadow, useEuiTheme } from '@elastic/eui';
import { NODE_LABEL_WIDTH, getRelationshipColors } from '../styles';
import { PillExpandButton, TEST_SUBJ_PILL_EXPAND_BTN } from '../pill_expand_button';
import { useMultipleNodesSelected } from '../../../hooks/use_multiple_nodes_selected';
import type { RelationshipNodeViewModel, NodeProps } from '../../types';
import { EVENT_PILL_HEIGHT, LABEL_PILL_TEXT_MAX_WIDTH, pillHandleStyle } from '../label_node/event_pill_styles';
import {
  GRAPH_RELATIONSHIP_NODE_ID,
  GRAPH_RELATIONSHIP_NODE_SHAPE_ID,
  GRAPH_RELATIONSHIP_NODE_HANDLE_ID,
  GRAPH_RELATIONSHIP_NODE_TOOLTIP_ID,
  GRAPH_RELATIONSHIP_NODE_LABEL_TEXT_ID,
} from '../../test_ids';

const MAX_LABEL_LENGTH = 27;

export const TEST_SUBJ_RELATIONSHIP_EXPAND_BTN = TEST_SUBJ_PILL_EXPAND_BTN;

const RelationshipNodeContainer = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: max-content;
  max-width: ${NODE_LABEL_WIDTH}px;
`;

const PillShell = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
`;

const RelationshipPill = styled.div<{
  backgroundColor: string;
  emphasizedBackgroundColor: string;
  borderColor: string;
  interactiveShadow?: string;
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: ${EVENT_PILL_HEIGHT}px;
  height: ${EVENT_PILL_HEIGHT}px;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid ${({ borderColor }) => borderColor};
  background: ${({ backgroundColor }) => backgroundColor};
  max-width: 100%;
  transition: background-color 0.15s ease, box-shadow 0.2s ease;

  .react-flow__node:not(.non-interactive):hover &,
  .react-flow__node:not(.non-interactive).selected & {
    background: ${({ emphasizedBackgroundColor }) => emphasizedBackgroundColor};
    box-shadow: ${({ interactiveShadow }) => interactiveShadow ?? 'none'};
  }
`;

export const RelationshipNode = memo<NodeProps>((props: NodeProps) => {
  const { id, selected } = props;
  const { label, interactive, expandButtonClick } = props.data as RelationshipNodeViewModel;

  const isMultipleNodesSelected = useMultipleNodesSelected();
  const showExpandButton = interactive && !isMultipleNodesSelected;

  const { euiTheme } = useEuiTheme();
  const hoverShadow = useEuiShadow('xs');
  const activeShadow = useEuiShadow('s');

  const text = label ?? id;
  const isActive = Boolean(selected);

  const { backgroundColor, emphasizedBackgroundColor, borderColor, textColor } = useMemo(
    () => getRelationshipColors(euiTheme),
    [euiTheme]
  );

  const labelTextCss = css`
    flex: 1;
    min-width: 0;
    font-weight: ${euiTheme.font.weight.semiBold};
    font-size: 10.5px;
    line-height: 16px;
    color: ${textColor};
  `;

  const renderLabelText = () => {
    if (text.length <= MAX_LABEL_LENGTH) {
      return (
        <span css={labelTextCss} data-test-subj={GRAPH_RELATIONSHIP_NODE_LABEL_TEXT_ID}>
          {text}
        </span>
      );
    }

    const truncatedLabel = (
      <EuiTextTruncate
        data-test-subj={GRAPH_RELATIONSHIP_NODE_LABEL_TEXT_ID}
        truncation="middle"
        text={text}
        width={LABEL_PILL_TEXT_MAX_WIDTH}
        css={labelTextCss}
      />
    );

    return (
      <EuiToolTip
        content={text}
        display="block"
        data-test-subj={GRAPH_RELATIONSHIP_NODE_TOOLTIP_ID}
      >
        {truncatedLabel}
      </EuiToolTip>
    );
  };

  return (
    <RelationshipNodeContainer data-test-subj={GRAPH_RELATIONSHIP_NODE_ID}>
      <PillShell>
        <RelationshipPill
          data-test-subj={GRAPH_RELATIONSHIP_NODE_SHAPE_ID}
          backgroundColor={backgroundColor}
          emphasizedBackgroundColor={emphasizedBackgroundColor}
          borderColor={borderColor}
          interactiveShadow={isActive ? activeShadow : hoverShadow}
        >
          {renderLabelText()}
        </RelationshipPill>

        {interactive && showExpandButton && (
          <PillExpandButton
            onClick={(e, unToggleCallback) => expandButtonClick?.(e, props, unToggleCallback)}
          />
        )}
      </PillShell>

      <Handle
        data-test-subj={GRAPH_RELATIONSHIP_NODE_HANDLE_ID}
        type="target"
        isConnectable={false}
        position={Position.Left}
        id="in"
        style={pillHandleStyle}
      />
      <Handle
        data-test-subj={GRAPH_RELATIONSHIP_NODE_HANDLE_ID}
        type="source"
        isConnectable={false}
        position={Position.Right}
        id="out"
        style={pillHandleStyle}
      />
    </RelationshipNodeContainer>
  );
});

RelationshipNode.displayName = 'RelationshipNode';
