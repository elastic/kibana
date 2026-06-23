/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { css } from '@emotion/react';
import styled from '@emotion/styled';
import { EuiTextTruncate, EuiToolTip, useEuiShadow, useEuiTheme } from '@elastic/eui';
import { NodeButton, NODE_LABEL_WIDTH } from '../styles';
import { PillExpandButton, TEST_SUBJ_PILL_EXPAND_BTN } from '../pill_expand_button';
import { useMultipleNodesSelected } from '../../../hooks/use_multiple_nodes_selected';
import type { LabelNodeViewModel, NodeProps } from '../../types';
import { GRAPH_LABEL_NODE_ID } from '../../test_ids';
import { GRAPH_SIMPLIFIED_ZOOM_THRESHOLD } from '../../constants';
import { useViewportZoom } from '../../../hooks/use_viewport_zoom';
import { analyzeDocuments } from './analyze_documents';
import { LabelNodeBadges } from './label_node_badges';
import { LabelNodeDetails } from './label_node_details';
import {
  EVENT_PILL_HEIGHT,
  getEventPillColors,
  getEventPillTone,
  LABEL_PILL_TEXT_MAX_WIDTH,
  pillHandleStyle,
} from './event_pill_styles';
import { OriginNodeOutline } from '../origin_node_outline';

export const TEST_SUBJ_SHAPE = 'label-node-shape';
export const TEST_SUBJ_EXPAND_BTN = TEST_SUBJ_PILL_EXPAND_BTN;
export const TEST_SUBJ_TOOLTIP = 'label-node-tooltip';
export const TEST_SUBJ_LABEL_TEXT = 'label-node-text';
export const TEST_SUBJ_HANDLE = 'label-node-handle';

const MAX_LABEL_LENGTH = 27;

const LabelNodeContainer = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: max-content;
  max-width: ${NODE_LABEL_WIDTH}px;
`;

const PillShell = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
`;

const pillHitTargetCss = css`
  position: absolute;
  inset: 0;
  z-index: 1;
  width: auto;
  height: auto;

  button {
    width: 100%;
    height: 100%;
  }
`;

const EventPill = styled.div<{
  backgroundColor: string;
  borderColor: string;
  interactiveShadow?: string;
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: ${EVENT_PILL_HEIGHT}px;
  height: ${EVENT_PILL_HEIGHT}px;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid ${({ borderColor }) => borderColor};
  background: ${({ backgroundColor }) => backgroundColor};
  max-width: 100%;

  .react-flow__node:not(.non-interactive):hover &,
  .react-flow__node:not(.non-interactive).selected & {
    box-shadow: ${({ interactiveShadow }) => interactiveShadow ?? 'none'};
  }
`;

export const LabelNode = memo<NodeProps>((props: NodeProps) => {
  const { id, selected } = props;
  const {
    label,
    uniqueEventsCount,
    uniqueAlertsCount,
    interactive,
    ips,
    countryCodes,
    nodeClick,
    expandButtonClick,
    eventClickHandler,
    highlightAsOrigin = false,
  } = props.data as LabelNodeViewModel;

  const { euiTheme } = useEuiTheme();
  const hoverShadow = useEuiShadow('xs');
  const activeShadow = useEuiShadow('s');
  const zoom = useViewportZoom();
  const isMultipleNodesSelected = useMultipleNodesSelected();
  const showExpandButton = interactive && !isMultipleNodesSelected;
  const showDetails = zoom >= GRAPH_SIMPLIFIED_ZOOM_THRESHOLD;

  const text = label ?? id;
  const isActive = Boolean(selected);

  const numEvents = uniqueEventsCount ?? 0;
  const numAlerts = uniqueAlertsCount ?? 0;
  const analysis = useMemo(
    () => analyzeDocuments({ uniqueEventsCount: numEvents, uniqueAlertsCount: numAlerts }),
    [numEvents, numAlerts]
  );

  const pillTone = getEventPillTone(analysis);
  const pillColors = getEventPillColors(pillTone, isActive, euiTheme);
  const interactiveShadow = isActive ? activeShadow : hoverShadow;

  const labelTextCss = css`
    font-size: 10.5px;
    line-height: 16px;
    font-weight: ${euiTheme.font.weight.semiBold};
    color: ${pillColors.textColor};
    flex: 1;
    min-width: 0;
  `;

  const renderLabelText = () => {
    if (text.length <= MAX_LABEL_LENGTH) {
      return (
        <span css={labelTextCss} data-test-subj={TEST_SUBJ_LABEL_TEXT}>
          {text}
        </span>
      );
    }

    const truncatedLabel = (
      <EuiTextTruncate
        data-test-subj={TEST_SUBJ_LABEL_TEXT}
        truncation="middle"
        text={text}
        width={LABEL_PILL_TEXT_MAX_WIDTH}
        css={labelTextCss}
      />
    );

    return (
      <EuiToolTip content={text} display="block" data-test-subj={TEST_SUBJ_TOOLTIP}>
        {truncatedLabel}
      </EuiToolTip>
    );
  };

  return (
    <LabelNodeContainer data-test-subj={GRAPH_LABEL_NODE_ID}>
      <PillShell>
        {highlightAsOrigin && (
          <OriginNodeOutline
            borderColor={pillColors.borderColor}
            borderRadius="999px"
            borderWidth={2}
          />
        )}
        <EventPill
          data-test-subj={TEST_SUBJ_SHAPE}
          backgroundColor={pillColors.backgroundColor}
          borderColor={pillColors.borderColor}
          interactiveShadow={interactiveShadow}
        >
          {renderLabelText()}
          <LabelNodeBadges
            analysis={analysis}
            isActive={isActive}
            onEventClick={eventClickHandler}
          />
        </EventPill>

        {interactive && (
          <>
            <NodeButton onClick={(e) => nodeClick?.(e, props)} css={pillHitTargetCss} />
            {showExpandButton && (
              <PillExpandButton
                onClick={(e, unToggleCallback) => expandButtonClick?.(e, props, unToggleCallback)}
              />
            )}
          </>
        )}
      </PillShell>

      {showDetails && <LabelNodeDetails ips={ips} countryCodes={countryCodes} />}

      <Handle
        data-test-subj={TEST_SUBJ_HANDLE}
        type="target"
        isConnectable={false}
        position={Position.Left}
        id="in"
        style={pillHandleStyle}
      />
      <Handle
        data-test-subj={TEST_SUBJ_HANDLE}
        type="source"
        isConnectable={false}
        position={Position.Right}
        id="out"
        style={pillHandleStyle}
      />
    </LabelNodeContainer>
  );
});

LabelNode.displayName = 'LabelNode';
