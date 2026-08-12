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
import { GRAPH_PREVIEW_TEST_ID, GRAPH_PREVIEW_LOADING_TEST_ID } from './test_ids';

const ENTITY_SHAPES = new Set(['hexagon', 'pentagon', 'ellipse', 'rectangle', 'diamond']);

/** Preview card radius — match entity card 2D (4px). */
const NODE_PILL_BORDER_RADIUS = 4;
const NODE_ICON_BORDER_RADIUS = 4;
/** Match Figma preview entity card icon (24px glyph in 32px square). */
const NODE_ICON_SIZE = 24;
const NODE_ICON_BOX_SIZE = 32;
/** Match Figma card padding (8px). */
const NODE_PILL_PADDING = 8;
/** Canvas inset — keep room for stacked group edge under the neighbor pill. */
const PREVIEW_CANVAS_PADDING = 16;
const PREVIEW_CANVAS_PADDING_BOTTOM = 24;
/** Minimum canvas height so title+subtitle cards are not clipped. */
const PREVIEW_CANVAS_MIN_HEIGHT = 176;

/** Padding + icon + gap + risk badge chrome inside a preview pill. */
const PREVIEW_PILL_CHROME_WIDTH =
  NODE_PILL_PADDING + NODE_ICON_BOX_SIZE + 8 + 52 + NODE_PILL_PADDING;
/** Keep pills readable in the entity flyout (~480px content). */
const PREVIEW_PILL_WIDTH_MIN = 148;
const PREVIEW_PILL_WIDTH_MAX = 200;

const RISK_BADGE_BORDER_RADIUS = 999;
const RISK_BADGE_HEIGHT = 20;
const RISK_BADGE_PADDING_X = 8;

type PreviewEntityNode = {
  id: string;
  label?: string;
  icon?: string;
  tag?: string;
  color?: string;
  count?: number;
  riskScore?: number;
  riskScoreMin?: number;
  riskScoreMax?: number;
};

const stripEntityPrefix = (id: string): string =>
  id.replace(/^(user|host|service):/i, '');

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
 * Pick the graph origin entity for the left preview pill.
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

  // Prefer the entity with the most outbound edges (typical graph origin).
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

type PreviewRiskLevel = 'critical' | 'high' | 'moderate' | 'low' | 'unknown';

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

const getPreviewRiskTone = (
  level: PreviewRiskLevel,
  colors: {
    backgroundLightDanger: string;
    backgroundLightRisk: string;
    backgroundLightWarning: string;
    backgroundLightNeutral: string;
    backgroundLightText: string;
    backgroundFilledDanger: string;
    backgroundFilledRisk: string;
    backgroundFilledWarning: string;
    backgroundFilledNeutral: string;
    backgroundFilledText: string;
    textDanger: string;
    textRisk: string;
    textWarning: string;
    textNeutral: string;
    textParagraph: string;
    textInverse: string;
  }
) => {
  switch (level) {
    case 'critical':
      return {
        iconBg: colors.backgroundLightDanger,
        accent: colors.textDanger,
        badgeBackground: colors.backgroundFilledDanger,
        badgeText: colors.textInverse,
      };
    case 'high':
      return {
        iconBg: colors.backgroundLightRisk,
        accent: colors.textRisk,
        badgeBackground: colors.backgroundFilledRisk,
        badgeText: colors.textInverse,
      };
    case 'moderate':
      return {
        iconBg: colors.backgroundLightWarning,
        accent: colors.textWarning,
        badgeBackground: colors.backgroundFilledWarning,
        badgeText: colors.textInverse,
      };
    case 'low':
      return {
        iconBg: colors.backgroundLightNeutral,
        accent: colors.textNeutral,
        badgeBackground: colors.backgroundFilledNeutral,
        badgeText: colors.textInverse,
      };
    case 'unknown':
    default:
      return {
        iconBg: colors.backgroundLightText,
        accent: colors.textParagraph,
        badgeBackground: colors.backgroundFilledText,
        badgeText: colors.textInverse,
      };
  }
};

