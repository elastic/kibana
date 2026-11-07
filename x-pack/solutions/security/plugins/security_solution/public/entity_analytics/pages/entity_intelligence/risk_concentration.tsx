/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiAccordion,
  EuiButtonEmpty,
  EuiIcon,
  EuiIconTip,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTitle,
  transparentize,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { EntityType } from '../../../../common/entity_analytics/types';
import type { IntelligenceEntity, RiskLevel } from './common';
import { getRiskLevelColor } from './common';
import type { EntityStoreStats } from './hooks/use_entity_store_stats';
import type {
  ConcentrationFilter,
  RiskConcentrationModel,
  RiskFlowLink,
  RiskFlowNode,
} from './overview_metrics';
import {
  buildRiskConcentrationModel,
  getMaterialRiskConcentration,
  layoutExposureColumn,
} from './overview_metrics';
import { edgeDraw } from './animations';

const MIN_CHART_WIDTH = 620;
const CHART_HEIGHT = 310;
const NODE_WIDTH = 10;
const NODE_GAP = 12;
/** Minimum rendered node height so single-entity nodes stay legible. */
const MIN_NODE_HEIGHT = 14;
/** Vertical gap separating band groups in the exposure (right) column. */
const EXPOSURE_GROUP_GAP = 30;
/** Horizontal room reserved for right-column labels (marker + name + score +
 * band suffix, e.g. "docker-host-… · 71 · Moderate"). */
const EXPOSURE_LABEL_WIDTH = 248;

const TYPE_LABELS: Record<EntityType, string> = {
  [EntityType.user]: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.overview.concentration.usersLabel',
    { defaultMessage: 'Users' }
  ),
  [EntityType.host]: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.overview.concentration.hostsLabel',
    { defaultMessage: 'Hosts' }
  ),
  [EntityType.service]: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.overview.concentration.servicesLabel',
    { defaultMessage: 'Services' }
  ),
  [EntityType.generic]: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.overview.concentration.otherTypeLabel',
    { defaultMessage: 'Other' }
  ),
};

const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  Critical: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.overview.concentration.criticalLabel',
    { defaultMessage: 'Critical' }
  ),
  High: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.overview.concentration.highLabel',
    { defaultMessage: 'High' }
  ),
  Moderate: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.overview.concentration.moderateLabel',
    { defaultMessage: 'Moderate' }
  ),
  Low: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.overview.concentration.lowLabel',
    { defaultMessage: 'Low' }
  ),
  Unknown: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.overview.concentration.unknownLabel',
    { defaultMessage: 'Unknown' }
  ),
};

interface PositionedNode {
  node: RiskFlowNode;
  x: number;
  y: number;
  height: number;
}

interface PositionedLink {
  link: RiskFlowLink;
  path: string;
  width: number;
}

interface FlowLayout {
  nodes: PositionedNode[];
  links: PositionedLink[];
}

const getNodeColumn = (node: RiskFlowNode): number => {
  if (node.kind === 'type') return 0;
  if (node.kind === 'level') return 1;
  return 2;
};

