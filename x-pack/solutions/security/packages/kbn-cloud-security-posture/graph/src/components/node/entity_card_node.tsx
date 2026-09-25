/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import styled from '@emotion/styled';
import { css } from '@emotion/react';
import { Handle, NodeToolbar, Position } from '@xyflow/react';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiIcon,
  EuiText,
  EuiTextTruncate,
  EuiToolTip,
  useEuiShadow,
  useEuiTheme,
} from '@elastic/eui';
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
import { ENTITY_CARD_HEADER_HEIGHT, NODE_WIDTH } from '../constants';
import {
  GRAPH_ENTITY_NODE_ID,
  GRAPH_ENTITY_NODE_DETAILS_ID,
  GRAPH_ENTITY_NODE_RISK_BADGE_ID,
  GRAPH_ENTITY_NODE_LAYERS_PANEL_ID,
  GRAPH_STACKED_SHAPE_ID,
  GRAPH_TAG_TEXT_ID,
  GRAPH_TAG_COUNT_ID,
} from '../test_ids';
import { getSpanIcon } from './get_span_icon';
import { showStackedShape } from '../utils';
import type { EntityNodeViewModel, NodeProps, NodeToolbarItem } from '../types';

/** Converts an ISO 3166-1 alpha-2 country code to its flag emoji. */
const countryCodeToFlag = (code: string): string =>
  [...code.toUpperCase()].map((c) => String.fromCodePoint(c.charCodeAt(0) + 127397)).join('');

/** Formats a raw snake_case criticality level (e.g. "extreme_impact") to sentence case:
 * underscores become spaces and only the first letter is capitalised. */
const formatCriticalityLevel = (value: string): string => {
  const readable = value.replace(/_/g, ' ');
  return readable.charAt(0).toUpperCase() + readable.slice(1);
};

/** Formats a raw snake_case source name (e.g. "active_directory") to title case:
 * underscores become spaces and every word is capitalised. */
const formatSourceName = (value: string): string =>
  value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

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
  align-items: center;
  height: ${ENTITY_CARD_HEADER_HEIGHT}px;
  padding: 0 8px;
  gap: 8px;
`;

/** Size of the inset icon box inside the header. */
const ICON_BOX_SIZE = 40;

// ---------------------------------------------------------------------------
// Risk-score helpers
//
// These mirror the logic in security_solution:
//   - getRiskLevel    → security_solution/common/entity_analytics/risk_engine/risk_levels.ts
//   - getRiskScoreColors → security_solution/.../entities_table/risk_score_cell.tsx
//
// We cannot import from there directly because `security_solution` is a
// `visibility: private` plugin and this package is a separate module —
// crossing that boundary is forbidden by Kibana's module-boundary rules
// (enforced by ESLint). If those thresholds or color tokens ever change,
// update this copy too.
// ---------------------------------------------------------------------------

/** Risk severity levels, ordered ascending. */
type RiskLevel = 'Unknown' | 'Low' | 'Moderate' | 'High' | 'Critical';

/** Bucket a numeric risk score into a severity level. Thresholds match Entity Analytics. */
const getRiskLevel = (score: number): RiskLevel => {
  if (score >= 90) return 'Critical';
  if (score >= 70) return 'High';
  if (score >= 40) return 'Moderate';
  if (score >= 20) return 'Low';
  return 'Unknown';
};

/** Semantic EUI color tokens per risk level — identical to getRiskScoreColors in entity analytics. */
const getRiskScoreColors = (
  euiTheme: EuiThemeComputed,
  level: RiskLevel
): { background: string; text: string } => {
  switch (level) {
    case 'Critical':
      return {
        background: euiTheme.colors.backgroundLightDanger,
        text: euiTheme.colors.textDanger,
      };
    case 'High':
      return {
        background: euiTheme.colors.backgroundLightRisk,
        text: euiTheme.colors.textRisk,
      };
    case 'Moderate':
      return {
        background: euiTheme.colors.backgroundLightWarning,
        text: euiTheme.colors.textWarning,
      };
    case 'Low':
      return {
        background: euiTheme.colors.backgroundBaseNeutral,
        text: euiTheme.colors.textNeutral,
      };
    default:
      return {
        background: euiTheme.colors.backgroundBaseSubdued,
        text: euiTheme.colors.textSubdued,
      };
  }
};

/**
 * Returns the icon box background color for an entity node.
 * Currently a passthrough — icon always uses the node's default fill color.
 */
const getIconColorByRiskScore = (
  _riskScore: { min: number; max: number } | undefined,
  defaultColor: string
): string => {
  return defaultColor;
};

/**
 * Contained colored icon box — inset with padding so it doesn't span
 * the full card height. Rounded corners match the card radius.
 */
const IconBox = styled.div<{ bgColor: string; euiTheme: EuiThemeComputed }>`
  position: relative;
  width: ${ICON_BOX_SIZE}px;
  min-width: ${ICON_BOX_SIZE}px;
  height: ${ICON_BOX_SIZE}px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ bgColor }) => bgColor};
  border-radius: ${({ euiTheme }) => euiTheme.border.radius.medium};
  flex-shrink: 0;
