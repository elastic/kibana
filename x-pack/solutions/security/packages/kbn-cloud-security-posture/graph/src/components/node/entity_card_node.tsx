/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import styled from '@emotion/styled';
import { css } from '@emotion/react';
import { Handle, Position, useViewport } from '@xyflow/react';
import { EuiIcon, EuiText, useEuiShadow, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { EuiThemeComputed } from '@elastic/eui';
import {
  NodeContainer,
  NodeShapeContainer,
  NodeButton,
  HandleStyleOverride,
  useNodeFillColor,
} from './styles';
import { NodeExpandButton } from './node_expand_button';
import { NODE_HEIGHT, NODE_WIDTH, LAYERS_ZOOM_THRESHOLD } from '../constants';
import {
  GRAPH_ENTITY_NODE_ID,
  GRAPH_ENTITY_NODE_RISK_BADGE_ID,
  GRAPH_ENTITY_NODE_LAYERS_PANEL_ID,
  GRAPH_STACKED_SHAPE_ID,
} from '../test_ids';
import { getSpanIcon } from './get_span_icon';
import { showStackedShape } from '../utils';
import type { EntityNodeViewModel, NodeProps } from '../types';

const ICON_AREA_WIDTH = NODE_HEIGHT; // square icon area

/** Converts an ISO 3166-1 alpha-2 country code to its flag emoji. */
const countryCodeToFlag = (code: string): string =>
  [...code.toUpperCase()].map((c) => String.fromCodePoint(c.charCodeAt(0) + 127397)).join('');

/**
 * Outer wrapper — owns the border, border-radius, and selection shadow for both
 * the header row and the optional metadata panel below it.
 */
const EntityCardWrapper = styled.div<{
  euiTheme: EuiThemeComputed;
  shadow?: string;
}>`
  position: relative;
  display: flex;
  flex-direction: column;
  width: ${NODE_WIDTH}px;
  background: ${({ euiTheme }) => euiTheme.colors.backgroundBasePlain};
  border: ${({ euiTheme }) =>
    `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain}`};
  border-radius: ${({ euiTheme }) => euiTheme.border.radius.medium};
  overflow: hidden;
  transition: border-color 0.2s ease, border-style 0.2s ease;

  /* Show dashed primary border on hover (interactive only) */
  .react-flow__node:not(.non-interactive) ${NodeShapeContainer}:hover & {
    border-color: ${({ euiTheme }) => euiTheme.colors.primary};
    border-style: dashed;
  }

  /* Shadow when selected */
  .react-flow__node:not(.non-interactive).selected & {
    ${({ shadow }) => shadow};
  }
  .react-flow__node:not(.non-interactive):active:not(.selected) & {
    ${({ shadow }) => shadow};
  }
`;

/**
 * The 60px header row: icon | name+tag | risk badge.
 */
const EntityCardHeader = styled.div`
  display: flex;
  flex-direction: row;
  align-items: stretch;
  height: ${NODE_HEIGHT}px;
`;

/**
 * Colored icon square — left section, fills full header height.
 */
const IconArea = styled.div<{ bgColor: string }>`
  width: ${ICON_AREA_WIDTH}px;
  min-width: ${ICON_AREA_WIDTH}px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ bgColor }) => bgColor};
`;

/**
 * Centre section — entity name (bold) + type subtitle.
 */
const EntityInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0 12px;
  overflow: hidden;
  min-width: 0;
`;

/**
 * Right section — risk score badge. Shows "N/A" as a placeholder until risk
 * score data is available from the entity store.
 */
const RiskBadgeArea = styled.div<{ euiTheme: EuiThemeComputed }>`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 ${({ euiTheme }) => euiTheme.size.s};
  background: ${({ euiTheme }) => euiTheme.colors.backgroundLightDanger};
  color: ${({ euiTheme }) => euiTheme.colors.danger};
  font-weight: ${({ euiTheme }) => euiTheme.font.weight.bold};
  font-size: ${({ euiTheme }) => euiTheme.size.m};
  white-space: nowrap;
  min-width: 56px;
