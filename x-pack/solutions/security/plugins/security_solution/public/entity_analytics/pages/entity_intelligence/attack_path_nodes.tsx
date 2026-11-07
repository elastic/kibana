/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  EuiToolTip,
  transparentize,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiThemeComputed, IconType } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps, NodeTypes } from '@xyflow/react';
import { EntityIconByType } from '../../components/entity_store/entity_icon_by_type';
import { EntityType } from '../../../../common/entity_analytics/types';
import { getAlertSeverityColor } from './common';
import type { CrownJewelLeaf, SpineNode } from './attack_path_model';
import type { EntityNodeData, ResourceNodeData } from './attack_path_layout';

export const ENTITY_NODE_TYPE = 'entity';
export const ORIGIN_NODE_TYPE = 'origin';
export const RESOURCE_NODE_TYPE = 'resource';

/** Semantic icon per spine node kind. */
export const spineIcon = (kind: SpineNode['kind']): IconType => {
  if (kind === 'origin' || kind === 'ip') return 'globe';
  return EntityIconByType[kind];
};

/** Semantic icon per crown-jewel kind. */
export const crownJewelIcon = (kind: CrownJewelLeaf['kind']): IconType => {
  switch (kind) {
    case 'data-store':
      return 'storage';
    case 'exfil-destination':
      return 'globe';
    default:
      return 'star';
  }
};

/** Distinct color family per node kind (theme tokens only, no hex). */
export const nodeKindColor = (euiTheme: EuiThemeComputed, kind: SpineNode['kind']): string => {
  switch (kind) {
    case 'origin':
    case 'ip':
      return euiTheme.colors.textSubdued;
    case EntityType.user:
      return euiTheme.colors.accent;
    case EntityType.service:
      return euiTheme.colors.primary;
    case EntityType.host:
    default:
      return euiTheme.colors.severity.neutral;
  }
};

const crownJewelLabel = (kind: CrownJewelLeaf['kind']): string => {
  switch (kind) {
    case 'data-store':
      return i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.explorer.attackPathJewelStore',
        { defaultMessage: 'Data store' }
      );
    case 'exfil-destination':
      return i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.explorer.attackPathJewelExfil',
        { defaultMessage: 'External destination' }
      );
    default:
      return i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.explorer.attackPathJewelSensitive',
        { defaultMessage: 'Sensitive asset' }
      );
  }
};

const kindLabel = (kind: SpineNode['kind']): string => {
  switch (kind) {
    case EntityType.user:
      return i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.explorer.attackPathKindUser',
        { defaultMessage: 'User' }
      );
    case EntityType.service:
      return i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.explorer.attackPathKindService',
        { defaultMessage: 'Service' }
      );
    case 'ip':
      return i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.explorer.attackPathKindIp',
        { defaultMessage: 'IP address' }
      );
    case 'origin':
      return i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.explorer.attackPathKindOrigin',
        { defaultMessage: 'External entry' }
      );
    case EntityType.host:
    default:
      return i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.explorer.attackPathKindHost',
        { defaultMessage: 'Host' }
      );
  }
};

const cardCss = (
  euiTheme: EuiThemeComputed,
  {
    ringColor,
    focusState,
    selected,
    width,
  }: { ringColor: string; focusState: string; selected: boolean; width: number }
) => css`
  width: ${width}px;
  border-radius: ${euiTheme.border.radius.medium};
  border: ${euiTheme.border.width.thick} solid ${ringColor};
  background: ${euiTheme.colors.backgroundBasePlain};
  box-shadow: ${selected ? euiTheme.shadows.l : euiTheme.shadows.s};
  padding: ${euiTheme.size.s};
  opacity: ${focusState === 'dimmed' ? 0.35 : 1};
  transition: opacity 150ms ease, box-shadow 150ms ease, transform 150ms ease;
  outline: ${selected ? `${euiTheme.border.width.thick} solid ${euiTheme.colors.primary}` : 'none'};
  outline-offset: 2px;
  &:hover {
    transform: translateY(-1px);
    box-shadow: ${euiTheme.shadows.m};
  }
`;

const iconBadgeCss = (euiTheme: EuiThemeComputed, color: string) => css`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${transparentize(color, 0.12)};
  border: ${euiTheme.border.width.thin} solid ${transparentize(color, 0.4)};
`;

const hiddenHandleCss = css`
  opacity: 0;
  pointer-events: none;
`;

/**
 * Premium spine node: circular semantic icon in a severity-tinted ring, entity
 * name + kind, an alert-count badge, and grounded findings docked as compact
 * severity-tinted chips (with a tooltip for the full text). Clicking is handled
 * by the canvas (React Flow `onNodeClick`).
 */