`;

/**
 * Centre section — entity name (bold) + type subtitle.
 */
const EntityInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  overflow: hidden;
  min-width: 0;
`;

/**
 * Metadata panel — rendered below the header, always visible. Laid out as a 2-column grid.
 */
const EntityCardMetadata = styled.div<{ euiTheme: EuiThemeComputed }>`
  display: grid;
  grid-template-columns: 1fr 1fr;
  border-top: ${({ euiTheme }) =>
    `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain}`};
`;

/**
 * Circular badge in the top-left corner of a grouped node showing the entity
 * count. Capped at "99+" to keep the badge compact.
 */
const CountBadge = styled.div<{ euiTheme: EuiThemeComputed }>`
  position: absolute;
  top: -8px;
  left: -8px;
  min-width: 20px;
  height: 20px;
  border-radius: 10px;
  padding: 0 ${({ euiTheme }) => euiTheme.size.xs};
  background: ${({ euiTheme }) => euiTheme.colors.primary};
  color: ${({ euiTheme }) => euiTheme.colors.textInverse};
  font-size: 11px;
  font-weight: ${({ euiTheme }) => euiTheme.font.weight.bold};
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
  white-space: nowrap;
`;

/**
 * Single metadata cell — label above value.
 */
const MetadataItem = styled.div<{ euiTheme: EuiThemeComputed }>`
  display: flex;
  flex-direction: column;
  padding: ${({ euiTheme }) => euiTheme.size.m} ${({ euiTheme }) => euiTheme.size.s};
  gap: ${({ euiTheme }) => euiTheme.size.xxs};
  /* Prevent grid items from overflowing their 1fr column — required for
     text truncation inside flex children to work. */
  min-width: 0;
  overflow: hidden;
  /* Don't stretch to the tallest cell in the row. Each cell is only as tall
     as its own content, preventing the neighbour's multi-line value from
     pushing this cell's value to the bottom via EUI's flex-grow defaults. */
  align-self: flex-start;
`;

/**
 * Stacked card — peeking out from the bottom of the main card to convey that
 * this node represents more than one entity (count > 1). Two copies are
 * rendered, each scaled down and offset downward from the bottom edge.
 */
const StackedCard = styled.div<{
  euiTheme: EuiThemeComputed;
  bgColor: string;
  bottomOffset: number;
  scale: number;
}>`
  position: absolute;
  width: ${NODE_WIDTH}px;
  height: ${ENTITY_CARD_HEADER_HEIGHT}px;
  left: 0;
  bottom: ${({ bottomOffset }) => -bottomOffset}px;
  background: ${({ bgColor }) => bgColor};
  border: ${({ euiTheme }) =>
    `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain}`};
  border-radius: ${({ euiTheme }) => euiTheme.border.radius.medium};
  transform: scale(${({ scale }) => scale});
  transform-origin: center bottom;
  z-index: -1;
`;