const layoutFlow = (model: RiskConcentrationModel, width: number, height: number): FlowLayout => {
  const columns = [0, 1, 2].map((column) =>
    model.nodes.filter((node) => getNodeColumn(node) === column)
  );
  // Gap budget per column: the exposure column reserves the wider inter-group
  // gap between band groups instead of the uniform node gap.
  const gapBudget = (column: RiskFlowNode[], columnIndex: number): number => {
    if (columnIndex !== 2) return (NODE_GAP + MIN_NODE_HEIGHT) * Math.max(0, column.length - 1);
    const groupCount = new Set(
      column.map((node) => (node.kind === 'type' ? undefined : node.level))
    ).size;
    return (
      NODE_GAP * Math.max(0, column.length - groupCount) +
      EXPOSURE_GROUP_GAP * Math.max(0, groupCount - 1) +
      MIN_NODE_HEIGHT * Math.max(0, column.length - 1)
    );
  };
  const scales = columns
    .map((column, columnIndex) => ({ column, columnIndex }))
    .filter(({ column }) => column.length > 0)
    .map(
      ({ column, columnIndex }) =>
        (height - gapBudget(column, columnIndex)) /
        Math.max(
          1,
          column.reduce((total, node) => total + node.count, 0)
        )
    );
  const scale = Math.max(0, Math.min(...scales));
  const columnX = [126, Math.round(width * 0.45), width - EXPOSURE_LABEL_WIDTH];
  const positionedNodes: PositionedNode[] = [];

  columns.slice(0, 2).forEach((column, columnIndex) => {
    const nodeHeights = column.map((node) => Math.max(MIN_NODE_HEIGHT, node.count * scale));
    const contentHeight =
      nodeHeights.reduce((total, nodeHeight) => total + nodeHeight, 0) +
      NODE_GAP * Math.max(0, column.length - 1);
    // Distribute leftover space between nodes so each column fills the chart
    // evenly instead of pooling at the vertical center.
    const leftover = Math.max(0, height - contentHeight);
    const extraGap = column.length > 1 ? leftover / (column.length + 1) : 0;
    let y = column.length > 1 ? extraGap : Math.max(0, leftover / 2);
    column.forEach((node, nodeIndex) => {
      positionedNodes.push({ node, x: columnX[columnIndex], y, height: nodeHeights[nodeIndex] });
      y += nodeHeights[nodeIndex] + NODE_GAP + extraGap;
    });
  });

  // Exposure column: anchor each band's named entities and tail node next to
  // their source band node so band membership is visually unambiguous.
  const bandAnchors = positionedNodes
    .filter(({ node }) => node.kind === 'level')
    .map(({ node, y, height: nodeHeight }) => ({
      level: (node as Extract<RiskFlowNode, { kind: 'level' }>).level,
      y,
      height: nodeHeight,
    }));
  const exposureItems = columns[2].flatMap((node) =>
    node.kind === 'type'
      ? []
      : [{ id: node.id, level: node.level, height: Math.max(MIN_NODE_HEIGHT, node.count * scale) }]
  );
  const exposurePositions = new Map(
    layoutExposureColumn(bandAnchors, exposureItems, {
      itemGap: NODE_GAP,
      groupGap: EXPOSURE_GROUP_GAP,
      chartHeight: height,
    }).map(({ id, y }) => [id, y])
  );
  columns[2].forEach((node) => {
    const y = exposurePositions.get(node.id);
    if (y === undefined) return;
    positionedNodes.push({
      node,
      x: columnX[2],
      y,
      height: Math.max(MIN_NODE_HEIGHT, node.count * scale),
    });
  });

  const nodeById = new Map(positionedNodes.map((node) => [node.node.id, node]));
  const sourceCenters = new Map<string, number>();
  const targetCenters = new Map<string, number>();

  // Anchor links proportionally within each node's rendered height so flows
  // stay attached to their node even when heights are clamped to the minimum.
  for (const positionedNode of positionedNodes) {
    const nodeCount = Math.max(1, positionedNode.node.count);
    const unit = positionedNode.height / nodeCount;

    const outgoing = model.links
      .filter((link) => link.source === positionedNode.node.id)
      .sort(
        (left, right) => (nodeById.get(left.target)?.y ?? 0) - (nodeById.get(right.target)?.y ?? 0)
      );
    let offset = positionedNode.y;
    for (const link of outgoing) {
      sourceCenters.set(link.id, offset + (link.count * unit) / 2);
      offset += link.count * unit;
    }

    const incoming = model.links
      .filter((link) => link.target === positionedNode.node.id)
      .sort(
        (left, right) => (nodeById.get(left.source)?.y ?? 0) - (nodeById.get(right.source)?.y ?? 0)
      );
    offset = positionedNode.y;
    for (const link of incoming) {
      targetCenters.set(link.id, offset + (link.count * unit) / 2);
      offset += link.count * unit;
    }
  }

  const positionedLinks = model.links.flatMap<PositionedLink>((link) => {
    const source = nodeById.get(link.source);
    const target = nodeById.get(link.target);
    const sourceY = sourceCenters.get(link.id);
    const targetY = targetCenters.get(link.id);
    if (!source || !target || sourceY === undefined || targetY === undefined) return [];
    const sourceX = source.x + NODE_WIDTH;
    const targetX = target.x;
    const controlX = sourceX + (targetX - sourceX) * 0.5;
    return [
      {
        link,
        path: `M ${sourceX} ${sourceY} C ${controlX} ${sourceY}, ${controlX} ${targetY}, ${targetX} ${targetY}`,
        width: Math.max(1.5, link.count * scale),
      },
    ];
  });

  return { nodes: positionedNodes, links: positionedLinks };
};

