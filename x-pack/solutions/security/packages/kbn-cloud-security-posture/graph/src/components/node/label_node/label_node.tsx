/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useRef, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { css } from '@emotion/react';
import {
  EuiText,
  EuiTextTruncate,
  EuiPopover,
  useEuiShadow,
  useEuiTheme,
  EuiPopoverTitle,
} from '@elastic/eui';
import {
  LabelNodeContainer,
  LabelShape,
  HandleStyleOverride,
  LabelShapeOnHover,
  NodeButton,
  ACTUAL_LABEL_HEIGHT,
  NODE_LABEL_WIDTH,
  getLabelColors,
} from '../styles';
import type { LabelNodeViewModel, NodeProps } from '../../types';
import { NodeExpandButton } from '../node_expand_button';
import { analyzeDocuments } from './analyze_documents';
import { LabelNodeBadges, LIMIT as BADGES_LIMIT } from './label_node_badges';
import { LabelNodePopoverContent } from './label_node_popover';
import { LabelNodeDetails } from './label_node_details';

export const TEST_SUBJ_CONTAINER = 'label-node-container';
export const TEST_SUBJ_SHAPE = 'label-node-shape';
export const TEST_SUBJ_POPOVER = 'label-node-popover';
export const TEST_SUBJ_HANDLE = 'label-node-handle';
export const TEST_SUBJ_EXPAND_BTN = 'label-node-expand-btn';
export const TEST_SUBJ_HOVER_OUTLINE = 'label-node-hover-outline';

export const LabelNode = memo<NodeProps>((props: NodeProps) => {
  const {
    id,
    color,
    eventsCount,
    alertsCount,
    label,
    interactive,
    ips,
    countryCodes,
    nodeClick,
    expandButtonClick,
  } = props.data as LabelNodeViewModel;

  const { euiTheme } = useEuiTheme();
  const shadow = useEuiShadow('m', { property: 'filter' });

  const text = label ? label : id;

  const { backgroundColor, borderColor, textColor } = useMemo(
    () => getLabelColors(color, euiTheme),
    [color, euiTheme]
  );

  const numEvents = eventsCount ?? 0;
  const numAlerts = alertsCount ?? 0;
  const analysis = analyzeDocuments({ eventsCount: numEvents, alertsCount: numAlerts });
  const shouldShowPopover = numEvents > BADGES_LIMIT || numAlerts > BADGES_LIMIT;

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  return (
    <div>
      <EuiPopover
        button={
          <LabelNodeContainer
            data-test-subj={TEST_SUBJ_CONTAINER}
            onClick={() => shouldShowPopover && setIsPopoverOpen(!isPopoverOpen)}
            style={{ cursor: shouldShowPopover ? 'pointer' : 'default' }}
          >
            {interactive && (
              <LabelShapeOnHover
                data-test-subj={TEST_SUBJ_HOVER_OUTLINE}
                color={
                  analysis.isSingleAlert || analysis.isGroupOfAlerts
                    ? euiTheme.colors.danger
                    : euiTheme.colors.primary
                }
              />
            )}
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
                  justify-content: space-between;
                  width: 100%;
                  gap: ${euiTheme.size.xs};
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
                  <EuiTextTruncate truncation="end" text={text}>
                    {(truncatedText) => truncatedText}
                  </EuiTextTruncate>
                </EuiText>
                <LabelNodeBadges analysis={analysis} />
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
                  data-test-subj={TEST_SUBJ_EXPAND_BTN}
                  color={'primary'}
                  onClick={(e, unToggleCallback) => expandButtonClick?.(e, props, unToggleCallback)}
                  x={`${NODE_LABEL_WIDTH - 3}px`}
                  y={`${
                    -ACTUAL_LABEL_HEIGHT +
                    (ACTUAL_LABEL_HEIGHT - NodeExpandButton.ExpandButtonSize) / 2
                  }px`}
                />
              </>
            )}
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
        }
        isOpen={isPopoverOpen}
        closePopover={() => setIsPopoverOpen(false)}
        focusTrapProps={{
          clickOutsideDisables: true,
          onClickOutside: () => {
            console.log('click outside');
            setIsPopoverOpen(false);
          },
        }}
        anchorPosition="upCenter"
        data-test-subj={TEST_SUBJ_POPOVER}
      >
        {shouldShowPopover && (
          <div
            css={css`
              max-width: 250px;
            `}
          >
            <EuiPopoverTitle>{text}</EuiPopoverTitle>
            <LabelNodePopoverContent analysis={analysis} />
          </div>
        )}
      </EuiPopover>
      <LabelNodeDetails ips={ips} countryCodes={countryCodes} />
    </div>
  );
});

LabelNode.displayName = 'LabelNode';
