/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo, useMemo } from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSkeletonText,
  EuiText,
  useEuiTheme,
  type IconType,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import type {
  NodeDataModel,
  EdgeDataModel,
} from '@kbn/cloud-security-posture-common/types/graph/latest';
import {
  GRAPH_BACKGROUND_COLOR,
  GRAPH_BACKGROUND_DOT_COLOR,
  GRAPH_BACKGROUND_DOT_GAP,
  GRAPH_BACKGROUND_DOT_SIZE,
} from '@kbn/cloud-security-posture-graph/src/components/constants';
import groupEntitiesIcon from '@kbn/cloud-security-posture-graph/src/assets/icons/group_entities.svg';
import { GRAPH_PREVIEW_TEST_ID, GRAPH_PREVIEW_LOADING_TEST_ID } from './test_ids';

/** Resolved stacked-cards SVG — EuiIcon cannot resolve the bare `group_entities` name. */
const GROUP_ENTITIES_ICON = groupEntitiesIcon;

const ENTITY_SHAPES = new Set(['hexagon', 'pentagon', 'ellipse', 'rectangle', 'diamond']);

/** Preview card radius — match Figma entity cards (~8px). */
const NODE_PILL_BORDER_RADIUS = 8;
const NODE_ICON_BORDER_RADIUS = 6;
/** Match Figma preview entity card icon (24px glyph). */
const NODE_ICON_SIZE = 24;
/** Match Figma card padding (8px). */
const NODE_PILL_PADDING = 8;
const PREVIEW_CANVAS_PADDING = 16;
const PREVIEW_CANVAS_MIN_HEIGHT = 200;
const RISK_BADGE_HEIGHT = 20;
const RISK_BADGE_PADDING_X = 8;
/**
 * Min content width for a risk badge showing `98.72` or `Unknown` (12px medium + horizontal padding).
 * Cards must never shrink below icon + gap + this, or the badge is clipped.
 */
const RISK_BADGE_MIN_CONTENT_WIDTH = 56;
const NODE_ICON_BOX_SIZE = NODE_ICON_SIZE + 8;
const NODE_ICON_TO_TEXT_GAP = 8;

/**
 * Floor width for preview entity cards so the risk badge never clips.
 * icon box + gap + badge + horizontal padding.
 */
const PREVIEW_CARD_MIN_WIDTH =
  NODE_PILL_PADDING * 2 + NODE_ICON_BOX_SIZE + NODE_ICON_TO_TEXT_GAP + RISK_BADGE_MIN_CONTENT_WIDTH;
/** Wide enough for group titles + dual risk pills (`90.01 - 50.00`). */
const PREVIEW_CARD_MAX_WIDTH = 180;
const GROUP_STACK_GAP = 12;
const CONNECTOR_GAP = 8;
const FANOUT_WIDTH = 28;
const ARROW_SIZE = 5;
/** Relationships trunk floor — keep “8 rela…” readable next to cards. */
const RELATIONSHIPS_TRUNK_MIN_WIDTH = 72;

interface PreviewEntityNode {
  id: string;
  label?: string;
  icon?: string;
  tag?: string;
  color?: string;
  count?: number;
  riskScore?: number;
  riskScoreMin?: number;
  riskScoreMax?: number;
}

type PreviewRiskLevel = 'critical' | 'high' | 'moderate' | 'low' | 'unknown';

interface RiskGroup {
  level: PreviewRiskLevel;
  count: number;
  /** Representative score shown on the badge (max in the group). */
  riskScore: number;
  riskScoreMin?: number;
  riskScoreMax?: number;
  icon?: string;
  label?: string;
}

const RISK_LEVEL_ORDER: PreviewRiskLevel[] = ['critical', 'high', 'moderate', 'low', 'unknown'];

const stripEntityPrefix = (id: string): string => id.replace(/^(user|host|service):/i, '');

const entityIdsMatch = (a: string, b: string): boolean => {
  const left = a.trim();
  const right = b.trim();
  if (!left || !right) return false;
  return (
    left === right ||
    stripEntityPrefix(left) === stripEntityPrefix(right) ||
    left === stripEntityPrefix(right) ||
    stripEntityPrefix(left) === right
  );
};