const useContainerWidth = (containerRef: React.RefObject<HTMLElement>): number => {
  const [width, setWidth] = useState(MIN_CHART_WIDTH);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const updateWidth = () => setWidth(Math.round(element.getBoundingClientRect().width));
    updateWidth();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);
    return () => observer.disconnect();
  }, [containerRef]);

  return width;
};

const isSameFilter = (left: ConcentrationFilter | undefined, right: ConcentrationFilter): boolean =>
  left?.kind === right.kind && left.value === right.value;

const filterMatchesLink = (
  filter: ConcentrationFilter | undefined,
  link: RiskFlowLink
): boolean => {
  if (!filter) return true;
  return filter.kind === 'type' ? link.type === filter.value : link.level === filter.value;
};

const nodeMatchesLink = (node: RiskFlowNode | undefined, link: RiskFlowLink): boolean => {
  if (!node) return true;
  if (node.kind === 'type') return link.type === node.type;
  if (node.kind === 'level' || node.kind === 'other') return link.level === node.level;
  return (
    link.entityId === node.entity.id ||
    (link.type === node.type && link.level === node.level && link.source.startsWith('type:'))
  );
};

const getNodeFilter = (node: RiskFlowNode): ConcentrationFilter | undefined => {
  if (node.kind === 'type') return { kind: 'type', value: node.type };
  if (node.kind === 'level' || node.kind === 'other') {
    return { kind: 'level', value: node.level };
  }
  return undefined;
};

const getNodeDisplayLabel = (node: RiskFlowNode): string => {
  if (node.kind === 'type') return TYPE_LABELS[node.type];
  if (node.kind === 'level') return RISK_LEVEL_LABELS[node.level];
  if (node.kind === 'other') {
    return i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.overview.concentration.bandTailLabel',
      {
        defaultMessage: '+{count} {level}',
        values: { count: node.count, level: RISK_LEVEL_LABELS[node.level].toLowerCase() },
      }
    );
  }
  return node.entity.name;
};

const getNodeAriaLabel = (node: RiskFlowNode): string =>
  i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.overview.concentration.nodeAriaLabel',
    {
      defaultMessage: '{label}, {count, plural, one {# entity} other {# entities}}',
      values: { label: getNodeDisplayLabel(node), count: node.count },
    }
  );

const truncateLabel = (value: string, maxLength: number): string =>
  value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;