/** Approximate medium/12px label width so both preview pills can share one fixed size. */
const estimatePreviewLabelWidth = (label: string): number => Math.ceil(label.length * 7.2);

const getPreviewPillWidthForLabels = (labels: string[]): number => {
  const maxLabelWidth = labels.reduce(
    (max, label) => Math.max(max, estimatePreviewLabelWidth(label)),
    0
  );
  return Math.min(
    PREVIEW_PILL_WIDTH_MAX,
    Math.max(PREVIEW_PILL_WIDTH_MIN, PREVIEW_PILL_CHROME_WIDTH + maxLabelWidth)
  );
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
    /**
     * Array of node data models.
     */
    nodes: NodeDataModel[];

    /**
     * Array of edge data models.
     */
    edges: EdgeDataModel[];
  };

  /**
   * Entity that opened the flyout / centered the graph (`entity.id` or name).
   * Used so the left preview pill matches the origin (icon + risk color).
   */
  originEntityId?: string;
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

interface NodePillProps {
  label?: string;
  /** Secondary line under the title (e.g. entity type). */
  subtitle?: string;
  icon?: string;
  /** Shared fixed width for both pills in the preview (longest label wins). */
  width: number;
  /** Optional risk score for 2D icon coloring. */
  riskScore?: number;
  /** When true, render a stacked card edge for grouped neighbors. */
  isGroup?: boolean;
}

/**
 * Entity preview card — matches zoom-out CompactColoredCard:
 * plain card, risk-light icon, title, type + filled risk badge.
 */