/**
 * Returns the EUI severity color for a raw criticality level string.
 * Mirrors the mapping used by `AssetCriticalityBadge` in security_solution
 * (which we cannot import from here).
 */
const getCriticalityColor = (level: string, euiTheme: EuiThemeComputed): string => {
  const { danger, risk, warning, neutral, unknown } = euiTheme.colors.severity;
  const map: Record<string, string> = {
    extreme_impact: danger,
    high_impact: risk,
    medium_impact: warning,
    low_impact: neutral,
  };
  return map[level] ?? (unknown as string);
};

const ASSET_CRITICALITY_LABEL = i18n.translate(
  'securitySolutionPackages.csp.graph.entityNode.metadata.assetCriticality',
  { defaultMessage: 'Asset criticality' }
);

const SOURCE_LABEL = i18n.translate(
  'securitySolutionPackages.csp.graph.entityNode.metadata.source',
  { defaultMessage: 'Source' }
);

const SOURCES_OVERFLOW_TOOLTIP_TITLE = i18n.translate(
  'securitySolutionPackages.csp.graph.entityNode.metadata.sourcesOverflow',
  { defaultMessage: 'Additional sources' }
);

/**
 * Shows the first formatted source value as plain text and collapses any
 * remaining values into a hollow "+N" badge whose tooltip lists them.
 */
