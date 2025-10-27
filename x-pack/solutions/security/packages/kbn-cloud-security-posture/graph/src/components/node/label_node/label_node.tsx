/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { css } from '@emotion/react';
import {
  EuiText,
  EuiTextTruncate,
  EuiToolTip,
  transparentize,
  useEuiShadow,
  useEuiTheme,
} from '@elastic/eui';
import {
  LabelNodeContainer,
  LabelShape,
  LabelStackedShape,
  HandleStyleOverride,
  LabelShapeOnHover,
  NodeButton,
  ACTUAL_LABEL_HEIGHT,
  NODE_LABEL_WIDTH,
  getLabelColors,
} from '../styles';
import type { LabelNodeViewModel, NodeProps } from '../../types';
import { NodeExpandButton } from '../node_expand_button';
import { GRAPH_LABEL_NODE_ID } from '../../test_ids';
import { analyzeDocuments } from './analyze_documents';
import { LabelNodeBadges } from './label_node_badges';
import { LabelNodeDetails } from './label_node_details';
import { showStackedShape } from '../../utils';

export const TEST_SUBJ_SHAPE = 'label-node-shape';
export const TEST_SUBJ_STACKED_SHAPE = 'label-node-stacked-shape';
export const TEST_SUBJ_HANDLE = 'label-node-handle';
export const TEST_SUBJ_EXPAND_BTN = 'label-node-expand-btn';
export const TEST_SUBJ_HOVER_OUTLINE = 'label-node-hover-outline';
export const TEST_SUBJ_TOOLTIP = 'label-node-tooltip';
export const TEST_SUBJ_LABEL_TEXT = 'label-node-text';

const MAX_LABEL_LENGTH = 27;

export const LabelNode = memo<NodeProps>((props: NodeProps) => {
  const {
    id,
    color,
    uniqueEventsCount,
    uniqueAlertsCount,
    label,
    interactive,
    ips,
    countryCodes,
    nodeClick,
    expandButtonClick,
    ipClickHandler,
    countryClickHandler,
    eventClickHandler,
  } = props.data as LabelNodeViewModel;

  const { euiTheme } = useEuiTheme();
  const shadow = useEuiShadow('m', { property: 'filter' });

  const text = label ? label : id;

  const { backgroundColor, borderColor, textColor } = useMemo(
    () => getLabelColors(color, euiTheme),
    [color, euiTheme]
  );

  const numEvents = uniqueEventsCount ?? 0;
  const numAlerts = uniqueAlertsCount ?? 0;

  const analysis = analyzeDocuments({ uniqueEventsCount: numEvents, uniqueAlertsCount: numAlerts });

  return (
    <>
      <LabelNodeContainer data-test-subj={GRAPH_LABEL_NODE_ID}>
        {interactive && (
          <LabelShapeOnHover data-test-subj={TEST_SUBJ_HOVER_OUTLINE} color={color} />
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
            <LabelNodeBadges analysis={analysis} onEventClick={eventClickHandler} />
          </div>
        </LabelShape>
        {showStackedShape(numEvents + numAlerts) && (
          <LabelStackedShape
            data-test-subj={TEST_SUBJ_STACKED_SHAPE}
            borderColor={transparentize(borderColor, 0.5)}
          />
        )}
        {interactive && (
          <>
            <NodeButton
              css={css`
                margin-top: -${ACTUAL_LABEL_HEIGHT}px;
                pointer-events: none;
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
                -ACTUAL_LABEL_HEIGHT + (ACTUAL_LABEL_HEIGHT - NodeExpandButton.ExpandButtonSize) / 2
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
      <LabelNodeDetails
        ips={ips}
        countryCodes={countryCodes}
        onIpClick={ipClickHandler}
        onCountryClick={countryClickHandler}
      />
    </>
  );
});

LabelNode.displayName = 'LabelNode';