const AccessibleFlowTable: React.FC<{
  model: RiskConcentrationModel;
}> = ({ model }) => {
  const { euiTheme } = useEuiTheme();
  const accordionId = useGeneratedHtmlId({ prefix: 'entityRiskConcentrationData' });
  const tableStyle = css`
    width: 100%;
    border-collapse: collapse;
    font-size: ${euiTheme.size.m};

    th,
    td {
      padding: ${euiTheme.size.xs} ${euiTheme.size.s};
      text-align: left;
      border-bottom: ${euiTheme.border.thin};
    }

    th:last-child,
    td:last-child {
      text-align: right;
    }
  `;
  const rows = model.links.filter(({ source }) => source.startsWith('type:'));

  return (
    <EuiAccordion
      id={accordionId}
      buttonContent={i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.overview.concentration.dataTableButtonLabel',
        { defaultMessage: 'View risk concentration data' }
      )}
      buttonProps={{ paddingSize: 's' }}
      paddingSize="s"
    >
      <table css={tableStyle}>
        <thead>
          <tr>
            <th>
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.overview.concentration.typeTableHeader',
                { defaultMessage: 'Entity type' }
              )}
            </th>
            <th>
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.overview.concentration.bandTableHeader',
                { defaultMessage: 'Risk band' }
              )}
            </th>
            <th>
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.overview.concentration.countTableHeader',
                { defaultMessage: 'Entities' }
              )}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((link) => (
            <tr key={link.id}>
              <td>{link.type ? TYPE_LABELS[link.type] : '—'}</td>
              <td>{RISK_LEVEL_LABELS[link.level]}</td>
              <td>{link.count.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </EuiAccordion>
  );
};

const ConcentrationFallback: React.FC<{
  model: RiskConcentrationModel;
  filter: ConcentrationFilter | undefined;
  onFilterChange: (filter: ConcentrationFilter | undefined) => void;
}> = ({ model, filter, onFilterChange }) => {
  const { euiTheme } = useEuiTheme();
  const typeNodes = model.nodes.filter(
    (node): node is Extract<RiskFlowNode, { kind: 'type' }> => node.kind === 'type'
  );
  const levelNodes = model.nodes.filter(
    (node): node is Extract<RiskFlowNode, { kind: 'level' }> => node.kind === 'level'
  );
  const rows: RiskFlowNode[] = typeNodes.length >= 2 ? typeNodes : levelNodes;
  const maxCount = Math.max(1, ...rows.map(({ count }) => count));

  const rowStyle = css`
    display: grid;
    grid-template-columns: minmax(100px, 150px) minmax(120px, 1fr) auto;
    align-items: center;
    gap: ${euiTheme.size.m};
    width: 100%;
    padding: ${euiTheme.size.s} 0;
    border: 0;
    border-bottom: ${euiTheme.border.thin};
    color: ${euiTheme.colors.textParagraph};
    background: transparent;
    text-align: left;
    cursor: pointer;

    &:focus-visible {
      outline: 2px solid ${euiTheme.colors.primary};
      outline-offset: 2px;
    }
  `;

  return (
    <div data-test-subj="entityIntelligenceConcentrationFallback">
      {rows.map((node) => {
        const nodeFilter = getNodeFilter(node);
        const isSelected = nodeFilter && isSameFilter(filter, nodeFilter);
        const color =
          node.kind === 'level' ? getRiskLevelColor(euiTheme, node.level) : euiTheme.colors.primary;
        return (
          <button
            key={node.id}
            type="button"
            css={rowStyle}
            onClick={() => nodeFilter && onFilterChange(isSelected ? undefined : nodeFilter)}
            aria-pressed={isSelected}
          >
            <span>{getNodeDisplayLabel(node)}</span>
            <span
              css={css`
                display: block;
                height: ${euiTheme.size.s};
                border-radius: ${euiTheme.border.radius.small};
                background: ${euiTheme.colors.lightestShade};
                overflow: hidden;
              `}
            >
              <span
                css={css`
                  display: block;
                  width: ${(node.count / maxCount) * 100}%;
                  height: 100%;
                  background: ${color};
                `}
              />
            </span>
            <strong>{node.count.toLocaleString()}</strong>
          </button>
        );
      })}
    </div>
  );
};

export interface RiskConcentrationProps {
  stats: EntityStoreStats | undefined;
  entities: readonly IntelligenceEntity[];
  isLoading: boolean;
  filter: ConcentrationFilter | undefined;
  onFilterChange: (filter: ConcentrationFilter | undefined) => void;
  onSelectEntity: (entity: IntelligenceEntity) => void;
}

export const RiskConcentration: React.FC<RiskConcentrationProps> = ({
  stats,
  entities,
  isLoading,
  filter,
  onFilterChange,
  onSelectEntity,
}) => {
  const { euiTheme } = useEuiTheme();
  const containerRef = useRef<HTMLElement>(null);
  const measuredWidth = useContainerWidth(containerRef);
  const model = useMemo(() => buildRiskConcentrationModel(stats, entities), [entities, stats]);
  const concentration = useMemo(() => getMaterialRiskConcentration(stats), [stats]);
  const [focusedNodeId, setFocusedNodeId] = useState<string | undefined>();
  const focusedNode = model.nodes.find(({ id }) => id === focusedNodeId);
  const renderWidth = Math.max(MIN_CHART_WIDTH, measuredWidth);
  const layout = useMemo(() => layoutFlow(model, renderWidth, CHART_HEIGHT), [model, renderWidth]);

  const sectionStyle = css`
    min-width: 0;
    padding: ${euiTheme.size.l};
    border-radius: ${euiTheme.border.radius.medium};
    background: linear-gradient(
      145deg,
      ${transparentize(euiTheme.colors.primary, 0.035)},
      ${euiTheme.colors.emptyShade} 52%
    );
  `;
  const headerStyle = css`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: ${euiTheme.size.m};
  `;
  const titleStyle = css`
    display: flex;
    align-items: center;
    gap: ${euiTheme.size.s};
  `;
  const chartStyle = css`
    width: 100%;
    overflow: hidden;
  `;
  const hintStyle = css`
    display: flex;
    align-items: center;
    min-height: ${euiTheme.size.l};
    gap: ${euiTheme.size.xs};
    color: ${euiTheme.colors.textSubdued};
    font-size: ${euiTheme.size.m};
  `;

  const focusedPercentage =
    focusedNode && model.totalCount > 0 ? (focusedNode.count / model.totalCount) * 100 : 0;
  const activeNode = focusedNode;

  const activateNode = (node: RiskFlowNode): void => {
    if (node.kind === 'entity') {
      onSelectEntity(node.entity);
      return;
    }
    const nextFilter = getNodeFilter(node);
    if (nextFilter) onFilterChange(isSameFilter(filter, nextFilter) ? undefined : nextFilter);
  };

  return (
    <section
      ref={containerRef}
      css={sectionStyle}
      data-test-subj="entityIntelligenceRiskConcentration"
    >
      <div css={headerStyle}>
        <div>
          <div css={titleStyle}>
            <EuiTitle size="xs">
              <h2>
                {i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.overview.concentration.title',
                  { defaultMessage: 'Where risk is concentrated' }
                )}
              </h2>
            </EuiTitle>
            <EuiIconTip
              type="info"
              content={i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.overview.concentration.semanticsTooltip',
                {
                  defaultMessage:
                    'Every flow width represents an entity count. Each named entity contributes one unit; its normalized risk score is shown only as a label. Remaining entities are grouped by risk band. Unknown or unscored entities are omitted.',
                }
              )}
            />
          </div>
          <EuiSpacer size="xs" />
          <EuiText size="s" color="subdued">
            <p>
              {concentration
                ? i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.overview.concentration.narrativeDescription',
                    {
                      defaultMessage:
                        '{concentrated} of {total, plural, one {# material-risk entity} other {# material-risk entities}} {concentrated, plural, one {is} other {are}} {type}.',
                      values: {
                        concentrated: concentration.count,
                        total: concentration.total,
                        type: TYPE_LABELS[concentration.type].toLowerCase(),
                      },
                    }
                  )
                : i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.overview.concentration.noMaterialRiskDescription',
                    {
                      defaultMessage:
                        'No high or critical entity risk is present in the current snapshot.',
                    }
                  )}
            </p>
          </EuiText>
        </div>
        {filter ? (
          <EuiButtonEmpty size="xs" iconType="cross" onClick={() => onFilterChange(undefined)}>
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.overview.concentration.clearFilterButtonLabel',
              { defaultMessage: 'Clear filter' }
            )}
          </EuiButtonEmpty>
        ) : null}
      </div>

      <EuiSpacer size="m" />
      {isLoading ? (
        <EuiSkeletonText lines={7} />
      ) : model.totalCount === 0 ? (
        <div css={hintStyle}>
          <EuiIcon type="checkCircleFill" color="success" size="s" aria-hidden={true} />
          {i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.overview.concentration.noScoredRiskDescription',
            { defaultMessage: 'No scored entities are available for risk concentration yet.' }
          )}
        </div>
      ) : model.isSparse || measuredWidth < MIN_CHART_WIDTH ? (
        <ConcentrationFallback model={model} filter={filter} onFilterChange={onFilterChange} />
      ) : (
        <>
          <div css={hintStyle} aria-live="polite">
            {activeNode ? (
              <EuiIcon type="inspect" color="primary" size="s" aria-hidden={true} />
            ) : null}
            {activeNode
              ? i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.overview.concentration.hoverDetailDescription',
                  {
                    defaultMessage:
                      '{label}: {count, plural, one {# entity} other {# entities}}, {percentage}% of entities in this view{average}{topEntity}.',
                    values: {
                      label: getNodeDisplayLabel(activeNode),
                      count: activeNode.count,
                      percentage: Math.round(focusedPercentage),
                      average:
                        activeNode.avgRisk === undefined
                          ? ''
                          : i18n.translate(
                              'xpack.securitySolution.entityAnalytics.intelligence.overview.concentration.averageRiskDetail',
                              {
                                defaultMessage: ', average risk {average}',
                                values: { average: activeNode.avgRisk.toFixed(1) },
                              }
                            ),
                      topEntity:
                        activeNode.topEntityName === undefined
                          ? ''
                          : i18n.translate(
                              'xpack.securitySolution.entityAnalytics.intelligence.overview.concentration.topEntityDetail',
                              {
                                defaultMessage: ', top entity {name}',
                                values: { name: activeNode.topEntityName },
                              }
                            ),
                    },
                  }
                )
              : i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.overview.concentration.interactionHintDescription',
                  {
                    defaultMessage:
                      'Select an entity type or risk band to focus the view. Select an entity to investigate.',
                  }
                )}
          </div>
          <div css={chartStyle}>
            <svg
              width="100%"
              height={CHART_HEIGHT}
              viewBox={`0 0 ${renderWidth} ${CHART_HEIGHT}`}
              role="group"
              aria-label={i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.overview.concentration.chartAriaLabel',
                {
                  defaultMessage:
                    'Entity risk flows from entity type through risk band to the highest exposed entities.',
                }
              )}
            >
              {layout.links.map(({ link, path, width }) => {
                const selected = filterMatchesLink(filter, link);
                const focused = nodeMatchesLink(focusedNode, link);
                const isDimmed = !selected || !focused;
                return (
                  <path
                    key={link.id}
                    d={path}
                    fill="none"
                    stroke={getRiskLevelColor(euiTheme, link.level)}
                    strokeWidth={width}
                    strokeOpacity={isDimmed ? 0.08 : 0.42}
                    css={edgeDraw}
                    style={{ '--edge-length': 420 } as React.CSSProperties}
                  />
                );
              })}
              {layout.nodes.map(({ node, x, y, height }) => {
                const color =
                  node.kind === 'type'
                    ? euiTheme.colors.primary
                    : getRiskLevelColor(euiTheme, node.level);
                const isEntity = node.kind === 'entity';
                const isType = node.kind === 'type';
                const isOther = node.kind === 'other';
                // Exposure-column rows (named entities + per-band tails) carry an
                // explicit band-colored marker so membership is legible without
                // tracing the flow back to the band node.
                const hasBandMarker = isEntity || isOther;
                const label = getNodeDisplayLabel(node);
                const bandName = node.kind === 'type' ? undefined : RISK_LEVEL_LABELS[node.level];
                // Entities show their score, then the band name so each row reads
                // e.g. "docker-host-… · 71 · High"; tails already carry the band.
                const scoreSuffix = isOther
                  ? ''
                  : isEntity
                  ? node.entity.riskScoreNorm !== undefined
                    ? ` · ${Math.round(node.entity.riskScoreNorm)} · ${bandName}`
                    : ` · ${bandName}`
                  : ` · ${node.count.toLocaleString()}`;
                const markerRadius = 3.5;
                const markerX = x + NODE_WIDTH + 8 + markerRadius;
                const labelX = isType
                  ? x - 8
                  : x + NODE_WIDTH + 8 + (hasBandMarker ? markerRadius * 2 + 6 : 0);
                return (
                  <g
                    key={node.id}
                    role="button"
                    tabIndex={0}
                    aria-label={getNodeAriaLabel(node)}
                    onMouseEnter={() => setFocusedNodeId(node.id)}
                    onMouseLeave={() => setFocusedNodeId(undefined)}
                    onFocus={() => setFocusedNodeId(node.id)}
                    onBlur={() => setFocusedNodeId(undefined)}
                    onClick={() => activateNode(node)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        activateNode(node);
                      }
                    }}
                    css={css`
                      cursor: pointer;

                      &:focus {
                        outline: none;
                      }

                      &:focus-visible rect:last-of-type {
                        stroke: ${euiTheme.colors.textHeading};
                        stroke-width: 2;
                      }
                    `}
                  >
                    <title>{getNodeAriaLabel(node)}</title>
                    <rect
                      x={x - 5}
                      y={Math.max(0, y - 4)}
                      width={NODE_WIDTH + 10}
                      height={Math.max(12, height + 8)}
                      fill="transparent"
                    />
                    <rect
                      x={x}
                      y={y}
                      width={NODE_WIDTH}
                      height={Math.max(1.5, height)}
                      rx={NODE_WIDTH / 2}
                      fill={color}
                    />
                    {hasBandMarker ? (
                      <circle
                        cx={markerX}
                        cy={y + Math.max(10, height / 2 + 4) - 4}
                        r={markerRadius}
                        fill={color}
                        stroke={euiTheme.colors.emptyShade}
                        strokeWidth={1}
                      />
                    ) : null}
                    <text
                      x={labelX}
                      y={y + Math.max(10, height / 2 + 4)}
                      textAnchor={isType ? 'end' : 'start'}
                      fill={euiTheme.colors.textParagraph}
                      fontSize={12}
                      fontWeight={
                        isEntity ? euiTheme.font.weight.medium : euiTheme.font.weight.semiBold
                      }
                    >
                      {truncateLabel(label, isEntity ? 14 : 16)}
                      <tspan
                        fill={euiTheme.colors.textSubdued}
                        fontWeight={euiTheme.font.weight.regular}
                      >
                        {scoreSuffix}
                      </tspan>
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </>
      )}

      {model.totalCount > 0 ? (
        <>
          <EuiSpacer size="s" />
          <AccessibleFlowTable model={model} />
        </>
      ) : null}
    </section>
  );
};