const EntityNodeInner: React.FC<NodeProps> = ({ data, selected }) => {
  const { euiTheme } = useEuiTheme();
  const nodeData = data as EntityNodeData;
  const { spine, stageLabel, findings, focusState } = nodeData;
  const isOrigin = spine.kind === 'origin';
  const ringColor =
    spine.worstSeverity && !isOrigin
      ? getAlertSeverityColor(euiTheme, spine.worstSeverity)
      : nodeKindColor(euiTheme, spine.kind);

  const shownFindings = findings.slice(0, 3);
  const extraFindings = findings.length - shownFindings.length;

  return (
    <div
      css={cardCss(euiTheme, {
        ringColor,
        focusState,
        selected: Boolean(selected),
        width: 220,
      })}
      data-test-subj={`entityIntelligenceAttackPathNode-${spine.name}`}
    >
      <Handle type="target" position={Position.Left} css={hiddenHandleCss} isConnectable={false} />
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <div css={iconBadgeCss(euiTheme, ringColor)}>
            <EuiIcon type={spineIcon(spine.kind)} size="m" color={ringColor} aria-hidden={true} />
          </div>
        </EuiFlexItem>
        <EuiFlexItem
          grow
          css={css`
            overflow: hidden;
          `}
        >
          <EuiToolTip content={spine.name} position="top">
            <EuiText
              tabIndex={0}
              size="s"
              css={css`
                font-weight: ${euiTheme.font.weight.semiBold};
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              `}
            >
              {spine.name}
            </EuiText>
          </EuiToolTip>
          <EuiText size="xs" color="subdued">
            {stageLabel ? `${kindLabel(spine.kind)} · ${stageLabel}` : kindLabel(spine.kind)}
          </EuiText>
        </EuiFlexItem>
        {spine.alertCount > 0 ? (
          <EuiFlexItem grow={false}>
            <EuiToolTip
              content={i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.explorer.attackPathNodeAlertCount',
                {
                  defaultMessage: '{count, plural, one {# alert} other {# alerts}} on this entity',
                  values: { count: spine.alertCount },
                }
              )}
            >
              <EuiBadge tabIndex={0} color={getAlertSeverityColor(euiTheme, spine.worstSeverity)}>
                {spine.alertCount > 99 ? '99+' : spine.alertCount}
              </EuiBadge>
            </EuiToolTip>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>

      {shownFindings.length > 0 ? (
        <EuiFlexGroup
          gutterSize="xs"
          direction="column"
          responsive={false}
          css={css`
            margin-top: ${euiTheme.size.s};
          `}
        >
          {shownFindings.map((finding) => {
            const color =
              finding.kind === 'alert'
                ? getAlertSeverityColor(euiTheme, finding.severity)
                : euiTheme.colors.primary;
            return (
              <EuiFlexItem key={finding.id} grow={false}>
                <EuiToolTip content={finding.text} position="bottom">
                  <div
                    tabIndex={0}
                    css={css`
                      display: flex;
                      align-items: center;
                      gap: ${euiTheme.size.xs};
                      padding: 2px ${euiTheme.size.xs};
                      border-radius: ${euiTheme.border.radius.small};
                      background: ${transparentize(color, 0.1)};
                      border-left: 3px solid ${color};
                    `}
                  >
                    <EuiIcon
                      type={finding.kind === 'alert' ? 'warning' : 'dot'}
                      size="s"
                      color={color}
                      aria-hidden={true}
                    />
                    <EuiText
                      size="xs"
                      css={css`
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                      `}
                    >
                      {finding.text}
                    </EuiText>
                  </div>
                </EuiToolTip>
              </EuiFlexItem>
            );
          })}
          {extraFindings > 0 ? (
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.explorer.attackPathMoreFindings',
                  {
                    defaultMessage:
                      '+{count, plural, one {# more finding} other {# more findings}}',
                    values: { count: extraFindings },
                  }
                )}
              </EuiText>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      ) : null}
      <Handle type="source" position={Position.Right} css={hiddenHandleCss} isConnectable={false} />
    </div>
  );
};

/**
 * Crown-jewel / resource leaf node: star/storage/globe icon in a severity ring,
 * the resource name (tooltip for full), the resource kind, and the grounded
 * "reached from" linkage.
 */
const ResourceNodeInner: React.FC<NodeProps> = ({ data, selected }) => {
  const { euiTheme } = useEuiTheme();
  const nodeData = data as ResourceNodeData;
  const { leaf, focusState } = nodeData;
  const ringColor = getAlertSeverityColor(euiTheme, leaf.severity);

  return (
    <div
      css={cardCss(euiTheme, {
        ringColor,
        focusState,
        selected: Boolean(selected),
        width: 190,
      })}
      data-test-subj="entityIntelligenceAttackPathJewel"
    >
      <Handle type="target" position={Position.Left} css={hiddenHandleCss} isConnectable={false} />
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <div css={iconBadgeCss(euiTheme, ringColor)}>
            <EuiIcon
              type={crownJewelIcon(leaf.kind)}
              size="m"
              color={ringColor}
              aria-hidden={true}
            />
          </div>
        </EuiFlexItem>
        <EuiFlexItem
          grow
          css={css`
            overflow: hidden;
          `}
        >
          <EuiToolTip content={leaf.name} position="top">
            <EuiText
              tabIndex={0}
              size="s"
              css={css`
                font-weight: ${euiTheme.font.weight.semiBold};
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              `}
            >
              {leaf.name}
            </EuiText>
          </EuiToolTip>
          <EuiText size="xs" color="subdued">
            {crownJewelLabel(leaf.kind)}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <Handle type="source" position={Position.Right} css={hiddenHandleCss} isConnectable={false} />
    </div>
  );
};

export const EntityNode = memo(EntityNodeInner);
export const ResourceNode = memo(ResourceNodeInner);

/** Central React Flow node-type registry (memoized identity in the canvas). */
export const attackPathNodeTypes: NodeTypes = {
  [ENTITY_NODE_TYPE]: EntityNode,
  [ORIGIN_NODE_TYPE]: EntityNode,
  [RESOURCE_NODE_TYPE]: ResourceNode,
};