const NodePill = ({ label, subtitle, icon, width, riskScore, isGroup = false }: NodePillProps) => {
  const { euiTheme } = useEuiTheme();
  const fillColor = euiTheme.colors.backgroundBasePlain;
  const borderColor = euiTheme.colors.borderBasePlain;
  const tone = getPreviewRiskTone(getPreviewRiskLevel(riskScore), euiTheme.colors);

  return (
    <div
      css={css`
        position: relative;
        width: ${width}px;
        flex-shrink: 0;
        /* Reserve space for the stacked group edge so it is not clipped. */
        margin-bottom: ${isGroup ? 6 : 0}px;
      `}
    >
      {isGroup && (
        <div
          aria-hidden={true}
          css={css`
            position: absolute;
            left: 12px;
            right: 12px;
            bottom: -5px;
            height: 6px;
            border-left: 1px solid ${borderColor};
            border-right: 1px solid ${borderColor};
            border-bottom: 1px solid ${borderColor};
            border-radius: 0 0 ${NODE_PILL_BORDER_RADIUS}px ${NODE_PILL_BORDER_RADIUS}px;
            background: ${fillColor};
            z-index: 0;
          `}
        />
      )}
      <EuiFlexGroup
        direction="row"
        gutterSize="s"
        alignItems="center"
        responsive={false}
        css={css`
          position: relative;
          z-index: 1;
          width: 100%;
          box-sizing: border-box;
          border: 1px solid ${borderColor};
          border-radius: ${NODE_PILL_BORDER_RADIUS}px;
          padding: ${NODE_PILL_PADDING}px;
          background: ${fillColor};
          gap: 8px;
          /* Match Figma Graph viz X-small Level 2 (13969:1176). */
          box-shadow: 0 1px 2px 0 rgba(7, 16, 31, 0.06);
        `}
      >
        {icon && (
          <EuiFlexItem grow={false}>
            <div
              css={css`
                width: ${NODE_ICON_BOX_SIZE}px;
                height: ${NODE_ICON_BOX_SIZE}px;
                border-radius: ${NODE_ICON_BORDER_RADIUS}px;
                border: none;
                background: ${tone.iconBg};
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
              `}
            >
              <EuiIcon
                type={icon}
                size="l"
                color={tone.accent}
                aria-hidden={true}
                css={css`
                  svg {
                    width: ${NODE_ICON_SIZE}px;
                    height: ${NODE_ICON_SIZE}px;
                  }
                `}
              />
            </div>
          </EuiFlexItem>
        )}
        <EuiFlexItem
          grow={true}
          css={css`
            overflow: hidden;
            min-width: 0;
          `}
        >
          <EuiText
            size="xs"
            css={css`
              font-weight: ${euiTheme.font.weight.semiBold};
              color: ${euiTheme.colors.textParagraph};
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              line-height: ${euiTheme.size.base};
            `}
          >
            {label ?? '—'}
          </EuiText>
          {(subtitle || riskScore !== undefined) && (
            <div
              css={css`
                display: flex;
                align-items: center;
                gap: 6px;
                min-width: 0;
              `}
            >
              {subtitle ? (
                <EuiText
                  size="xs"
                  css={css`
                    font-weight: ${euiTheme.font.weight.regular};
                    color: ${euiTheme.colors.textSubdued};
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    line-height: ${euiTheme.size.base};
                  `}
                >
                  {subtitle}
                </EuiText>
              ) : null}
              {riskScore !== undefined && (
                <EuiBadge
                  color="hollow"
                  css={css`
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    height: ${RISK_BADGE_HEIGHT}px;
                    padding: 0 ${RISK_BADGE_PADDING_X}px;
                    background-color: ${tone.badgeBackground};
                    color: ${tone.badgeText};
                    border: none;
                    border-radius: ${RISK_BADGE_BORDER_RADIUS}px;
                    font-size: 12px;
                    font-weight: ${euiTheme.font.weight.medium};
                    line-height: ${euiTheme.size.base};
                  `}
                >
                  {riskScore.toFixed(2)}
                </EuiBadge>
              )}
            </div>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};

/**
 * Graph preview under Overview, Visualizations.
 * Shows a simplified 2-node schematic: [main entity] ──▶ [N neighbors].
 * Canvas and pills mirror graph visualizer entity card styling (variant 2D).
 */
export const GraphPreview: React.FC<GraphPreviewProps> = memo(
  ({ isLoading, isError, data, originEntityId }: GraphPreviewProps) => {
    const { euiTheme } = useEuiTheme();

    const { mainNode, neighborCount, neighborRiskScore, neighborIcon, neighborTag } = useMemo(() => {
      const nodes = data?.nodes ?? [];
      const edges = data?.edges ?? [];

      const entityNodes = nodes.filter(isEntityNode).map((node) => node as PreviewEntityNode);
      if (entityNodes.length === 0) {
        return {
          mainNode: null,
          neighborCount: 0,
          neighborRiskScore: undefined,
          neighborIcon: 'storage' as const,
          neighborTag: undefined as string | undefined,
        };
      }

      const main = pickMainEntityNode(entityNodes, edges, originEntityId);
      if (!main) {
        return {
          mainNode: null,
          neighborCount: 0,
          neighborRiskScore: undefined,
          neighborIcon: 'storage' as const,
          neighborTag: undefined as string | undefined,
        };
      }

      // Count distinct entity neighbors connected to the main node via edges
      // (include 1-hop through relationship/group connectors).
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
      direct.forEach((mid) => {
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
      const entityNeighborCount =
        entityNeighbors.length || Math.max(entityNodes.length - 1, 0);

      // Use the highest neighbor risk for the grouped pill icon tint.
      const maxNeighborRisk = entityNeighbors.reduce<number | undefined>((max, neighbor) => {
        const score = neighbor.riskScore;
        if (score === undefined) return max;
        return max === undefined ? score : Math.max(max, score);
      }, undefined);

      // Neighbor pill should reflect related entities (hosts/services), not the origin icon.
      const firstNeighborIcon = entityNeighbors.find((n) => n.icon)?.icon;
      const uniqueNeighborTags = [
        ...new Set(
          entityNeighbors.map((n) => n.tag).filter((tag): tag is string => Boolean(tag))
        ),
      ];

      return {
        mainNode: main,
        neighborCount: entityNeighborCount,
        neighborRiskScore: maxNeighborRisk,
        neighborIcon: firstNeighborIcon ?? 'storage',
        // Only set when all neighbors share one type (also covers count === 1).
        neighborTag: uniqueNeighborTags.length === 1 ? uniqueNeighborTags[0] : undefined,
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

    // Match graph edge stroke (`useEdgeColor` → borderBaseProminent).
    const edgeColor = euiTheme.colors.borderBaseProminent;
    const canvasBorder = euiTheme.colors.borderBasePlain;
    const dotRadius = GRAPH_BACKGROUND_DOT_SIZE / 2;
    const neighborLabel =
      neighborCount > 0
        ? i18n.translate(
            'xpack.securitySolution.flyout.right.visualizations.graphPreview.neighborCount',
            {
              defaultMessage: '{count} {count, plural, one {entity} other {entities}}',
              values: { count: neighborCount },
            }
          )
        : undefined;
    const neighborSubtitle =
      neighborCount <= 0
        ? undefined
        : neighborCount > 1 && !neighborTag
          ? i18n.translate(
              'xpack.securitySolution.flyout.right.visualizations.graphPreview.neighborTypes',
              {
                defaultMessage: 'Types',
              }
            )
          : neighborTag;
    const pillWidth = getPreviewPillWidthForLabels(
      [mainNode.label, neighborLabel].filter((label): label is string => Boolean(label))
    );
    const mainRiskScore =
      mainNode.riskScore ?? mainNode.riskScoreMax ?? mainNode.riskScoreMin;

    return (
      <EuiFlexGroup
        direction="row"
        gutterSize="none"
        alignItems="center"
        justifyContent="spaceBetween"
        responsive={false}
        data-test-subj={GRAPH_PREVIEW_TEST_ID}
        css={css`
          box-sizing: border-box;
          width: 100%;
          overflow: visible;
          padding: ${PREVIEW_CANVAS_PADDING}px;
          padding-bottom: ${PREVIEW_CANVAS_PADDING_BOTTOM}px;
          min-height: ${PREVIEW_CANVAS_MIN_HEIGHT}px;
          border: 1px solid ${canvasBorder};
          border-radius: ${euiTheme.border.radius.medium};
          background-color: ${GRAPH_BACKGROUND_COLOR};
          background-image: radial-gradient(
            ${GRAPH_BACKGROUND_DOT_COLOR} ${dotRadius}px,
            transparent ${dotRadius}px
          );
          background-size: ${GRAPH_BACKGROUND_DOT_GAP}px ${GRAPH_BACKGROUND_DOT_GAP}px;
        `}
      >
        {/* Main entity */}
        <EuiFlexItem grow={false}>
          <NodePill
            label={mainNode.label}
            subtitle={mainNode.tag}
            icon={mainNode.icon ?? 'storage'}
            width={pillWidth}
            riskScore={mainRiskScore}
          />
        </EuiFlexItem>

        {/* Connecting line + arrow */}
        <EuiFlexItem
          css={css`
            display: flex;
            align-items: center;
            min-width: ${euiTheme.size.xxl};
            flex: 1;
            margin-inline: ${euiTheme.size.m};
          `}
        >
          <div
            css={css`
              position: relative;
              width: 100%;
              height: 1px;
              background: ${edgeColor};
            `}
          >
            <div
              aria-hidden={true}
              css={css`
                position: absolute;
                right: 0;
                top: 50%;
                width: 6px;
                height: 6px;
                border-top: 1px solid ${edgeColor};
                border-right: 1px solid ${edgeColor};
                transform: translateY(-50%) rotate(45deg);
                background: transparent;
              `}
            />
          </div>
        </EuiFlexItem>

        {/* Neighbor count pill */}
        {neighborCount > 0 && neighborLabel && (
          <EuiFlexItem grow={false}>
            <NodePill
              isGroup={neighborCount > 1}
              icon={neighborIcon}
              label={neighborLabel}
              subtitle={neighborSubtitle}
              width={pillWidth}
              riskScore={neighborRiskScore}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  }
);

GraphPreview.displayName = 'GraphPreview';