`;

/**
 * Expanded metadata panel — rendered below the header when the user zooms in
 * past LAYERS_ZOOM_THRESHOLD. Laid out as a 2-column grid.
 */
const EntityCardMetadata = styled.div<{ euiTheme: EuiThemeComputed }>`
  display: grid;
  grid-template-columns: 1fr 1fr;
  border-top: ${({ euiTheme }) =>
    `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain}`};
`;

/**
 * Single metadata cell — label above value.
 */
const MetadataItem = styled.div<{ euiTheme: EuiThemeComputed }>`
  display: flex;
  flex-direction: column;
  padding: ${({ euiTheme }) => euiTheme.size.s};
  gap: ${({ euiTheme }) => euiTheme.size.xxs};
`;

/**
 * Stacked card — rendered behind the main card to convey that this node
 * represents more than one entity (count > 1). Two copies are rendered,
 * each offset and scaled down slightly.
 */
const StackedCard = styled.div<{
  euiTheme: EuiThemeComputed;
  bgColor: string;
  offsetY: number;
  scale: number;
}>`
  position: absolute;
  width: ${NODE_WIDTH}px;
  height: ${NODE_HEIGHT}px;
  background: ${({ bgColor }) => bgColor};
  border: ${({ euiTheme }) =>
    `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain}`};
  border-radius: ${({ euiTheme }) => euiTheme.border.radius.medium};
  transform: translateY(${({ offsetY }) => offsetY}px) scale(${({ scale }) => scale});
  transform-origin: center top;
  z-index: -1;