/**
 * Pick the graph origin entity for the left preview card.
 * `extractEdges` reverses node order, so `nodes[0]` is often NOT the origin.
 */
const pickMainEntityNode = (
  entityNodes: PreviewEntityNode[],
  edges: EdgeDataModel[],
  originEntityId?: string
): PreviewEntityNode | null => {
  if (entityNodes.length === 0) return null;

  if (originEntityId) {
    const byId = entityNodes.find((node) => entityIdsMatch(node.id, originEntityId));
    if (byId) return byId;
    const byLabel = entityNodes.find(
      (node) => node.label != null && entityIdsMatch(node.label, originEntityId)
    );
    if (byLabel) return byLabel;
  }

  const outbound = new Map<string, number>();
  edges.forEach((edge) => {
    const source = (edge as { source?: string }).source;
    if (!source) return;
    outbound.set(source, (outbound.get(source) ?? 0) + 1);
  });

  return entityNodes.reduce((best, node) => {
    const score = outbound.get(node.id) ?? 0;
    const bestScore = outbound.get(best.id) ?? 0;
    return score > bestScore ? node : best;
  });
};

const isEntityNode = (node: NodeDataModel): boolean =>
  ENTITY_SHAPES.has((node as { shape?: string }).shape ?? '');

const getPreviewRiskLevel = (score?: number): PreviewRiskLevel => {
  if (score === undefined) return 'unknown';
  if (score >= 90) return 'critical';
  if (score >= 70) return 'high';
  if (score >= 40) return 'moderate';
  if (score >= 20) return 'low';
  return 'unknown';
};

const resolveNodeRiskScore = (node: PreviewEntityNode): number | undefined =>
  node.riskScore ?? node.riskScoreMax ?? node.riskScoreMin;

/**
 * Preview risk badge tones — light severity fill + accent text (Figma Graph preview).
 * Icon on the card stays neutral; only the badge uses these colors.
 */
const getPreviewRiskTone = (
  level: PreviewRiskLevel,
  colors: {
    backgroundLightDanger: string;
    backgroundLightRisk: string;
    backgroundLightWarning: string;
    backgroundLightNeutral: string;
    backgroundLightText: string;
    textDanger: string;
    textRisk: string;
    textWarning: string;
    textNeutral: string;
    textParagraph: string;
  }
) => {
  switch (level) {
    case 'critical':
      return { badgeBg: colors.backgroundLightDanger, badgeText: colors.textDanger };
    case 'high':
      return { badgeBg: colors.backgroundLightRisk, badgeText: colors.textRisk };
    case 'moderate':
      return { badgeBg: colors.backgroundLightWarning, badgeText: colors.textWarning };
    case 'low':
      return { badgeBg: colors.backgroundLightNeutral, badgeText: colors.textNeutral };
    case 'unknown':
    default:
      return { badgeBg: colors.backgroundLightText, badgeText: colors.textParagraph };
  }
};

/** Group neighbor entities by Entity Analytics risk bands; badge shows the max score in the band. */
const groupNeighborsByRisk = (neighbors: PreviewEntityNode[]): RiskGroup[] => {
  const buckets = new Map<PreviewRiskLevel, { count: number; riskScore: number; icon?: string }>();

  neighbors.forEach((neighbor) => {
    const score = resolveNodeRiskScore(neighbor);
    const level = getPreviewRiskLevel(score);
    const existing = buckets.get(level);
    if (!existing) {
      buckets.set(level, {
        count: 1,
        riskScore: score ?? 0,
        icon: neighbor.icon,
      });
      return;
    }
    existing.count += 1;
    if (score !== undefined) {
      existing.riskScore = Math.max(existing.riskScore, score);
    }
    if (!existing.icon && neighbor.icon) {
      existing.icon = neighbor.icon;
    }
  });

  return RISK_LEVEL_ORDER.flatMap((level) => {
    const bucket = buckets.get(level);
    if (!bucket) return [];
    return [
      {
        level,
        count: bucket.count,
        riskScore: bucket.riskScore,
        icon: bucket.icon,
      },
    ];
  });
};

