/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import { Handle, NodeToolbar, Position } from '@xyflow/react';
import { css } from '@emotion/react';
import {
  EuiButtonIcon,
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
import type { LabelNodeViewModel, NodeProps, NodeToolbarItem } from '../../types';
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
export const TEST_SUBJ_LABEL_TEXT = 'label-node-text';

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
    toolbarItemsFn,
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

  // Hover state for the floating NodeToolbar — generous delay so the mouse
  // can travel from the label card into the toolbar without it dismissing.
  const [isHovered, setIsHovered] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToolbar = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    setIsHovered(true);
  }, []);
  const hideToolbar = useCallback(() => {
    hideTimerRef.current = setTimeout(() => setIsHovered(false), 300);
  }, []);

  const toolbarItems: NodeToolbarItem[] = useMemo(
    () => (toolbarItemsFn ? toolbarItemsFn(props) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [toolbarItemsFn, props.id]
  );

  return (
    <>
      <LabelNodeContainer
        data-test-subj={GRAPH_LABEL_NODE_ID}
        onMouseEnter={showToolbar}
        onMouseLeave={hideToolbar}
      >
        {/* Floating action toolbar — shown on hover when toolbar items are available */}
        {interactive && toolbarItems.length > 0 && (
          <NodeToolbar isVisible={isHovered} position={Position.Top} align="center" offset={4}>
            <div
              onMouseEnter={showToolbar}
              onMouseLeave={hideToolbar}
              css={css`
                display: flex;
                align-items: center;
                gap: 2px;
                background: ${euiTheme.colors.backgroundBasePlain};
                border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain};
                border-radius: ${euiTheme.border.radius.medium};
                padding: 2px;
                box-shadow: ${shadow};
              `}
            >
              {toolbarItems.map((item, idx) => (
                <EuiToolTip key={idx} content={item.label} disableScreenReaderOutput>
                  <EuiButtonIcon
                    iconType={item.iconType}
                    iconSize="s"
                    color="text"
                    size="xs"
                    aria-label={item.label}
                    disabled={item.disabled}
                    onClick={item.onClick}
                  />
                </EuiToolTip>
              ))}
            </div>
          </NodeToolbar>
        )}
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
              justify-content: center;
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
                text-align: center;
              `}
            >
              <EuiTextTruncate
                data-test-subj={TEST_SUBJ_LABEL_TEXT}
                truncation="middle"
                text={text}
              />
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
            {/* Expand button — hidden visually when the NodeToolbar is wired, but always
                 present in the DOM so that tests can click it to open the popover. */}
            <NodeExpandButton
              data-test-subj={TEST_SUBJ_EXPAND_BTN}
              color={'primary'}
              onClick={(e, unToggleCallback) => expandButtonClick?.(e, props, unToggleCallback)}
              x={`${NODE_LABEL_WIDTH - 3}px`}
              y={`${
                -ACTUAL_LABEL_HEIGHT + (ACTUAL_LABEL_HEIGHT - NodeExpandButton.ExpandButtonSize) / 2
              }px`}
              style={toolbarItems.length > 0 ? { display: 'none' } : undefined}
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