`;

const ASSET_CRITICALITY_LABEL = i18n.translate(
  'securitySolutionPackages.csp.graph.entityNode.metadata.assetCriticality',
  { defaultMessage: 'Asset criticality' }
);

const SOURCE_LABEL = i18n.translate(
  'securitySolutionPackages.csp.graph.entityNode.metadata.source',
  { defaultMessage: 'Source' }
);

const IP_ADDRESS_LABEL = i18n.translate(
  'securitySolutionPackages.csp.graph.entityNode.metadata.ipAddress',
  { defaultMessage: 'IP address' }
);

const GEOLOCATION_LABEL = i18n.translate(
  'securitySolutionPackages.csp.graph.entityNode.metadata.geolocation',
  { defaultMessage: 'Geolocation' }
);

/**
 * Shared horizontal card node rendered by all entity node shape types
 * (hexagon, pentagon, ellipse, rectangle, diamond). Shows a compact header at
 * default zoom and an expanded metadata panel when the user zooms in past
 * LAYERS_ZOOM_THRESHOLD.
 */
export const EntityCardNode = memo<NodeProps>((props: NodeProps) => {
  const {
    color,
    icon,
    label,
    tag,
    count,
    ips,
    countryCodes,
    interactive,
    expandButtonClick,
    nodeClick,
  } = props.data as EntityNodeViewModel;

  const { euiTheme } = useEuiTheme();
  const shadow = useEuiShadow('m');
  const fillColor = useNodeFillColor(color ?? 'primary');
  const { zoom } = useViewport();
  const showLayers = zoom >= LAYERS_ZOOM_THRESHOLD;

  const firstIp = ips?.[0] ?? '—';
  const firstFlag = countryCodes?.[0] ? countryCodeToFlag(countryCodes[0]) : '—';

  return (
    <NodeContainer data-test-subj={GRAPH_ENTITY_NODE_ID}>
      <NodeShapeContainer>
        {/* Stacked card effect when node represents multiple entities */}
        {showStackedShape(count) && (
          <>
            <StackedCard
              data-test-subj={GRAPH_STACKED_SHAPE_ID}
              euiTheme={euiTheme}
              bgColor={fillColor}
              offsetY={8}
              scale={0.9}
            />
            <StackedCard
              data-test-subj={GRAPH_STACKED_SHAPE_ID}
              euiTheme={euiTheme}
              bgColor={fillColor}
              offsetY={4}
              scale={0.95}
            />
          </>
        )}

        <EntityCardWrapper euiTheme={euiTheme} shadow={shadow}>
          {/* Header row: icon | name+tag | risk badge */}
          <EntityCardHeader>
            <IconArea bgColor={fillColor}>
              {icon && (
                <EuiIcon
                  type={getSpanIcon(icon) ?? icon}
                  size="l"
                  color={color ?? 'primary'}
                  aria-hidden={true}
                />
              )}
            </IconArea>

            <EntityInfo>
              <EuiText size="s">
                <p
                  css={css`
                    font-weight: ${euiTheme.font.weight.bold};
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    margin: 0;
                    line-height: ${euiTheme.size.l};
                  `}
                >
                  {label}
                </p>
              </EuiText>
              {tag && (
                <EuiText size="xs" color="subdued">
                  <p
                    css={css`
                      overflow: hidden;
                      text-overflow: ellipsis;
                      white-space: nowrap;
                      margin: 0;
                    `}
                  >
                    {tag}
                  </p>
                </EuiText>
              )}
            </EntityInfo>

            {/* Right: risk score badge — placeholder until risk score is wired up */}
            <RiskBadgeArea data-test-subj={GRAPH_ENTITY_NODE_RISK_BADGE_ID} euiTheme={euiTheme}>
              {'N/A'}
            </RiskBadgeArea>
          </EntityCardHeader>

          {/* Expanded metadata — shown when zoomed in past LAYERS_ZOOM_THRESHOLD */}
          {showLayers && (
            <EntityCardMetadata
              data-test-subj={GRAPH_ENTITY_NODE_LAYERS_PANEL_ID}
              euiTheme={euiTheme}
            >
              {/* Row 1 */}
              <MetadataItem euiTheme={euiTheme}>
                <EuiText size="xs" color="subdued">
                  <p
                    css={css`
                      margin: 0;
                    `}
                  >
                    {ASSET_CRITICALITY_LABEL}
                  </p>
                </EuiText>
                <EuiText size="xs">
                  <p
                    css={css`
                      margin: 0;
                      font-weight: ${euiTheme.font.weight.semiBold};
                    `}
                  >
                    {'—'}
                  </p>
                </EuiText>
              </MetadataItem>
              <MetadataItem euiTheme={euiTheme}>
                <EuiText size="xs" color="subdued">
                  <p
                    css={css`
                      margin: 0;
                    `}
                  >
                    {SOURCE_LABEL}
                  </p>
                </EuiText>
                <EuiText size="xs">
                  <p
                    css={css`
                      margin: 0;
                      font-weight: ${euiTheme.font.weight.semiBold};
                    `}
                  >
                    {'-'}
                  </p>
                </EuiText>
              </MetadataItem>
              {/* Row 2 */}
              <MetadataItem euiTheme={euiTheme}>
                <EuiText size="xs" color="subdued">
                  <p
                    css={css`
                      margin: 0;
                    `}
                  >
                    {IP_ADDRESS_LABEL}
                  </p>
                </EuiText>
                <EuiText size="xs">
                  <p
                    css={css`
                      margin: 0;
                      font-weight: ${euiTheme.font.weight.semiBold};
                    `}
                  >
                    {firstIp}
                  </p>
                </EuiText>
              </MetadataItem>
              <MetadataItem euiTheme={euiTheme}>
                <EuiText size="xs" color="subdued">
                  <p
                    css={css`
                      margin: 0;
                    `}
                  >
                    {GEOLOCATION_LABEL}
                  </p>
                </EuiText>
                <EuiText size="xs">
                  <p
                    css={css`
                      margin: 0;
                      font-weight: ${euiTheme.font.weight.semiBold};
                    `}
                  >
                    {firstFlag}
                  </p>
                </EuiText>
              </MetadataItem>
            </EntityCardMetadata>
          )}
        </EntityCardWrapper>

        {interactive && (
          <>
            <NodeButton
              width={NODE_WIDTH}
              height={NODE_HEIGHT}
              onClick={(e) => nodeClick?.(e, props)}
            />
            <NodeExpandButton
              color={color}
              onClick={(e, unToggleCallback) => expandButtonClick?.(e, props, unToggleCallback)}
              x={`${NODE_WIDTH - NodeExpandButton.ExpandButtonSize}px`}
              y={`${(NODE_HEIGHT - NodeExpandButton.ExpandButtonSize) / 2}px`}
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
      </NodeShapeContainer>
    </NodeContainer>
  );
});

EntityCardNode.displayName = 'EntityCardNode';