/**
 * Prefer API group nodes (count > 1) as distinct preview cards — keeps subtype grouping.
 * Fall back to risk-band aggregation for single-entity neighbors.
 */
const groupNeighborsForPreview = (neighbors: PreviewEntityNode[]): RiskGroup[] => {
  const apiGroups: RiskGroup[] = [];
  const singles: PreviewEntityNode[] = [];

  neighbors.forEach((neighbor) => {
    if ((neighbor.count ?? 0) > 1) {
      const score = resolveNodeRiskScore(neighbor);
      apiGroups.push({
        level: getPreviewRiskLevel(score),
        count: neighbor.count!,
        riskScore: score ?? 0,
        riskScoreMin: neighbor.riskScoreMin,
        riskScoreMax: neighbor.riskScoreMax,
        icon: GROUP_ENTITIES_ICON,
        label: neighbor.label,
      });
      return;
    }
    singles.push(neighbor);
  });

  const combined = [...apiGroups, ...groupNeighborsByRisk(singles)];
  return RISK_LEVEL_ORDER.flatMap((level) => combined.filter((group) => group.level === level));
};

/**
 * Props for the GraphPreview component.
 */
export interface GraphPreviewProps {
  /**
   * Indicates whether the graph is currently loading.
   */
  isLoading: boolean;

  /**
   * Indicates whether there was an error loading the graph.
   */
  isError: boolean;

  /**
   * Optional data for the graph, including nodes and edges.
   */
  data?: {
    nodes: NodeDataModel[];
    edges: EdgeDataModel[];
  };

  /**
   * Entity that opened the flyout / centered the graph (`entity.id` or name).
   * Used so the left preview card matches the origin (icon + risk badge).
   */
  originEntityId?: string;

  /**
   * Flyout Entity risk (`calculated_score_norm`).
   * - `number` → origin badge uses this score (must match flyout)
   * - `null` → Unknown — show Unknown badge (do not use mock Critical)
   * - `undefined` → fall back to graph node riskScore
   */
  originRiskScore?: number | null;
}

const LoadingComponent = () => (
  <EuiSkeletonText
    data-test-subj={GRAPH_PREVIEW_LOADING_TEST_ID}
    contentAriaLabel={i18n.translate(
      'xpack.securitySolution.flyout.right.visualizations.graphPreview.loadingAriaLabel',
      {
        defaultMessage: 'graph preview',
      }
    )}
  />
);

interface PreviewRiskBadgeProps {
  score: number;
}

/**
 * Compact risk score pill — hug content (never stretch full card width).
 * Light severity fill + accent text, matching Figma Graph preview cards.
 */
const PreviewRiskBadge = ({ score }: PreviewRiskBadgeProps) => {
  const { euiTheme } = useEuiTheme();
  const tone = getPreviewRiskTone(getPreviewRiskLevel(score), euiTheme.colors);

  return (
    <EuiBadge
      color="hollow"
      data-test-subj="graph-preview-risk-badge"
      css={css`
        display: inline-flex !important;
        width: fit-content !important;
        max-width: max-content;
        align-items: center;
        justify-content: center;
        flex: 0 0 auto;
        align-self: flex-start;
        height: ${RISK_BADGE_HEIGHT}px;
        padding: 0 ${RISK_BADGE_PADDING_X}px;
        background-color: ${tone.badgeBg};
        color: ${tone.badgeText};
        border: none;
        border-radius: 999px;
        font-weight: ${euiTheme.font.weight.medium};
        font-size: 12px;
        line-height: ${euiTheme.size.base};
      `}
    >
      {score.toFixed(2)}
    </EuiBadge>
  );
};

