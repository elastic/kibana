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
  EuiToolTip,
  useEuiShadow,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DOCUMENT_TYPE_ENTITY } from '@kbn/cloud-security-posture-common/schema/graph/v1';
import type { EuiThemeComputed } from '@elastic/eui';
import {
  NodeContainer,
  NodeShapeContainer,
  NodeButton,
  HandleStyleOverride,
  useNodeFillColor,
} from './styles';
import { NodeExpandButton } from './node_expand_button';
import { NODE_HEIGHT, NODE_WIDTH } from '../constants';
import {
  GRAPH_ENTITY_NODE_ID,
  GRAPH_ENTITY_NODE_RISK_BADGE_ID,
  GRAPH_ENTITY_NODE_LAYERS_PANEL_ID,
  GRAPH_STACKED_SHAPE_ID,
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
  height: ${NODE_HEIGHT}px;
  padding: 0 8px;
  gap: 8px;
`;

/** Size of the inset icon box inside the header. */
const ICON_BOX_SIZE = 40;

/**
 * Returns the icon box background color for an entity node.
 * Currently a passthrough — icon always uses the node's default fill color.
 * TODO: Map riskScore ranges to semantic EUI severity tokens (separate ticket).
 *       e.g. score >= 70 → danger tint, score >= 40 → warning tint, else → defaultColor.
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
 * Inline risk score badge — floating pill on the right of the header row.
 * Does not stretch to full card height; sits centered alongside the icon.
 */
const RiskBadgeArea = styled.div<{ euiTheme: EuiThemeComputed }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px ${({ euiTheme }) => euiTheme.size.s};
  background: ${({ euiTheme }) => euiTheme.colors.backgroundLightDanger};
  color: ${({ euiTheme }) => euiTheme.colors.danger};
  font-weight: ${({ euiTheme }) => euiTheme.font.weight.bold};
  font-size: ${({ euiTheme }) => euiTheme.size.m};
  white-space: nowrap;
  border-radius: ${({ euiTheme }) => euiTheme.border.radius.medium};
  flex-shrink: 0;
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
  padding: ${({ euiTheme }) => euiTheme.size.s};
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
  height: ${NODE_HEIGHT}px;
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

const RISK_SCORE_LABEL = i18n.translate(
  'securitySolutionPackages.csp.graph.entityNode.metadata.riskScore',
  { defaultMessage: 'Risk score' }
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

const ENTITY_ID_LABEL = i18n.translate(
  'securitySolutionPackages.csp.graph.entityNode.metadata.entityId',
  { defaultMessage: 'Entity ID' }
);

const ENTITY_IDS_OVERFLOW_TOOLTIP_TITLE = i18n.translate(
  'securitySolutionPackages.csp.graph.entityNode.metadata.entityIdsOverflow',
  { defaultMessage: 'Additional entity IDs' }
);

/** Shows the first entity ID with ellipsis ("…") and a hollow "+N" badge for the rest. */
const EntityIdsCell = memo<{ entityIds: string[] }>(({ entityIds }) => {
  const [first, ...rest] = entityIds;
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
            title={ENTITY_IDS_OVERFLOW_TOOLTIP_TITLE}
            content={rest.join(', ')}
          >
            <EuiBadge color="hollow" tabIndex={0}>{`+${rest.length}`}</EuiBadge>
          </EuiToolTip>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
});
EntityIdsCell.displayName = 'EntityIdsCell';

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

/**
 * Shows the risk score range as two colored inline badges:
 * min (blue / primary) — max (red / danger).
 */
const RiskScoreRange = memo<{
  riskScore: { min: number; max: number };
  euiTheme: EuiThemeComputed;
}>(({ riskScore, euiTheme }) => {
  const minStr = riskScore.min.toFixed(2);
  const maxStr = riskScore.max.toFixed(2);
  const badgeBase = css`
    padding: 1px 6px;
    border-radius: ${euiTheme.border.radius.small};
    font-size: ${euiTheme.size.m};
    font-weight: ${euiTheme.font.weight.semiBold};
    white-space: nowrap;
  `;
  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <span
          css={[
            badgeBase,
            css`
              background: ${euiTheme.colors.backgroundLightPrimary};
              color: ${euiTheme.colors.primary};
            `,
          ]}
        >
          {minStr}
        </span>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued">
          <p css={{ margin: 0 }}>{'–'}</p>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <span
          css={[
            badgeBase,
            css`
              background: ${euiTheme.colors.backgroundLightDanger};
              color: ${euiTheme.colors.danger};
            `,
          ]}
        >
          {maxStr}
        </span>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
RiskScoreRange.displayName = 'RiskScoreRange';

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
  entityIds?: string[];
  assetCriticality?: Array<{ level: string; count: number }>;
  riskScore?: { min: number; max: number };
  euiTheme: EuiThemeComputed;
}>(({ ips, countryCodes, sources, entityIds, assetCriticality, riskScore, euiTheme }) => (
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

    {/* Row 3: Entity ID | Risk Score */}
    <MetadataItem euiTheme={euiTheme}>
      <MetadataLabel>{ENTITY_ID_LABEL}</MetadataLabel>
      {entityIds?.length ? (
        <EntityIdsCell entityIds={entityIds} />
      ) : (
        <DashValue euiTheme={euiTheme} />
      )}
    </MetadataItem>
    <MetadataItem euiTheme={euiTheme}>
      <MetadataLabel>{RISK_SCORE_LABEL}</MetadataLabel>
      {riskScore != null ? (
        <RiskScoreRange riskScore={riskScore} euiTheme={euiTheme} />
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
  entityId?: string;
  assetCriticality?: Array<{ level: string; count: number }>;
  riskScore?: { min: number; max: number };
  euiTheme: EuiThemeComputed;
}>(({ ips, countryCodes, sources, entityId, assetCriticality, riskScore, euiTheme }) => (
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

    {/* Row 3: Entity ID | Risk Score */}
    <MetadataItem euiTheme={euiTheme}>
      <MetadataLabel>{ENTITY_ID_LABEL}</MetadataLabel>
      {entityId ? (
        <EuiText size="xs">
          <p
            css={{
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {entityId}
          </p>
        </EuiText>
      ) : (
        <DashValue euiTheme={euiTheme} />
      )}
    </MetadataItem>
    <MetadataItem euiTheme={euiTheme}>
      <MetadataLabel>{RISK_SCORE_LABEL}</MetadataLabel>
      {riskScore != null ? (
        <span
          css={css`
            display: inline-flex;
            align-self: flex-start;
            padding: 1px 6px;
            border-radius: ${euiTheme.border.radius.small};
            background: ${euiTheme.colors.backgroundLightDanger};
            color: ${euiTheme.colors.danger};
            font-size: ${euiTheme.size.m};
            font-weight: ${euiTheme.font.weight.semiBold};
            white-space: nowrap;
          `}
        >
          {riskScore.min.toFixed(2)}
        </span>
      ) : (
        <DashValue euiTheme={euiTheme} />
      )}
    </MetadataItem>
  </>
));
SingleEntityMetadataPanel.displayName = 'SingleEntityMetadataPanel';

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
  // A generous hide-delay (400ms) keeps the toolbar alive while the mouse
  // travels from the card into the toolbar, which lives in a separate DOM
  // subtree and has a small visual gap above the card.
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

  // Compute toolbar items once per render (reflects current filter/relationship state).
  const toolbarItems: NodeToolbarItem[] = useMemo(
    () => (toolbarItemsFn ? toolbarItemsFn(props) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [toolbarItemsFn, props.id]
  );

  const isGrouped = showStackedShape(count);
  const countDisplay = count != null && count > 99 ? '99+' : String(count ?? '');

  // Risk score: header badge shows min–max range (or single value when equal).
  const riskScoreDisplay =
    riskScore == null
      ? 'N/A'
      : riskScore.min === riskScore.max
      ? String(Math.round(riskScore.min))
      : `${Math.round(riskScore.min)}–${Math.round(riskScore.max)}`;

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

  // Entity IDs: collect from entity-type documents (one per entity in the group).
  // For single-entity nodes this is a one-element array.
  const entityIds = useMemo<string[] | undefined>(() => {
    if (!documentsData?.length) return undefined;
    const ids = documentsData
      .filter((doc) => doc.type === DOCUMENT_TYPE_ENTITY)
      .map((doc) => doc.id);
    return ids.length ? ids : undefined;
  }, [documentsData]);

  return (
    <NodeContainer
      data-test-subj={GRAPH_ENTITY_NODE_ID}
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

      <NodeShapeContainer>
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
                {isGrouped && <CountBadge euiTheme={euiTheme}>{countDisplay}</CountBadge>}
                {icon && (
                  <EuiIcon
                    type={getSpanIcon(icon) ?? icon}
                    size="m"
                    color={color ?? 'primary'}
                    aria-hidden={true}
                  />
                )}
              </IconBox>

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

              {/* Right: risk score badge */}
              <RiskBadgeArea data-test-subj={GRAPH_ENTITY_NODE_RISK_BADGE_ID} euiTheme={euiTheme}>
                {riskScoreDisplay}
              </RiskBadgeArea>
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
                  entityIds={entityIds}
                  assetCriticality={assetCriticality}
                  riskScore={riskScore}
                  euiTheme={euiTheme}
                />
              ) : (
                <SingleEntityMetadataPanel
                  ips={ips}
                  countryCodes={countryCodes}
                  sources={entitySources}
                  entityId={entityIds?.[0]}
                  assetCriticality={assetCriticality}
                  riskScore={riskScore}
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
        </div>

        {interactive && (
          <>
            <NodeButton
              width={NODE_WIDTH}
              height={NODE_HEIGHT}
              onClick={(e) => nodeClick?.(e, props)}
            />
            {/* Fallback expand button (hover +/-) — only shown when no toolbar items are wired */}
            {toolbarItems.length === 0 && (
              <NodeExpandButton
                color={color}
                onClick={(e, unToggleCallback) => expandButtonClick?.(e, props, unToggleCallback)}
                x={`${NODE_WIDTH - NodeExpandButton.ExpandButtonSize}px`}
                y={`${(NODE_HEIGHT - NodeExpandButton.ExpandButtonSize) / 2}px`}
              />
            )}
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
