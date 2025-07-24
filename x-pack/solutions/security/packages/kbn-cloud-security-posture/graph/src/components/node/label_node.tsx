/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { css } from '@emotion/react';
import { EuiTextTruncate, EuiToolTip, useEuiTheme } from '@elastic/eui';
import {
  LabelNodeContainer,
  LabelShape,
  HandleStyleOverride,
  LabelShapeOnHover,
  NodeButton,
  ACTUAL_LABEL_HEIGHT,
  NODE_LABEL_WIDTH,
  LABEL_PADDING_X,
} from './styles';
import type { LabelNodeViewModel, NodeProps } from '../types';
import { NodeExpandButton } from './node_expand_button';
import { analyzeDocuments, getLabelBackgroundColor, getLabelTextColor } from './label_node_helpers/analyze_documents';
import { LabelNodeBadges } from './label_node_helpers/label_node_badges';
import { LabelNodeTooltipContent } from './label_node_helpers/label_node_tooltip';

export const LabelNode = memo<NodeProps>((props: NodeProps) => {
  const { dragging } = props;
  const { 
    id, 
    color, 
    label, 
    interactive, 
    nodeClick, 
    expandButtonClick,
    documentsData
  } = props.data as LabelNodeViewModel;
  
  const { euiTheme } = useEuiTheme();
  const text = label ? label : id;
  
  const analysis = useMemo(() => analyzeDocuments(documentsData), [documentsData]);
  const backgroundColor = useMemo(() => getLabelBackgroundColor(analysis, euiTheme), [analysis, euiTheme]);
  const textColor = useMemo(() => getLabelTextColor(analysis, euiTheme), [analysis, euiTheme]);

  const shouldShowTooltip = analysis.totalDocuments > 0;

  const labelContent = (
    <LabelNodeContainer isDragging={dragging}>
      {interactive && <LabelShapeOnHover color={color} />}
      <LabelShape 
        color={color} 
        textAlign="center"
        backgroundColor={backgroundColor}
        textColor={textColor}
      >
        <div css={css`
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
        `}>
          <div css={css`
            flex: 1;
            min-width: 0;
          `}>
            <EuiTextTruncate
              truncation="end"
              truncationOffset={20}
              text={text}
              width={NODE_LABEL_WIDTH - LABEL_PADDING_X * 2 - 60} // Leave space for badges
            />
          </div>
          <div css={css`
            display: flex;
            align-items: center;
            flex-shrink: 0;
          `}>
            <LabelNodeBadges analysis={analysis} />
          </div>
        </div>
      </LabelShape>
      {interactive && (
        <>
          <NodeButton
            css={css`
              margin-top: -${ACTUAL_LABEL_HEIGHT}px;
            `}
            height={ACTUAL_LABEL_HEIGHT}
            width={NODE_LABEL_WIDTH}
            onClick={(e) => nodeClick?.(e, props)}
          />
          <NodeExpandButton
            color={color}
            onClick={(e, unToggleCallback) => expandButtonClick?.(e, props, unToggleCallback)}
            x={`${NODE_LABEL_WIDTH}px`}
            y={`${
              -ACTUAL_LABEL_HEIGHT + (ACTUAL_LABEL_HEIGHT - NodeExpandButton.ExpandButtonSize) / 2
            }px`}
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

  if (shouldShowTooltip) {
    return (
      <EuiToolTip
        content={<LabelNodeTooltipContent analysis={analysis} />}
        position="top"
        data-test-subj="label-node-tooltip"
      >
        {labelContent}
      </EuiToolTip>
    );
  }

  return labelContent;
});

LabelNode.displayName = 'LabelNode';