/** Matches flyout Entity risk when level is Unknown. */
const PreviewUnknownRiskBadge = () => {
  const { euiTheme } = useEuiTheme();
  const tone = getPreviewRiskTone('unknown', euiTheme.colors);
  const label = i18n.translate(
    'xpack.securitySolution.flyout.right.visualizations.graphPreview.unknownRisk',
    { defaultMessage: 'Unknown' }
  );

  return (
    <EuiBadge
      color="hollow"
      data-test-subj="graph-preview-risk-badge"
      css={css`
        display: inline-flex !important;
        width: fit-content !important;
        max-width: max-content;
        align-items: center;
        justify-content: center;
        flex: 0 0 auto;
        align-self: flex-start;
        height: ${RISK_BADGE_HEIGHT}px;
        padding: 0 ${RISK_BADGE_PADDING_X}px;
        background-color: ${tone.badgeBg};
        color: ${tone.badgeText};
        border: none;
        border-radius: 999px;
        font-weight: ${euiTheme.font.weight.medium};
        font-size: 12px;
        line-height: ${euiTheme.size.base};
      `}
    >
      {label}
    </EuiBadge>
  );
};

interface NodeCardProps {
  label: string;
  icon?: IconType;
  riskScore?: number;
  riskScoreMin?: number;
  riskScoreMax?: number;
  /** When true, show Unknown badge instead of a numeric risk score. */
  riskUnknown?: boolean;
  isGroup?: boolean;
  count?: number;
  entityTypeLabel?: string;
}

/**
 * Preview entity card — same structure as expanded graph CardNode (Figma):
 * Single: [icon] name / Hosts …… [risk]
 * Group:  [icon] [count] title / Hosts …… [max] - [min] + stack
 */