const SourcesCell = memo<{ sources: string[] }>(({ sources }) => {
  const formatted = sources.map(formatSourceName);
  const [first, ...rest] = formatted;

  return (
    <EuiFlexGroup
      gutterSize="none"
      alignItems="center"
      responsive={false}
      css={{ width: '100%', gap: '4px' }}
    >
      <EuiFlexItem css={{ flex: '0 1 auto', minWidth: 0 }}>
        <EuiToolTip position="top" content={first}>
          <EuiText size="xs" tabIndex={0}>
            <p
              css={{
                margin: 0,
                fontWeight: 'inherit',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {first}
            </p>
          </EuiText>
        </EuiToolTip>
      </EuiFlexItem>
      {rest.length > 0 && (
        <EuiFlexItem grow={false} css={{ flexShrink: 0 }}>
          <EuiToolTip
            position="top"
            title={SOURCES_OVERFLOW_TOOLTIP_TITLE}
            content={rest.join(', ')}
          >
            <EuiBadge color="hollow" tabIndex={0}>{`+${rest.length}`}</EuiBadge>
          </EuiToolTip>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
});
SourcesCell.displayName = 'SourcesCell';

const IP_ADDRESS_LABEL = i18n.translate(
  'securitySolutionPackages.csp.graph.entityNode.metadata.ipAddress',
  { defaultMessage: 'IP address' }
);

const GEOLOCATION_LABEL = i18n.translate(
  'securitySolutionPackages.csp.graph.entityNode.metadata.geolocation',
  { defaultMessage: 'Geolocation' }
);

const IPS_OVERFLOW_TOOLTIP_TITLE = i18n.translate(
  'securitySolutionPackages.csp.graph.entityNode.metadata.ipsOverflow',
  { defaultMessage: 'Additional IP addresses' }
);

const GEO_OVERFLOW_TOOLTIP_TITLE = i18n.translate(
  'securitySolutionPackages.csp.graph.entityNode.metadata.geoOverflow',
  { defaultMessage: 'Additional locations' }
);

/** Shows the first IP with a hollow "+N" overflow badge for the rest. */
const IpsCell = memo<{ ips: string[] }>(({ ips }) => {
  const [first, ...rest] = ips;
  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} css={{ width: '100%' }}>
      <EuiFlexItem css={{ flex: '0 1 auto', minWidth: 0 }}>
        <EuiToolTip position="top" content={first}>
          <EuiText size="xs" tabIndex={0}>
            <p
              css={{
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {first}
            </p>
          </EuiText>
        </EuiToolTip>
      </EuiFlexItem>
      {rest.length > 0 && (
        <EuiFlexItem grow={false} css={{ flexShrink: 0 }}>
          <EuiToolTip position="top" title={IPS_OVERFLOW_TOOLTIP_TITLE} content={rest.join(', ')}>
            <EuiBadge color="hollow" tabIndex={0}>{`+${rest.length}`}</EuiBadge>
          </EuiToolTip>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
});
IpsCell.displayName = 'IpsCell';

/** Shows the first flag emoji with a hollow "+N" overflow badge for the rest. */
const GeoCell = memo<{ countryCodes: string[] }>(({ countryCodes }) => {
  const formatted = countryCodes.map(countryCodeToFlag);
  const [first, ...rest] = formatted;
  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} css={{ width: '100%' }}>
      <EuiFlexItem grow={false}>
        <EuiText size="xs">
          <p css={{ margin: 0 }}>{first}</p>
        </EuiText>
      </EuiFlexItem>
      {rest.length > 0 && (
        <EuiFlexItem grow={false} css={{ flexShrink: 0 }}>
          <EuiToolTip
            position="top"
            title={GEO_OVERFLOW_TOOLTIP_TITLE}
            content={formatted.join(' ')}
          >
            <EuiBadge color="hollow" tabIndex={0}>{`+${rest.length}`}</EuiBadge>
          </EuiToolTip>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
});
GeoCell.displayName = 'GeoCell';

/**
 * 2×2 grid of EuiHealth dot + "count level" entries for the asset criticality
 * distribution shown in the grouped-node layers panel.
 */
const CriticalityDistribution = memo<{
  levels: Array<{ level: string; count: number }>;
  euiTheme: EuiThemeComputed;
}>(({ levels, euiTheme }) => (
  <div
    css={css`
      display: flex;
      flex-direction: column;
      gap: ${euiTheme.size.xxs};
    `}
  >
    {levels.map(({ level, count }) => (
      <EuiHealth key={level} color={getCriticalityColor(level, euiTheme)} textSize="xs">
        {`${count} ${formatCriticalityLevel(level)}`}
      </EuiHealth>
    ))}
  </div>
));
CriticalityDistribution.displayName = 'CriticalityDistribution';

/** Renders an em-dash placeholder used when a metadata value is absent. */
const DashValue = memo<{ euiTheme: EuiThemeComputed }>(({ euiTheme }) => (
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
));
DashValue.displayName = 'DashValue';

/** Bold small label rendered above a metadata value. */
const MetadataLabel = ({ children }: { children: React.ReactNode }) => (
  <EuiText size="xs">
    <p
      css={css`
        margin: 0;
        font-weight: bold;
      `}
    >
      {children}
    </p>
  </EuiText>
);

/** Metadata panel for grouped entity nodes (count > 1). */
const GroupedMetadataPanel = memo<{
  ips?: string[];
  countryCodes?: string[];
  sources?: string[];
  assetCriticality?: Array<{ level: string; count: number }>;
  euiTheme: EuiThemeComputed;
}>(({ ips, countryCodes, sources, assetCriticality, euiTheme }) => (
  <>
    {/* Row 1: Asset Criticality | Source */}
    <MetadataItem euiTheme={euiTheme}>
      <MetadataLabel>{ASSET_CRITICALITY_LABEL}</MetadataLabel>
      {assetCriticality?.length ? (
        <CriticalityDistribution levels={assetCriticality} euiTheme={euiTheme} />
      ) : (
        <DashValue euiTheme={euiTheme} />
      )}
    </MetadataItem>
    <MetadataItem euiTheme={euiTheme}>
      <MetadataLabel>{SOURCE_LABEL}</MetadataLabel>
      {sources?.length ? <SourcesCell sources={sources} /> : <DashValue euiTheme={euiTheme} />}
    </MetadataItem>

    {/* Row 2: IP Address | Geolocation */}
    <MetadataItem euiTheme={euiTheme}>
      <MetadataLabel>{IP_ADDRESS_LABEL}</MetadataLabel>
      {ips?.length ? <IpsCell ips={ips} /> : <DashValue euiTheme={euiTheme} />}
    </MetadataItem>
    <MetadataItem euiTheme={euiTheme}>
      <MetadataLabel>{GEOLOCATION_LABEL}</MetadataLabel>
      {countryCodes?.length ? (
        <GeoCell countryCodes={countryCodes} />
      ) : (
        <DashValue euiTheme={euiTheme} />
      )}
    </MetadataItem>
  </>
));
GroupedMetadataPanel.displayName = 'GroupedMetadataPanel';

/** Metadata panel for single-entity nodes (full redesign). */
const SingleEntityMetadataPanel = memo<{
  ips?: string[];
  countryCodes?: string[];
  sources?: string[];
  assetCriticality?: Array<{ level: string; count: number }>;
  euiTheme: EuiThemeComputed;
}>(({ ips, countryCodes, sources, assetCriticality, euiTheme }) => (
  <>
    {/* Row 1: Asset Criticality | Source */}
    <MetadataItem euiTheme={euiTheme}>
      <MetadataLabel>{ASSET_CRITICALITY_LABEL}</MetadataLabel>
      {assetCriticality?.length ? (
        <EuiHealth color={getCriticalityColor(assetCriticality[0].level, euiTheme)} textSize="xs">
          {formatCriticalityLevel(assetCriticality[0].level)}
        </EuiHealth>
      ) : (
        <DashValue euiTheme={euiTheme} />
      )}
    </MetadataItem>
    <MetadataItem euiTheme={euiTheme}>
      <MetadataLabel>{SOURCE_LABEL}</MetadataLabel>
      {sources?.length ? <SourcesCell sources={sources} /> : <DashValue euiTheme={euiTheme} />}
    </MetadataItem>

    {/* Row 2: IP Address | Geolocation */}
    <MetadataItem euiTheme={euiTheme}>
      <MetadataLabel>{IP_ADDRESS_LABEL}</MetadataLabel>
      {ips?.length ? <IpsCell ips={ips} /> : <DashValue euiTheme={euiTheme} />}
    </MetadataItem>
    <MetadataItem euiTheme={euiTheme}>
      <MetadataLabel>{GEOLOCATION_LABEL}</MetadataLabel>
      {countryCodes?.length ? (
        <GeoCell countryCodes={countryCodes} />
      ) : (
        <DashValue euiTheme={euiTheme} />
      )}
    </MetadataItem>
  </>
));
SingleEntityMetadataPanel.displayName = 'SingleEntityMetadataPanel';

/** Derives risk badge display value and semantic colors from a raw risk score. */
const computeRiskBadge = (
  riskScore: EntityNodeViewModel['riskScore'],
  euiTheme: EuiThemeComputed
): { colors: ReturnType<typeof getRiskScoreColors> | null; display: string } => {
  const value = riskScore?.max ?? null;
  const level = value != null ? getRiskLevel(value) : null;
  return {
    colors: level != null ? getRiskScoreColors(euiTheme, level) : null,
    display: value == null ? 'N/A' : (Math.round(value * 100) / 100).toFixed(2),
  };
};

/** Returns the display string for a grouped node's entity count badge. */
const getCountDisplay = (count: number | undefined): string =>
  count != null && count > 99 ? '99+' : String(count ?? '');

/**
 * Shared horizontal card node rendered by all entity node shape types
 * (hexagon, pentagon, ellipse, rectangle, diamond). Always renders the full
 * card with header and metadata panel.
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
    riskScore,
    assetCriticality,
    documentsData,
    interactive,
    expandButtonClick,
    toolbarItemsFn,
    nodeClick,
  } = props.data as EntityNodeViewModel;

  const { euiTheme } = useEuiTheme();
  const shadow = useEuiShadow('m');
  const fillColor = useNodeFillColor(color ?? 'primary');
  const iconBgColor = getIconColorByRiskScore(riskScore, fillColor);
  // Hover state for NodeToolbar visibility.
  // A generous hide-delay keeps the toolbar alive while the mouse travels from
  // the card into the toolbar, which lives in a separate DOM subtree (portal).
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
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
  // When the cursor leaves the toolbar portal div, only start the hide timer if
  // it is NOT moving into the NodeContainer — otherwise cursor approaching from
  // the top would instantly trigger a mouseLeave as it passed through the
  // overlap zone between the portal and NodeContainer's top edge.
  const handleToolbarMouseLeave = useCallback(
    (e: React.MouseEvent) => {
      if (containerRef.current?.contains(e.relatedTarget as Node)) return;
      hideToolbar();
    },
    [hideToolbar]
  );

  // No useMemo: toolbarItemsFn reads filter-active state imperatively at call time.
  // The node only re-renders (and this runs) when nodes = useMemo in GraphInvestigation
  // recomputes — on graph-data or filter changes via the searchFilters dep.
  const toolbarItems: NodeToolbarItem[] = toolbarItemsFn ? toolbarItemsFn(props) : [];

  const isGrouped = showStackedShape(count);
  const countDisplay = getCountDisplay(count);

  // Risk score: derive display value and severity colors matching Entity Analytics.
  // For grouped nodes (min !== max) use the max score to determine severity level.
  const { colors: riskBadgeColors, display: riskScoreDisplay } = computeRiskBadge(
    riskScore,
    euiTheme
  );

  // Sources: aggregate from all documentsData entries (grouped nodes have many), deduped.
  const entitySources = useMemo<string[] | undefined>(() => {
    if (!documentsData?.length) return undefined;
    const seen = new Set<string>();
    const all: string[] = [];
    for (const doc of documentsData) {
      for (const src of doc?.entity?.sources ?? []) {
        if (!seen.has(src)) {
          seen.add(src);
          all.push(src);
        }
      }
    }
    return all.length ? all : undefined;
  }, [documentsData]);

  return (
    <NodeContainer
      ref={containerRef}
      data-test-subj={GRAPH_ENTITY_NODE_ID}
      onMouseEnter={showToolbar}
      onMouseLeave={hideToolbar}
    >
      {/* Floating action toolbar — always in DOM when toolbar items exist so FTR
          tests can find buttons by data-test-subj without relying on hover state.
          Opacity controls visual show/hide; WebDriver ignores opacity for
          interactability checks so FTR can always click the buttons. */}
      {interactive && toolbarItems.length > 0 && (
        <NodeToolbar isVisible={true} position={Position.Top} align="center" offset={-8}>
          <div
            onMouseEnter={showToolbar}
            onMouseLeave={handleToolbarMouseLeave}
            css={css`
              display: flex;
              align-items: center;
              gap: 2px;
              opacity: ${isHovered ? 1 : 0};
              pointer-events: ${isHovered ? 'auto' : 'none'};
              transition: opacity 150ms ease;
            `}
          >
            {toolbarItems.map((item, idx) => (
              <EuiToolTip key={idx} content={item.label} disableScreenReaderOutput>
                <EuiButtonIcon
                  data-test-subj={item.testSubject}
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

      {/* The entity card is shorter than the full NODE_HEIGHT reservation.
          justify-content: center vertically centres the card in the container
          so top: 50% on the handles lands at the card's true visual centre —
          the same dagreNode.y where relationship/event nodes are placed. */}
      <NodeShapeContainer
        css={css`
          display: flex;
          flex-direction: column;
          justify-content: center;
        `}
      >
        {/* Relative wrapper — stacked cards peek from the bottom of EntityCardWrapper */}
        <div
          css={css`
            position: relative;
          `}
        >
          <EntityCardWrapper euiTheme={euiTheme} shadow={shadow}>
            {/* Header row: icon | name+tag | risk badge */}
            <EntityCardHeader>
              <IconBox bgColor={iconBgColor} euiTheme={euiTheme}>
                {isGrouped && (
                  <CountBadge data-test-subj={GRAPH_TAG_COUNT_ID} euiTheme={euiTheme}>
                    {countDisplay}
                  </CountBadge>
                )}
                {icon && (
                  <EuiIcon
                    type={getSpanIcon(icon) ?? icon}
                    size="m"
                    color={color ?? 'primary'}
                    aria-hidden={true}
                  />
                )}
              </IconBox>

              <EntityInfo data-test-subj={GRAPH_ENTITY_NODE_DETAILS_ID}>
                <EuiText size="xs">
                  <EuiTextTruncate
                    text={label ?? ''}
                    truncation="end"
                    css={css`
                      font-weight: ${euiTheme.font.weight.bold};
                      line-height: ${euiTheme.size.l};
                    `}
                  >
                    {(truncated) => truncated}
                  </EuiTextTruncate>
                </EuiText>
                {tag && (
                  <EuiText size="xs" color="subdued">
                    <p
                      data-test-subj={GRAPH_TAG_TEXT_ID}
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

              {/* Right: risk score badge — colors match Entity Analytics RiskScoreCell */}
              <EuiBadge
                data-test-subj={GRAPH_ENTITY_NODE_RISK_BADGE_ID}
                color={riskBadgeColors?.background ?? euiTheme.colors.backgroundBaseSubdued}
                css={css`
                  flex-shrink: 0;
                  white-space: nowrap;
                `}
              >
                <EuiText
                  size="xs"
                  css={css`
                    font-weight: ${euiTheme.font.weight.semiBold};
                    color: ${riskBadgeColors?.text ?? euiTheme.colors.textSubdued};
                  `}
                >
                  {riskScoreDisplay}
                </EuiText>
              </EuiBadge>
            </EntityCardHeader>

            {/* Metadata panel — always visible */}
            <EntityCardMetadata
              data-test-subj={GRAPH_ENTITY_NODE_LAYERS_PANEL_ID}
              euiTheme={euiTheme}
            >
              {isGrouped ? (
                <GroupedMetadataPanel
                  ips={ips}
                  countryCodes={countryCodes}
                  sources={entitySources}
                  assetCriticality={assetCriticality}
                  euiTheme={euiTheme}
                />
              ) : (
                <SingleEntityMetadataPanel
                  ips={ips}
                  countryCodes={countryCodes}
                  sources={entitySources}
                  assetCriticality={assetCriticality}
                  euiTheme={euiTheme}
                />
              )}
            </EntityCardMetadata>
          </EntityCardWrapper>

          {/* Single stacked card peeking from the bottom edge */}
          {showStackedShape(count) && (
            <StackedCard
              data-test-subj={GRAPH_STACKED_SHAPE_ID}
              euiTheme={euiTheme}
              bgColor={iconBgColor}
              bottomOffset={4}
              scale={0.95}
            />
          )}

          {interactive && (
            <>
              {/* Cover only the header row so the button does not steal mouse events
                  from the metadata panel (which has its own interactive elements) or
                  from nodes that are vertically adjacent to the expanded card body.
                  Positioned inside the card wrapper div (position: relative) so y=0
                  refers to the card top, not the NodeShapeContainer top. */}
              <NodeButton
                width={NODE_WIDTH}
                height={ENTITY_CARD_HEADER_HEIGHT}
                onClick={(e) => nodeClick?.(e, props)}
              />
              {/* Expand button — hidden visually when the NodeToolbar is wired, but always
                   present in the DOM so that tests can click it to open the popover.
                   Also inside the card wrapper div so its y offset aligns with the header. */}
              {/* Hidden when the NodeToolbar is shown; FTR tests use the toolbar items directly. */}
              {toolbarItems.length === 0 && (
                <NodeExpandButton
                  color={color}
                  onClick={(e, unToggleCallback) => expandButtonClick?.(e, props, unToggleCallback)}
                  x={`${NODE_WIDTH - NodeExpandButton.ExpandButtonSize}px`}
                  y={`${(ENTITY_CARD_HEADER_HEIGHT - NodeExpandButton.ExpandButtonSize) / 2}px`}
                />
              )}
            </>
          )}
        </div>

        {/* Handles sit at top: 50% of NodeShapeContainer. Because the container
            grows to the card's content height, top: 50% lands at the card's
            visual centre = dagreNode.y, the same point where relationship/event
            nodes are positioned by the layout algorithm. */}
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