const NodeCard = ({
  label,
  icon,
  riskScore,
  riskScoreMin,
  riskScoreMax,
  riskUnknown = false,
  isGroup = false,
  count,
  entityTypeLabel = 'Hosts',
}: NodeCardProps) => {
  const { euiTheme } = useEuiTheme();
  const fillColor = euiTheme.colors.backgroundBasePlain;
  const borderColor = euiTheme.colors.borderBasePlain;
  const iconBg = euiTheme.colors.backgroundBaseSubdued;
  const iconColor = '#000000';

  const riskRangeHigh =
    riskScoreMin !== undefined && riskScoreMax !== undefined
      ? Math.max(riskScoreMin, riskScoreMax)
      : undefined;
  const riskRangeLow =
    riskScoreMin !== undefined && riskScoreMax !== undefined
      ? Math.min(riskScoreMin, riskScoreMax)
      : undefined;

  const riskBadges = riskUnknown ? (
    <PreviewUnknownRiskBadge />
  ) : riskRangeHigh !== undefined && riskRangeLow !== undefined ? (
    <div
      css={css`
        display: flex;
        flex-shrink: 0;
        align-items: center;
        gap: 4px;
      `}
    >
      <PreviewRiskBadge score={riskRangeHigh} />
      <EuiText
        size="xs"
        css={css`
          color: ${euiTheme.colors.textParagraph};
          line-height: ${euiTheme.size.base};
        `}
      >
        {'-'}
      </EuiText>
      <PreviewRiskBadge score={riskRangeLow} />
    </div>
  ) : riskScore !== undefined ? (
    <PreviewRiskBadge score={riskScore} />
  ) : null;

  return (
    <div
      css={css`
        position: relative;
        width: 100%;
        min-width: ${PREVIEW_CARD_MIN_WIDTH}px;
        max-width: ${PREVIEW_CARD_MAX_WIDTH}px;
        flex-shrink: 0;
        margin-bottom: ${isGroup ? 6 : 0}px;
      `}
    >
      {isGroup && (
        <div
          aria-hidden={true}
          css={css`
            position: absolute;
            left: 8px;
            right: 8px;
            bottom: -4px;
            height: 5px;
            border-left: 1px solid ${borderColor};
            border-right: 1px solid ${borderColor};
            border-bottom: 1px solid ${borderColor};
            border-radius: 0 0 ${NODE_PILL_BORDER_RADIUS}px ${NODE_PILL_BORDER_RADIUS}px;
            background: ${fillColor};
            opacity: 0.72;
            z-index: 0;
          `}
        />
      )}
      <div
        css={css`
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: ${NODE_ICON_TO_TEXT_GAP}px;
          box-sizing: border-box;
          width: 100%;
          min-width: 0;
          border: 1px solid ${borderColor};
          border-radius: ${NODE_PILL_BORDER_RADIUS}px;
          padding: ${NODE_PILL_PADDING}px;
          background: ${fillColor};
          box-shadow: 0 1px 2px 0 rgba(7, 16, 31, 0.06);
        `}
      >
        {icon && (
          <div
            css={css`
              width: ${NODE_ICON_BOX_SIZE}px;
              height: ${NODE_ICON_BOX_SIZE}px;
              border-radius: ${NODE_ICON_BORDER_RADIUS}px;
              background: ${iconBg};
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
              padding: 4px;
            `}
          >
            <EuiIcon type={icon} size="l" color={iconColor} aria-hidden={true} />
          </div>
        )}
        <div
          css={css`
            display: flex;
            flex-direction: column;
            align-items: stretch;
            gap: 2px;
            min-width: 0;
            flex: 1;
            overflow: visible;
          `}
        >
          {isGroup ? (
            <>
              <div
                css={css`
                  display: flex;
                  align-items: center;
                  gap: 6px;
                  min-width: 0;
                `}
              >
                {count !== undefined && (
                  <EuiBadge
                    color="accent"
                    css={css`
                      flex-shrink: 0;
                      height: ${RISK_BADGE_HEIGHT}px;
                      min-width: ${RISK_BADGE_HEIGHT}px;
                      padding: 0 4px;
                      background-color: ${euiTheme.colors.backgroundFilledAccent};
                      color: ${euiTheme.colors.textInverse};
                      border: none;
                      border-radius: ${euiTheme.border.radius.small};
                      font-size: 12px;
                      font-weight: ${euiTheme.font.weight.medium};
                      line-height: 12px;
                    `}
                  >
                    {count > 99 ? '99+' : count}
                  </EuiBadge>
                )}
                <EuiText
                  size="xs"
                  css={css`
                    font-weight: ${euiTheme.font.weight.bold};
                    color: ${euiTheme.colors.textHeading};
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    max-width: 100%;
                    line-height: ${euiTheme.size.base};
                  `}
                >
                  {label}
                </EuiText>
              </div>
              <div
                css={css`
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                  gap: 6px;
                  min-width: 0;
                `}
              >
                <EuiText
                  size="xs"
                  css={css`
                    color: ${euiTheme.colors.textSubdued};
                    white-space: nowrap;
                    line-height: ${euiTheme.size.base};
                  `}
                >
                  {entityTypeLabel}
                </EuiText>
                {riskBadges}
              </div>
            </>
          ) : (
            <>
              <EuiText
                size="xs"
                css={css`
                  font-weight: ${euiTheme.font.weight.bold};
                  color: ${euiTheme.colors.textHeading};
                  white-space: nowrap;
                  overflow: hidden;
                  text-overflow: ellipsis;
                  max-width: 100%;
                  line-height: ${euiTheme.size.base};
                `}
              >
                {label}
              </EuiText>
              <EuiText
                size="xs"
                css={css`
                  color: ${euiTheme.colors.textSubdued};
                  white-space: nowrap;
                  line-height: ${euiTheme.size.base};
                `}
              >
                {entityTypeLabel}
              </EuiText>
            </>
          )}
        </div>
        {!isGroup && riskBadges}
      </div>
    </div>
  );
};

interface RelationshipsPillProps {
  count: number;
}

const RelationshipsPill = ({ count }: RelationshipsPillProps) => {
  const { euiTheme } = useEuiTheme();
  const label = i18n.translate(
    'xpack.securitySolution.flyout.right.visualizations.graphPreview.relationshipsCount',
    {
      defaultMessage: '{count} {count, plural, one {Relationship} other {Relationships}}',
      values: { count },
    }
  );

  return (
    <div
      data-test-subj="graph-preview-relationships-pill"
      title={label}
      css={css`
        position: relative;
        z-index: 1;
        flex-shrink: 1;
        /* Keep enough room to show at least "8 rela…" */
        min-width: 64px;
        max-width: 100%;
        padding: 4px 10px;
        border-radius: 999px;
        background: ${euiTheme.colors.backgroundBasePlain};
        border: 1px solid ${euiTheme.colors.borderBasePlain};
        white-space: nowrap;
        overflow: hidden;
        /* Cover the connector line so it never shows through the pill */
        box-shadow: 0 0 0 3px ${GRAPH_BACKGROUND_COLOR};
      `}
    >
      <EuiText
        size="xs"
        css={css`
          font-weight: ${euiTheme.font.weight.medium};
          /* Figma: relationship label is black, not primary blue */
          color: ${euiTheme.colors.textParagraph};
          line-height: ${euiTheme.size.base};
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        `}
      >
        {label}
      </EuiText>
    </div>
  );
};

/**
 * Fan-out from the relationships trunk to each risk-group card.
 * Uses SVG so branches share one continuous stroke (no floating stubs / gaps).
 */
const FanOutConnectors = ({ groupCount, edgeColor }: { groupCount: number; edgeColor: string }) => {
  if (groupCount <= 0) return null;

  const vbW = 100;
  const vbH = 100;
  const spineX = 28;
  const endX = 92;
  const midY = 50;

  const rowYs =
    groupCount === 1
      ? [midY]
      : Array.from({ length: groupCount }, (_, i) => {
          // Center of each equal-height row in the stack
          return ((i + 0.5) / groupCount) * vbH;
        });

  const spineTop = rowYs[0];
  const spineBottom = rowYs[rowYs.length - 1];

  // Spine + branches only — the horizontal trunk through the pill is drawn by the parent.
  const spinePath = groupCount > 1 ? `M ${spineX} ${spineTop} L ${spineX} ${spineBottom}` : '';

  return (
    <svg
      aria-hidden={true}
      viewBox={`0 0 ${vbW} ${vbH}`}
      preserveAspectRatio="none"
      css={css`
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        overflow: visible;
        pointer-events: none;
        z-index: 0;
      `}
    >
      {/* Short stub from left edge into the spine so it meets the pill trunk */}
      <line
        x1={0}
        y1={midY}
        x2={spineX}
        y2={midY}
        stroke={edgeColor}
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />
      {spinePath && (
        <path
          d={spinePath}
          fill="none"
          stroke={edgeColor}
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
      )}
      {rowYs.map((y, index) => (
        <line
          key={`fan-${index}`}
          x1={spineX}
          y1={y}
          x2={endX}
          y2={y}
          stroke={edgeColor}
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
};

/** Non-scaling arrow heads positioned at each card's vertical center. */
const FanOutArrows = ({ groupCount, edgeColor }: { groupCount: number; edgeColor: string }) => {
  if (groupCount <= 0) return null;
  const rowPercents = Array.from({ length: groupCount }, (_, i) => ((i + 0.5) / groupCount) * 100);

  return (
    <>
      {rowPercents.map((pct, index) => (
        <div
          key={`arrow-${index}`}
          aria-hidden={true}
          css={css`
            position: absolute;
            right: 0;
            top: ${pct}%;
            transform: translateY(-50%);
            width: 0;
            height: 0;
            border-top: ${ARROW_SIZE / 2 + 1}px solid transparent;
            border-bottom: ${ARROW_SIZE / 2 + 1}px solid transparent;
            border-left: ${ARROW_SIZE}px solid ${edgeColor};
            z-index: 1;
            pointer-events: none;
          `}
        />
      ))}
    </>
  );
};

/**
 * Graph preview under Overview → Visualizations.
 *
 * Pattern (Figma): origin entity card with risk badge → relationships pill →
 * neighbor groups stacked by risk severity (each with count + risk badge).
 */
export const GraphPreview: React.FC<GraphPreviewProps> = memo(
  ({ isLoading, isError, data, originEntityId, originRiskScore }: GraphPreviewProps) => {
    const { euiTheme } = useEuiTheme();

    const { mainNode, relationshipCount, riskGroups } = useMemo(() => {
      const nodes = data?.nodes ?? [];
      const edges = data?.edges ?? [];

      const entityNodes = nodes.filter(isEntityNode).map((node) => node as PreviewEntityNode);
      if (entityNodes.length === 0) {
        return { mainNode: null, relationshipCount: 0, riskGroups: [] as RiskGroup[] };
      }

      const main = pickMainEntityNode(entityNodes, edges, originEntityId);
      if (!main) {
        return { mainNode: null, relationshipCount: 0, riskGroups: [] as RiskGroup[] };
      }

      const adjacency = new Map<string, Set<string>>();
      const addLink = (a: string, b: string) => {
        if (!a || !b || a === b) return;
        if (!adjacency.has(a)) adjacency.set(a, new Set());
        adjacency.get(a)!.add(b);
      };
      edges.forEach((edge) => {
        const e = edge as { source: string; target: string };
        addLink(e.source, e.target);
        addLink(e.target, e.source);
      });

      const direct = adjacency.get(main.id) ?? new Set<string>();
      const neighborIds = new Set<string>();
      let edgeHops = 0;
      direct.forEach((mid) => {
        edgeHops += 1;
        if (entityNodes.some((n) => n.id === mid)) {
          neighborIds.add(mid);
          return;
        }
        (adjacency.get(mid) ?? new Set()).forEach((hop) => {
          if (hop !== main.id) neighborIds.add(hop);
        });
      });

      const entityNeighbors = [...neighborIds]
        .map((id) => entityNodes.find((n) => n.id === id))
        .filter((neighbor): neighbor is PreviewEntityNode => Boolean(neighbor));

      const groups = groupNeighborsForPreview(entityNeighbors);
      // Prefer labeled relationship/event edges when present; else neighbor count.
      const relationships = Math.max(edgeHops, entityNeighbors.length);

      return {
        mainNode: main,
        relationshipCount: relationships,
        riskGroups: groups,
      };
    }, [data, originEntityId]);

    if (isLoading) return <LoadingComponent />;

    if (isError || !mainNode) {
      return (
        <FormattedMessage
          id="xpack.securitySolution.flyout.right.visualizations.graphPreview.errorDescription"
          defaultMessage="An error is preventing this alert from being visualized."
        />
      );
    }

    // Figma: Borders/Base/Prominent for trunk, fan-out, and arrows
    const edgeColor = euiTheme.colors.borderBaseProminent;
    const canvasBorder = euiTheme.colors.borderBasePlain;
    const dotRadius = GRAPH_BACKGROUND_DOT_SIZE / 2;
    // Prefer flyout Entity risk so preview never shows mock Critical when flyout is Unknown.
    const originRiskUnknown = originRiskScore === null;
    const mainRiskScore = originRiskUnknown
      ? undefined
      : originRiskScore !== undefined
      ? originRiskScore
      : resolveNodeRiskScore(mainNode);
    const mainLabel =
      mainNode.label ??
      stripEntityPrefix(mainNode.id) ??
      i18n.translate(
        'xpack.securitySolution.flyout.right.visualizations.graphPreview.unknownEntity',
        { defaultMessage: 'Entity' }
      );

    return (
      <div
        data-test-subj={GRAPH_PREVIEW_TEST_ID}
        css={css`
          container-type: inline-size;
          container-name: graph-preview;
          box-sizing: border-box;
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: ${CONNECTOR_GAP}px;
          width: 100%;
          min-width: 0;
          overflow: hidden;
          padding: ${PREVIEW_CANVAS_PADDING}px;
          min-height: ${PREVIEW_CANVAS_MIN_HEIGHT}px;
          border: 1px solid ${canvasBorder};
          border-radius: ${euiTheme.border.radius.medium};
          background-color: ${GRAPH_BACKGROUND_COLOR};
          background-image: radial-gradient(
            ${GRAPH_BACKGROUND_DOT_COLOR} ${dotRadius}px,
            transparent ${dotRadius}px
          );
          background-size: ${GRAPH_BACKGROUND_DOT_GAP}px ${GRAPH_BACKGROUND_DOT_GAP}px;

          @container graph-preview (max-width: ${PREVIEW_CARD_MIN_WIDTH * 2 +
          RELATIONSHIPS_TRUNK_MIN_WIDTH +
          FANOUT_WIDTH +
          PREVIEW_CANVAS_PADDING * 2}px) {
            padding: 12px;
            gap: 4px;
          }
        `}
      >
        {/* Origin entity — never shrink below badge-safe card floor */}
        <div
          css={css`
            flex: 0 1 ${PREVIEW_CARD_MAX_WIDTH}px;
            min-width: ${PREVIEW_CARD_MIN_WIDTH}px;
            max-width: ${PREVIEW_CARD_MAX_WIDTH}px;
          `}
        >
          <NodeCard
            label={mainLabel}
            icon={mainNode.icon ?? 'storage'}
            riskScore={mainRiskScore}
            riskUnknown={originRiskUnknown}
          />
        </div>

        {/*
          Continuous connector + groups in ONE row so the trunk line never
          breaks between the relationships pill and the fan-out arrows.
        */}
        <div
          css={css`
            display: flex;
            flex-direction: row;
            align-items: stretch;
            flex: 1 1 auto;
            min-width: ${RELATIONSHIPS_TRUNK_MIN_WIDTH + FANOUT_WIDTH + PREVIEW_CARD_MIN_WIDTH}px;
          `}
        >
          {/* Trunk through relationships pill */}
          <div
            css={css`
              display: flex;
              align-items: center;
              justify-content: center;
              flex: 1 1 ${RELATIONSHIPS_TRUNK_MIN_WIDTH}px;
              min-width: ${RELATIONSHIPS_TRUNK_MIN_WIDTH}px;
              max-width: 160px;
              position: relative;
              overflow: visible;
            `}
          >
            <div
              aria-hidden={true}
              css={css`
                position: absolute;
                /* Bridge the gap from the origin card into the fan-out spine */
                left: -${CONNECTOR_GAP}px;
                right: -2px;
                top: 50%;
                height: 1px;
                background: ${edgeColor};
                z-index: 0;
              `}
            />
            {relationshipCount > 0 && <RelationshipsPill count={relationshipCount} />}
          </div>

          {/* Fan-out + neighbor groups */}
          {riskGroups.length > 0 && (
            <div
              css={css`
                display: flex;
                flex-direction: row;
                align-items: stretch;
                flex: 0 1 ${PREVIEW_CARD_MAX_WIDTH + FANOUT_WIDTH}px;
                min-width: ${PREVIEW_CARD_MIN_WIDTH + FANOUT_WIDTH}px;
                max-width: ${PREVIEW_CARD_MAX_WIDTH + FANOUT_WIDTH}px;
              `}
            >
              <div
                css={css`
                  position: relative;
                  width: ${FANOUT_WIDTH}px;
                  flex: 0 0 ${FANOUT_WIDTH}px;
                  align-self: stretch;
                  margin-right: 2px;
                  overflow: visible;
                `}
              >
                <FanOutConnectors groupCount={riskGroups.length} edgeColor={edgeColor} />
                <FanOutArrows groupCount={riskGroups.length} edgeColor={edgeColor} />
              </div>
              <EuiFlexGroup
                direction="column"
                gutterSize="none"
                responsive={false}
                css={css`
                  flex: 1 1 auto;
                  min-width: ${PREVIEW_CARD_MIN_WIDTH}px;
                  gap: ${GROUP_STACK_GAP}px;
                `}
              >
                {riskGroups.map((group, index) => {
                  const isGroup = group.count > 1;
                  const groupLabel =
                    group.label ??
                    i18n.translate(
                      'xpack.securitySolution.flyout.right.visualizations.graphPreview.groupEntityCount',
                      {
                        defaultMessage: '{count} {count, plural, one {Entity} other {Entities}}',
                        values: { count: group.count },
                      }
                    );
                  return (
                    <EuiFlexItem
                      key={`${group.level}-${group.label ?? index}`}
                      grow={false}
                      css={{ minWidth: PREVIEW_CARD_MIN_WIDTH }}
                    >
                      <NodeCard
                        isGroup={isGroup}
                        count={isGroup ? group.count : undefined}
                        icon={isGroup ? GROUP_ENTITIES_ICON : group.icon ?? 'storage'}
                        label={groupLabel}
                        riskScore={group.riskScoreMin === undefined ? group.riskScore : undefined}
                        riskScoreMin={group.riskScoreMin}
                        riskScoreMax={group.riskScoreMax}
                      />
                    </EuiFlexItem>
                  );
                })}
              </EuiFlexGroup>
            </div>
          )}
        </div>
      </div>
    );
  }
);

GraphPreview.displayName = 'GraphPreview';
