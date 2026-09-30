/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiHealth,
  EuiIcon,
  EuiText,
  EuiTextTruncate,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import styled from '@emotion/styled';
import { i18n } from '@kbn/i18n';
import { Handle, Position } from '@xyflow/react';
import type { EntityNodeViewModel, NodeProps, EntityActionItem } from '../types';
import { GraphNotificationBadge } from '../graph_notification_badge';
import {
  ORIGIN_ENTITY_OUTLINE_BORDER_RADIUS,
  ORIGIN_ENTITY_SIMPLIFIED_OUTLINE_BORDER_RADIUS,
  OriginNodeOutline,
} from './origin_node_outline';
import { NodeButton, HandleStyleOverride, NodeExpandButtonContainer } from './styles';
import { getEntityTypeIcon } from './get_entity_type_icon';
import { getEntityTypeLabel } from './get_entity_type_label';
import { getSpanIcon } from './get_span_icon';
import { getCountryFlag, getCountryName } from './country_flags/country_codes';
import { showStackedShape } from '../utils';
import { useMultipleNodesSelected } from '../../hooks/use_multiple_nodes_selected';
import { GRAPH_NODE_SHADOW } from '../constants';
import {
  EntityHoverActionsToolbar,
  GRAPH_ENTITY_HOVER_ACTIONS_TOOLBAR_ID,
} from './entity_hover_actions_toolbar';
import {
  GRAPH_SIMPLIFIED_ACTIONS_TRIGGER_ID,
  SimplifiedActionsTrigger,
} from './simplified_actions_trigger';
import {
  GRAPH_ENTITY_NODE_ID,
  GRAPH_ENTITY_NODE_HOVER_SHAPE_ID,
  GRAPH_ENTITY_NODE_DETAILS_ID,
  GRAPH_ENTITY_NODE_SIMPLIFIED_LABEL_ID,
  GRAPH_NODE_EXPAND_BUTTON_ID,
} from '../test_ids';

/** Card width per Figma entity component; tightened for compact header-only cards. */
export const CARD_NODE_WIDTH = 220;

/** Minimum / maximum shared entity card width when sizing from the longest label. */
const ENTITY_CARD_WIDTH_MIN = 200;
const ENTITY_CARD_WIDTH_MAX = 320;

/**
 * Header chrome for variant 2D (padding + icon + gaps + risk badge).
 * Label width is added on top when sizing from the longest entity name.
 * Actions live in the hover toolbar above the card — not reserved in the width.
 * Reserves count pill + dual-badge room so group titles like "Macbook Entities" never ellipsize.
 */
const ENTITY_CARD_HEADER_CHROME_WIDTH =
  12 + // pad left
  40 + // icon
  12 + // gap icon → text
  28 + // group count pill
  6 + // gap count → title
  8 + // gap text → badge
  130 + // risk range (~"90.01 - 50.00")
  12; // pad right

/** Approximate Inter bold 12px advance width for entity titles. */
const estimateLabelWidthPx = (label: string): number => Math.ceil(label.length * 7.2);

/**
 * Shared fixed width for all entity cards in a graph, based on the longest label.
 * Keeps cards aligned and avoids leftover space from a one-size 300px default.
 */
export const getEntityCardWidthForLabels = (labels: Array<string | undefined>): number => {
  const maxLabelWidth = labels.reduce((max, label) => {
    if (!label) return max;
    return Math.max(max, estimateLabelWidthPx(label));
  }, 0);
  const width = ENTITY_CARD_HEADER_CHROME_WIDTH + maxLabelWidth;
  return Math.min(ENTITY_CARD_WIDTH_MAX, Math.max(ENTITY_CARD_WIDTH_MIN, width));
};

/** Max layout height for an entity card with all metadata sections visible. */
export const CARD_NODE_DEFAULT_HEIGHT = 296;

/** Metadata body typography per Figma entity card spec. */
const CARD_METADATA_FONT_SIZE = 12;
const CARD_METADATA_LINE_HEIGHT = 16;

const metadataTextCss = css`
  font-size: ${CARD_METADATA_FONT_SIZE}px;
  line-height: ${CARD_METADATA_LINE_HEIGHT}px;
`;

const metadataLabelCss = css`
  ${metadataTextCss}
  font-weight: 600;
`;

const metadataBadgeCss = css`
  ${metadataTextCss}
`;

/** @deprecated Use {@link GRAPH_SIMPLIFIED_ZOOM_THRESHOLD} from `../constants`. */
export { GRAPH_SIMPLIFIED_ZOOM_THRESHOLD as CARD_NODE_INVESTIGATION_ZOOM_THRESHOLD } from '../constants';

/** Shared hover/selected transition for card shadow and expand CTA. */
const CARD_INTERACTIVE_TRANSITION = '0.2s ease';
/** Delay before closing hover-actions so the cursor can reach the toolbar. */
const HOVER_ACTIONS_CLOSE_DELAY_MS = 120;
/** Exit motion duration — keep in sync with toolbar fade-out. */
const HOVER_ACTIONS_EXIT_MS = 140;

/** Card / icon radius — match Figma entity card examples (~8px card, ~6px icon). */
const CARD_BORDER_RADIUS = 8;
const ICON_BORDER_RADIUS = 6;
/** Risk score badge — EuiBadge / Figma pill (fully rounded). */
const RISK_BADGE_BORDER_RADIUS = 999;
const RISK_BADGE_HEIGHT = 20;
const RISK_BADGE_PADDING_X = 8;
const ICON_SIZE = 40;
/** Zoom-out 2D (Figma 14379:4121): icon square matches full-card icon. */
const COMPACT_COLORED_ICON_SIZE = 40;
const COMPACT_COLORED_ICON_GLYPH = 24;
const COMPACT_COLORED_PADDING = 12;
const COMPACT_COLORED_GAP = 8;
/** Simplified (zoomed-out default) entity icon square — 8px larger than the full-card icon box. */
const SIMPLIFIED_ICON_SIZE = 48;
/** Icon glyph inside the simplified square — one step (8px) smaller than the shell. */
const SIMPLIFIED_ICON_INNER_SIZE = SIMPLIFIED_ICON_SIZE - 8;
/** Grouped-entity count blip in simplified mode. */
const SIMPLIFIED_GROUP_COUNT_BADGE_SIZE = 20;
/** Grouped-entity count blip in full-card mode. */
const GROUP_COUNT_BADGE_SIZE = 20;
const GROUP_COUNT_BADGE_FONT_SIZE = 12;
const SIMPLIFIED_LABEL_GAP = 4;
const SIMPLIFIED_LABEL_MAX_WIDTH = CARD_NODE_WIDTH;
const SIMPLIFIED_LABEL_TRUNCATE_LENGTH = 27;
/** Minimum layout footprint for simplified cards (icon + caption). */
export const SIMPLIFIED_CARD_LAYOUT_HEIGHT =
  SIMPLIFIED_ICON_SIZE + SIMPLIFIED_LABEL_GAP + CARD_METADATA_LINE_HEIGHT;
const GROUP_STACK_HEIGHT = 10;
/** Stack layer inset from card edges. */
const GROUP_STACK_PADDING_X = 12;
/** Gap between the card and the stack layer. */
const GROUP_STACK_GAP = 2;
/** Slight opacity on the depth layer so the stack reads as behind the card. */
const GROUP_STACK_LAYER_OPACITY = 0.72;
/** Total vertical space reserved under a group card (gap + 1 layer). */
export const GROUP_STACK_TOTAL_HEIGHT = GROUP_STACK_GAP + GROUP_STACK_HEIGHT;

const simplifiedCardHandleStyle: React.CSSProperties = {
  ...HandleStyleOverride,
  top: SIMPLIFIED_ICON_SIZE / 2,
};

type CriticalityLevel = 'extreme' | 'high' | 'medium' | 'low';
type CriticalityHealthColor = 'danger' | 'risk' | 'warning' | 'neutral';

/** Risk severity bands aligned with Entity Analytics (and Figma entity card variants). */
type EntityRiskLevel = 'critical' | 'high' | 'moderate' | 'low' | 'unknown';

interface EntityRiskTheme {
  /**
   * Variant 2D: header stays plain (`backgroundBasePlain`); this token is unused for fill
   * but kept for optional severity-header experiments.
   */
  headerBackground: string;
  /** Icon square fill — Backgrounds/Light/{Danger|Risk|Warning|Neutral|Text} */
  iconBackground: string;
  /** Icon glyph color — Text/{Danger|Risk|…} */
  accent: string;
  /** Risk score pill fill — Backgrounds/Filled/{Danger|Risk|…} (solid / high emphasis) */
  badgeBackground: string;
  /** Risk score pill text — Text/Inverse on filled badges */
  badgeText: string;
}

const CRITICALITY_HEALTH_COLOR: Record<CriticalityLevel, CriticalityHealthColor> = {
  extreme: 'danger',
  high: 'risk',
  medium: 'warning',
  low: 'neutral',
};

// ── Styled shells ─────────────────────────────────────────────────────────────

const CardWrapper = styled.div<{
  $width?: number;
  $fitContent?: boolean;
}>`
  position: relative;
  width: ${({ $fitContent, $width }) =>
    $fitContent ? 'max-content' : `${$width ?? CARD_NODE_WIDTH}px`};
  overflow: visible;
`;

const SimplifiedCardContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${SIMPLIFIED_LABEL_GAP}px;
  width: max-content;
  min-width: ${SIMPLIFIED_ICON_SIZE}px;
  min-height: ${SIMPLIFIED_CARD_LAYOUT_HEIGHT}px;
  max-width: ${SIMPLIFIED_LABEL_MAX_WIDTH}px;
  overflow: visible;
`;

const CardShell = styled.div<{
  defaultBorderColor: string;
  activeBorderColor: string;
  bgColor: string;
  $defaultShadow?: string;
  $hoverShadow?: string;
}>`
  position: relative;
  width: 100%;
  border: 1px solid ${({ defaultBorderColor }) => defaultBorderColor};
  border-radius: ${CARD_BORDER_RADIUS}px;
  background: ${({ bgColor }) => bgColor};
  /* Shadow must live on this element — do not set overflow:hidden here or it clips. */
  ${({ $defaultShadow }) => $defaultShadow ?? ''}
  transition: border-color ${CARD_INTERACTIVE_TRANSITION}, box-shadow ${CARD_INTERACTIVE_TRANSITION};

  .react-flow__node:not(.non-interactive):hover:not(.dragging) & {
    ${({ $hoverShadow }) => $hoverShadow ?? ''}
  }

  /* Selected: primary border color only — keep width fixed to avoid layout "hug". */
  .react-flow__node:not(.non-interactive).selected:not(.dragging) &,
  .react-flow__node:not(.non-interactive).dragging & {
    border-color: ${({ activeBorderColor }) => activeBorderColor};
  }
`;

/** Clips header/body to the card radius without eating the outer box-shadow. */
const CardShellClip = styled.div`
  overflow: hidden;
  border-radius: inherit;
`;

const CardHeader = styled.div<{
  bgColor: string;
  $dividerColor?: string;
}>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: ${({ bgColor }) => bgColor};
  position: relative;
  ${({ $dividerColor }) => ($dividerColor ? `border-bottom: 1px solid ${$dividerColor};` : '')}
`;

const IconBox = styled.div<{
  bgColor: string;
  emphasizedBackgroundColor: string;
}>`
  position: relative;
  flex-shrink: 0;
  width: ${ICON_SIZE}px;
  height: ${ICON_SIZE}px;
  border-radius: ${ICON_BORDER_RADIUS}px;
  /* Entity card icon: light risk fill + glyph only — no border. */
  border: none;
  background: ${({ bgColor }) => bgColor};
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.15s ease;

  .react-flow__node:not(.non-interactive):hover:not(.selected):not(.dragging) & {
    background: ${({ emphasizedBackgroundColor }) => emphasizedBackgroundColor};
  }
`;

const IconCountBadge = styled.div`
  position: absolute;
  top: -6px;
  left: -6px;
  z-index: 1;
`;

const SimplifiedIconCountBadge = styled.div`
  position: absolute;
  top: -6px;
  left: -6px;
  z-index: 1;
`;

const EntityGroupCountBadge = ({
  count,
  isSimplified = false,
}: {
  count: number;
  isSimplified?: boolean;
}) => {
  const { euiTheme } = useEuiTheme();
  const label = count > 99 ? '99+' : String(count);
  const badgeSize = isSimplified ? SIMPLIFIED_GROUP_COUNT_BADGE_SIZE : GROUP_COUNT_BADGE_SIZE;

  const badgeCss = css`
    ${metadataTextCss}
    font-size: ${GROUP_COUNT_BADGE_FONT_SIZE}px;
    line-height: ${GROUP_COUNT_BADGE_FONT_SIZE}px;
    font-weight: ${euiTheme.font.weight.medium};
    background-color: ${euiTheme.colors.backgroundFilledText};
    color: ${euiTheme.colors.textInverse};
    height: ${badgeSize}px;
    min-width: ${badgeSize}px;
    padding-inline: 4px;
  `;

  return (
    <GraphNotificationBadge size="s" css={badgeCss}>
      {label}
    </GraphNotificationBadge>
  );
};

const HeaderText = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  /* Figma Spaces/XXS between title and entity type */
  gap: 2px;
`;

const HeaderTitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
`;

/** Hosts + risk range — bottom row of the group header (risk bottom-aligned). */
const HeaderSecondaryRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
`;

const RiskBadgesRow = styled.div`
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 4px;
`;

const CardBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 12px;
`;

const MetadataRow = styled.div`
  display: flex;
  gap: 12px;
  align-items: flex-start;
`;

const MetadataField = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const MetadataValueRow = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: ${CARD_METADATA_LINE_HEIGHT}px;
`;

const CriticalityGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: 8px;
  row-gap: 4px;
`;

const GroupStackWrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  margin-top: ${GROUP_STACK_GAP}px;
  padding: 0 ${GROUP_STACK_PADDING_X}px;
`;

const GroupStackTab = styled.div<{
  defaultBorderColor: string;
  activeBorderColor: string;
  bgColor: string;
}>`
  height: ${GROUP_STACK_HEIGHT}px;
  border-left: 1.5px solid ${({ defaultBorderColor }) => defaultBorderColor};
  border-right: 1.5px solid ${({ defaultBorderColor }) => defaultBorderColor};
  border-bottom: 1.5px solid ${({ defaultBorderColor }) => defaultBorderColor};
  border-bottom-left-radius: ${CARD_BORDER_RADIUS}px;
  border-bottom-right-radius: ${CARD_BORDER_RADIUS}px;
  background: ${({ bgColor }) => bgColor};
  opacity: ${GROUP_STACK_LAYER_OPACITY};
  transition: border-color ${CARD_INTERACTIVE_TRANSITION};

  .react-flow__node:not(.non-interactive).selected &,
  .react-flow__node:not(.non-interactive).dragging & {
    border-left-color: ${({ activeBorderColor }) => activeBorderColor};
    border-right-color: ${({ activeBorderColor }) => activeBorderColor};
    border-bottom-color: ${({ activeBorderColor }) => activeBorderColor};
  }
`;

const SimplifiedIconShell = styled.div`
  position: relative;
  width: ${SIMPLIFIED_ICON_SIZE}px;
  height: ${SIMPLIFIED_ICON_SIZE}px;
  flex-shrink: 0;
  /* Let Borealis Shadow/X-small paint outside the 48px icon square. */
  overflow: visible;
`;

const SimplifiedIconBox = styled.div<{
  activeBorderColor: string;
  bgColor: string;
  defaultShadow?: string;
  hoverShadow?: string;
}>`
  width: 100%;
  height: 100%;
  border-radius: ${ICON_BORDER_RADIUS}px;
  /* Zoom-out entity icon (PDF): light fill + shadow only — no border. */
  border: 2px solid transparent;
  background: ${({ bgColor }) => bgColor};
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
  ${({ defaultShadow }) => defaultShadow ?? ''}
  transition: background-color 0.15s ease, box-shadow ${CARD_INTERACTIVE_TRANSITION},
    border-color ${CARD_INTERACTIVE_TRANSITION};

  .react-flow__node:not(.non-interactive):hover:not(.dragging) & {
    ${({ hoverShadow }) => hoverShadow ?? ''}
  }

  .react-flow__node:not(.non-interactive).selected:not(.dragging) &,
  .react-flow__node:not(.non-interactive).dragging & {
    border-color: ${({ activeBorderColor }) => activeBorderColor};
  }
`;

// ── Helpers ───────────────────────────────────────────────────────────────────

const resolveIcon = (icon?: string, tag?: string) => {
  if (icon) {
    const spanIcon = getSpanIcon(icon);
    if (spanIcon) return spanIcon;
    if (/^[a-zA-Z]/.test(icon)) return icon;
  }
  return getEntityTypeIcon(tag);
};

/**
 * Stacked-cards glyph for group entity cards — resolved via {@link getSpanIcon}
 * → `group_entities.svg` (stroke + bottom peek layer per Figma).
 */
export const GROUP_ENTITY_ICON = 'group_entities';

/** Icon for group entity cards — always the stacked-cards glyph. */
export const GROUP_CARD_ICON = GROUP_ENTITY_ICON;

/**
 * @deprecated Prefer the group node's `label` (subtype title) + count pill.
 * Kept for callers that still format a combined "N Entities" string.
 */
export const getGroupEntitiesLabel = (count: number): string =>
  i18n.translate('securitySolutionPackages.csp.graph.node.card.groupEntitiesCount', {
    defaultMessage: '{count} {count, plural, one {Entity} other {Entities}}',
    values: { count },
  });

/** Figma card subtitle — plural type labels ("Hosts", "Users", …). */
const formatEntityTypeSubtitle = (typeLabel?: string): string | undefined => {
  if (!typeLabel) return undefined;
  const normalized = typeLabel.trim();
  const pluralBySingular: Record<string, string> = {
    Host: 'Hosts',
    User: 'Users',
    Service: 'Services',
    Entity: 'Entities',
  };
  return pluralBySingular[normalized] ?? normalized;
};

const getEntityRiskLevel = (score?: number): EntityRiskLevel => {
  if (score === undefined) return 'unknown';
  // Align with Entity Analytics severity bands.
  if (score >= 90) return 'critical';
  if (score >= 70) return 'high';
  if (score >= 40) return 'moderate';
  if (score >= 20) return 'low';
  return 'unknown';
};

/**
 * Borealis tokens for entity card variant 2D:
 * - header: plain (Backgrounds/Base/Plain) — applied by caller
 * - icon: Backgrounds/Light/*
 * - badge: Backgrounds/Filled/* + Text/Inverse
 */
const getEntityRiskTheme = (
  level: EntityRiskLevel,
  colors: {
    backgroundBaseDanger: string;
    backgroundBaseRisk: string;
    backgroundBaseWarning: string;
    backgroundBaseNeutral: string;
    backgroundBasePrimary: string;
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
): EntityRiskTheme => {
  switch (level) {
    case 'critical':
      return {
        headerBackground: colors.backgroundBaseDanger,
        iconBackground: colors.backgroundLightDanger,
        accent: colors.textDanger,
        badgeBackground: colors.backgroundFilledDanger,
        badgeText: colors.textInverse,
      };
    case 'high':
      return {
        headerBackground: colors.backgroundBaseRisk,
        iconBackground: colors.backgroundLightRisk,
        accent: colors.textRisk,
        badgeBackground: colors.backgroundFilledRisk,
        badgeText: colors.textInverse,
      };
    case 'moderate':
      return {
        headerBackground: colors.backgroundBaseWarning,
        iconBackground: colors.backgroundLightWarning,
        accent: colors.textWarning,
        badgeBackground: colors.backgroundFilledWarning,
        badgeText: colors.textInverse,
      };
    case 'low':
      return {
        headerBackground: colors.backgroundBaseNeutral,
        iconBackground: colors.backgroundLightNeutral,
        accent: colors.textNeutral,
        badgeBackground: colors.backgroundFilledNeutral,
        badgeText: colors.textInverse,
      };
    case 'unknown':
    default:
      return {
        headerBackground: colors.backgroundBasePrimary,
        iconBackground: colors.backgroundLightText,
        accent: colors.textParagraph,
        badgeBackground: colors.backgroundFilledText,
        badgeText: colors.textInverse,
      };
  }
};

/** Single score used for compact risk indicators (prefer max when range). */
const getDisplayRiskScore = (
  riskScore?: number,
  riskScoreMin?: number,
  riskScoreMax?: number
): number | undefined => {
  if (riskScore !== undefined) {
    return riskScore;
  }
  if (riskScoreMax !== undefined) {
    return riskScoreMax;
  }
  return riskScoreMin;
};

const formatOverflowCount = (extraCount: number): string => {
  if (extraCount <= 0) return '';
  return extraCount > 99 ? '+99' : `+${extraCount}`;
};

const getCriticalityHealthColor = (level: string): CriticalityHealthColor => {
  const normalized = level.toLowerCase().replace(/\s+impact$/, '') as CriticalityLevel;
  return CRITICALITY_HEALTH_COLOR[normalized] ?? 'neutral';
};

// ── Sub-components ────────────────────────────────────────────────────────────

const FieldLabel = ({ children }: { children: React.ReactNode }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiText
      css={css`
        ${metadataLabelCss}
        color: ${euiTheme.colors.textSubdued};
      `}
    >
      {children}
    </EuiText>
  );
};

const FieldValue = ({ children, truncate }: { children: React.ReactNode; truncate?: boolean }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiText
      css={css`
        ${metadataTextCss}
        color: ${euiTheme.colors.textParagraph};
        ${truncate
          ? `
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      `
          : `
        word-break: break-all;
      `}
      `}
    >
      {children}
    </EuiText>
  );
};

const OverflowBadge = ({ count }: { count: number }) => {
  const label = formatOverflowCount(count);
  if (!label) return null;

  return (
    <GraphNotificationBadge size="m" color="subdued" css={metadataBadgeCss}>
      {label}
    </GraphNotificationBadge>
  );
};

const CRITICALITY_LEVEL_ORDER = ['extreme', 'high', 'medium', 'low'] as const;

const CRITICALITY_IMPACT_LABEL: Record<(typeof CRITICALITY_LEVEL_ORDER)[number], string> = {
  extreme: 'Extreme impact',
  high: 'High impact',
  medium: 'Medium impact',
  low: 'Low impact',
};

const CriticalityCountsGrid = ({
  counts,
}: {
  counts: NonNullable<EntityNodeViewModel['assetCriticalityCounts']>;
}) => (
  <CriticalityGrid>
    {CRITICALITY_LEVEL_ORDER.flatMap((level) => {
      const val = counts[level];
      if (!val) return [];
      return [
        <EuiHealth
          key={level}
          color={CRITICALITY_HEALTH_COLOR[level]}
          textSize="inherit"
          css={metadataTextCss}
        >
          {`${val} ${level}`}
        </EuiHealth>,
      ];
    })}
  </CriticalityGrid>
);

/** Group cards: highest → lowest impact present in the aggregated counts. */
const CriticalityRange = ({
  counts,
}: {
  counts: NonNullable<EntityNodeViewModel['assetCriticalityCounts']>;
}) => {
  const present = CRITICALITY_LEVEL_ORDER.filter((level) => (counts[level] ?? 0) > 0);
  if (present.length === 0) return null;

  const highest = present[0];
  const lowest = present[present.length - 1];

  if (highest === lowest) {
    return (
      <EuiHealth color={CRITICALITY_HEALTH_COLOR[highest]} textSize="inherit" css={metadataTextCss}>
        {CRITICALITY_IMPACT_LABEL[highest]}
      </EuiHealth>
    );
  }

  return (
    <div
      css={css`
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
      `}
    >
      <EuiHealth color={CRITICALITY_HEALTH_COLOR[highest]} textSize="inherit" css={metadataTextCss}>
        {CRITICALITY_IMPACT_LABEL[highest]}
      </EuiHealth>
      <EuiText css={metadataTextCss}>{'-'}</EuiText>
      <EuiHealth color={CRITICALITY_HEALTH_COLOR[lowest]} textSize="inherit" css={metadataTextCss}>
        {CRITICALITY_IMPACT_LABEL[lowest]}
      </EuiHealth>
    </div>
  );
};

/** Derive a short subtype label from a group title (e.g. "Macbook Entities" → "Macbook"). */
const getGroupSubTypeLabel = (groupLabel?: string): string | undefined => {
  if (!groupLabel) return undefined;
  const trimmed = groupLabel.trim();
  const withoutSuffix = trimmed.replace(
    /\s+(entities|instances|buckets|hosts|users|services)$/i,
    ''
  );
  return withoutSuffix || trimmed;
};

interface CardActionsButtonProps {
  onClick?: (e: React.MouseEvent<HTMLElement>, unToggleCallback: () => void) => void;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  /** When true, button sits in the card header (always visible). */
  inHeader?: boolean;
}

const CardActionsButton = ({ onClick, containerRef, inHeader = false }: CardActionsButtonProps) => {
  const { euiTheme } = useEuiTheme();
  const [isToggled, setIsToggled] = React.useState(false);

  const unToggleCallback = useCallback(() => {
    setIsToggled(false);
  }, []);

  const onClickHandler = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      e.stopPropagation();
      setIsToggled((curr) => !curr);
      onClick?.(e, unToggleCallback);
    },
    [onClick, unToggleCallback]
  );

  const actionsLabel = i18n.translate(
    'securitySolutionPackages.csp.graph.node.card.expandActions',
    { defaultMessage: 'Actions' }
  );

  if (inHeader) {
    return (
      <div
        ref={containerRef}
        className={isToggled ? 'toggled' : undefined}
        css={css`
          flex-shrink: 0;
          position: relative;
          z-index: 3;
        `}
      >
        <EuiToolTip content={actionsLabel} position="top" disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="boxesVertical"
            aria-label={actionsLabel}
            data-test-subj={GRAPH_NODE_EXPAND_BUTTON_ID}
            color="text"
            display="empty"
            size="xs"
            onClick={onClickHandler}
          />
        </EuiToolTip>
      </div>
    );
  }

  return (
    <NodeExpandButtonContainer
      ref={containerRef}
      className={isToggled ? 'toggled' : undefined}
      css={css`
        position: absolute;
        z-index: 2;
        right: -10px;
        top: 50%;
        transform: translateY(-50%);
      `}
    >
      <EuiToolTip content={actionsLabel} position="top" disableScreenReaderOutput>
        <EuiButtonIcon
          iconType="boxesVertical"
          aria-label={actionsLabel}
          data-test-subj={GRAPH_NODE_EXPAND_BUTTON_ID}
          color="text"
          display="empty"
          size="xs"
          onClick={onClickHandler}
          css={css`
            background-color: ${euiTheme.colors.backgroundBasePlain};
            border: 1px solid ${euiTheme.colors.borderBaseSubdued};
          `}
        />
      </EuiToolTip>
    </NodeExpandButtonContainer>
  );
};

const RiskScoreBadge = ({ score }: { score: number }) => {
  const { euiTheme } = useEuiTheme();
  const theme = getEntityRiskTheme(getEntityRiskLevel(score), euiTheme.colors);

  return (
    <EuiBadge
      color="hollow"
      css={css`
        ${metadataTextCss}
        display: inline-flex;
        align-items: center;
        justify-content: center;
        height: ${RISK_BADGE_HEIGHT}px;
        padding: 0 ${RISK_BADGE_PADDING_X}px;
        /* Figma default entity card: light severity fill + accent text (not filled/inverse). */
        background-color: ${theme.iconBackground};
        color: ${theme.accent};
        border: none;
        border-radius: ${RISK_BADGE_BORDER_RADIUS}px;
        font-weight: ${euiTheme.font.weight.medium};
        line-height: ${euiTheme.size.base};
      `}
    >
      {score.toFixed(2)}
    </EuiBadge>
  );
};

/**
 * Count badge beside the group title — Figma filled accent notification chip
 * (magenta/plum square, white numeral), not a light hollow pill.
 */
const GroupCountPill = ({ count }: { count: number }) => {
  const { euiTheme } = useEuiTheme();
  const label = count > 99 ? '99+' : String(count);

  return (
    <GraphNotificationBadge
      size="s"
      css={css`
        ${metadataTextCss}
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        height: ${GROUP_COUNT_BADGE_SIZE}px;
        min-width: ${GROUP_COUNT_BADGE_SIZE}px;
        padding: 0 4px;
        background-color: ${euiTheme.colors.backgroundFilledAccent};
        color: ${euiTheme.colors.textInverse};
        border: none;
        border-radius: ${euiTheme.border.radius.small};
        font-size: ${GROUP_COUNT_BADGE_FONT_SIZE}px;
        font-weight: ${euiTheme.font.weight.medium};
        line-height: ${GROUP_COUNT_BADGE_FONT_SIZE}px;
      `}
    >
      {label}
    </GraphNotificationBadge>
  );
};

// ── Simplified (zoomed-out) card ──────────────────────────────────────────────

interface SimplifiedCardProps {
  isGroup: boolean;
  resolvedIcon: string | React.ComponentType;
  count?: number;
  activeBorderColor: string;
  iconBg: string;
  iconAccent: string;
  originOutlineColor: string;
  highlightAsOrigin?: boolean;
  defaultShadow?: string;
  hoverShadow?: string;
  interactive?: boolean;
  showExpandButton?: boolean;
  nodeClick?: EntityNodeViewModel['nodeClick'];
  nodeProps: NodeProps;
  caption: string;
  showHoverActionsToolbar?: boolean;
  getHoverActionItems?: () => EntityActionItem[];
  hoverToolbarExiting?: boolean;
  /** Test A / button zoom-out: show `⋯` trigger on the right with slide/fade motion. */
  showActionsTrigger?: boolean;
  actionsTriggerExiting?: boolean;
  onActionsTriggerClick?: (e: React.MouseEvent<HTMLElement>, unToggleCallback: () => void) => void;
  onActionsHoverOpen?: (e: React.MouseEvent<HTMLElement>) => void;
  onActionsHoverLeave?: (e: React.MouseEvent<HTMLElement>) => void;
  hoverContainerRef?: React.RefObject<HTMLDivElement | null>;
}

const SimplifiedCardLabel = ({ text, isGroup }: { text: string; isGroup: boolean }) => {
  const { euiTheme } = useEuiTheme();

  const labelCss = css`
    ${metadataTextCss}
    font-weight: ${euiTheme.font.weight.bold};
    color: ${isGroup ? euiTheme.colors.textSubdued : euiTheme.colors.textHeading};
    text-align: center;
    width: 100%;
  `;

  if (text.length <= SIMPLIFIED_LABEL_TRUNCATE_LENGTH) {
    return (
      <EuiText css={labelCss} data-test-subj={GRAPH_ENTITY_NODE_SIMPLIFIED_LABEL_ID}>
        {text}
      </EuiText>
    );
  }

  return (
    <EuiToolTip content={text} display="block">
      <EuiTextTruncate
        data-test-subj={GRAPH_ENTITY_NODE_SIMPLIFIED_LABEL_ID}
        truncation="middle"
        text={text}
        width={SIMPLIFIED_LABEL_MAX_WIDTH}
        css={labelCss}
      />
    </EuiToolTip>
  );
};

const SimplifiedCard = ({
  isGroup,
  resolvedIcon,
  count,
  activeBorderColor,
  iconBg,
  iconAccent,
  originOutlineColor,
  highlightAsOrigin = false,
  defaultShadow,
  hoverShadow,
  interactive,
  showExpandButton = true,
  nodeClick,
  nodeProps,
  caption,
  showHoverActionsToolbar = false,
  getHoverActionItems,
  hoverToolbarExiting = false,
  showActionsTrigger = false,
  actionsTriggerExiting = false,
  onActionsTriggerClick,
  onActionsHoverOpen,
  onActionsHoverLeave,
  hoverContainerRef,
}: SimplifiedCardProps) => (
  <CardWrapper
    ref={hoverContainerRef}
    $fitContent
    data-test-subj={GRAPH_ENTITY_NODE_ID}
    onMouseEnter={onActionsHoverOpen}
    onMouseLeave={onActionsHoverLeave}
  >
    {showHoverActionsToolbar && getHoverActionItems && (
      <EntityHoverActionsToolbar getItems={getHoverActionItems} isExiting={hoverToolbarExiting} />
    )}
    <SimplifiedCardContainer>
      <SimplifiedIconShell>
        {highlightAsOrigin && (
          <OriginNodeOutline
            borderColor={originOutlineColor}
            borderRadius={ORIGIN_ENTITY_SIMPLIFIED_OUTLINE_BORDER_RADIUS}
          />
        )}
        <SimplifiedIconBox
          activeBorderColor={activeBorderColor}
          bgColor={iconBg}
          defaultShadow={defaultShadow}
          hoverShadow={hoverShadow}
          data-test-subj={GRAPH_ENTITY_NODE_HOVER_SHAPE_ID}
        >
          {isGroup && count !== undefined && (
            <SimplifiedIconCountBadge>
              <EntityGroupCountBadge count={count} isSimplified={true} />
            </SimplifiedIconCountBadge>
          )}
          <EuiIcon
            type={resolvedIcon}
            size="l"
            color={iconAccent}
            aria-hidden={true}
            css={css`
              svg {
                width: ${SIMPLIFIED_ICON_INNER_SIZE}px;
                height: ${SIMPLIFIED_ICON_INNER_SIZE}px;
              }
            `}
          />
        </SimplifiedIconBox>

        {showExpandButton && showActionsTrigger && (
          <SimplifiedActionsTrigger
            isExiting={actionsTriggerExiting}
            onClick={onActionsTriggerClick}
          />
        )}

        {interactive && (
          <NodeButton
            onClick={(e) => nodeClick?.(e, nodeProps)}
            width={SIMPLIFIED_ICON_SIZE}
            height={SIMPLIFIED_ICON_SIZE}
            css={css`
              position: absolute;
              inset: 0;
              z-index: 1;
            `}
          />
        )}
      </SimplifiedIconShell>

      <SimplifiedCardLabel text={caption} isGroup={isGroup} />
    </SimplifiedCardContainer>

    <Handle
      type="target"
      isConnectable={false}
      position={Position.Left}
      id="in"
      style={simplifiedCardHandleStyle}
    />
    <Handle
      type="source"
      isConnectable={false}
      position={Position.Right}
      id="out"
      style={simplifiedCardHandleStyle}
    />
  </CardWrapper>
);

/**
 * Entity Colors zoom-out (Figma 2D / 14379:4121):
 * plain white card, risk-light icon (40px), filled risk badge pill below.
 */
const CompactColoredCard = ({
  isGroup,
  resolvedIcon,
  count,
  defaultBorderColor,
  activeBorderColor,
  cardBg,
  iconBg,
  iconAccent,
  originOutlineColor,
  highlightAsOrigin = false,
  defaultShadow,
  hoverShadow,
  interactive,
  nodeClick,
  nodeProps,
  riskScore,
  showHoverActionsToolbar = false,
  getHoverActionItems,
  hoverToolbarExiting = false,
  onActionsHoverOpen,
  onActionsHoverLeave,
  hoverContainerRef,
}: {
  isGroup: boolean;
  resolvedIcon: string | React.ComponentType;
  count?: number;
  defaultBorderColor: string;
  activeBorderColor: string;
  cardBg: string;
  iconBg: string;
  iconAccent: string;
  originOutlineColor: string;
  highlightAsOrigin?: boolean;
  defaultShadow?: string;
  hoverShadow?: string;
  interactive?: boolean;
  nodeClick?: EntityNodeViewModel['nodeClick'];
  nodeProps: NodeProps;
  riskScore?: number;
  showHoverActionsToolbar?: boolean;
  getHoverActionItems?: () => EntityActionItem[];
  hoverToolbarExiting?: boolean;
  onActionsHoverOpen?: (e: React.MouseEvent<HTMLElement>) => void;
  onActionsHoverLeave?: (e: React.MouseEvent<HTMLElement>) => void;
  hoverContainerRef?: React.RefObject<HTMLDivElement | null>;
}) => {
  return (
    <CardWrapper
      ref={hoverContainerRef}
      $fitContent
      data-test-subj={GRAPH_ENTITY_NODE_ID}
      onMouseEnter={onActionsHoverOpen}
      onMouseLeave={onActionsHoverLeave}
    >
      {showHoverActionsToolbar && getHoverActionItems && (
        <EntityHoverActionsToolbar getItems={getHoverActionItems} isExiting={hoverToolbarExiting} />
      )}
      {highlightAsOrigin && (
        <OriginNodeOutline
          borderColor={originOutlineColor}
          borderRadius={ORIGIN_ENTITY_OUTLINE_BORDER_RADIUS}
        />
      )}
      <CardShell
        defaultBorderColor={defaultBorderColor}
        activeBorderColor={activeBorderColor}
        bgColor={cardBg}
        $defaultShadow={defaultShadow}
        $hoverShadow={hoverShadow}
        css={css`
          width: max-content;
        `}
      >
        <CardShellClip>
          <div
            data-test-subj={GRAPH_ENTITY_NODE_HOVER_SHAPE_ID}
            css={css`
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              gap: ${COMPACT_COLORED_GAP}px;
              padding: ${COMPACT_COLORED_PADDING}px;
            `}
          >
            <div
              css={css`
                position: relative;
                width: ${COMPACT_COLORED_ICON_SIZE}px;
                height: ${COMPACT_COLORED_ICON_SIZE}px;
                border-radius: ${ICON_BORDER_RADIUS}px;
                background: ${iconBg};
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                overflow: hidden;
              `}
            >
              {isGroup && count !== undefined && (
                <IconCountBadge>
                  <EntityGroupCountBadge count={count} />
                </IconCountBadge>
              )}
              <EuiIcon
                type={resolvedIcon}
                size="l"
                color={iconAccent}
                aria-hidden={true}
                css={css`
                  svg {
                    width: ${COMPACT_COLORED_ICON_GLYPH}px;
                    height: ${COMPACT_COLORED_ICON_GLYPH}px;
                  }
                `}
              />
            </div>
            {riskScore !== undefined && <RiskScoreBadge score={riskScore} />}
          </div>
        </CardShellClip>
      </CardShell>

      {interactive && (
        <NodeButton
          onClick={(e) => nodeClick?.(e, nodeProps)}
          css={css`
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            z-index: 1;
          `}
        />
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
    </CardWrapper>
  );
};

// ── Card node ─────────────────────────────────────────────────────────────────

export const CardNode = memo<NodeProps>((props: NodeProps) => {
  const {
    icon,
    label,
    tag,
    shape,
    documentsData,
    count,
    ips,
    countryCodes,
    interactive,
    expandButtonClick,
    nodeClick,
    ipClickHandler,
    countryClickHandler,
    showEntityId,
    assetCriticality,
    assetCriticalityCounts,
    riskScore,
    riskScoreMin,
    riskScoreMax,
    sources,
    highlightAsOrigin = false,
    entityActionsMode = 'hover',
    entityStyleMode = 'default',
    closeEntityActions,
    getEntityActionItems,
    cardWidth: cardWidthProp,
  } = props.data as EntityNodeViewModel;

  const cardWidth = cardWidthProp ?? CARD_NODE_WIDTH;

  const { euiTheme } = useEuiTheme();
  // Figma Graph viz (13969:1176) — X-small Level 2, keep elevation subtle on hover too.
  const defaultShadow = GRAPH_NODE_SHADOW;
  const hoverShadow = GRAPH_NODE_SHADOW;
  const isMultipleNodesSelected = useMultipleNodesSelected();
  // No `⋯` on the entity card — action buttons appear above the card on hover only.

  const hoverContainerRef = useRef<HTMLDivElement>(null);
  const hoverCloseTimerRef = useRef<number | null>(null);
  const revealsActionsOnHover = interactive && !isMultipleNodesSelected;
  const [hoverToolbarState, setHoverToolbarState] = useState<'closed' | 'open' | 'exiting'>(
    'closed'
  );
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const [metadataFiltersOpen, setMetadataFiltersOpen] = useState(false);
  const isHoverActionsVisible =
    hoverToolbarState !== 'closed' || actionsMenuOpen || metadataFiltersOpen;

  const clearHoverCloseTimer = useCallback(() => {
    if (hoverCloseTimerRef.current != null) {
      window.clearTimeout(hoverCloseTimerRef.current);
      hoverCloseTimerRef.current = null;
    }
  }, []);

  const setEntityHoverFocus = useCallback((active: boolean) => {
    const container = hoverContainerRef.current;
    const nodeEl = container?.closest('.react-flow__node');
    const flowEl = container?.closest('.react-flow');
    if (!nodeEl || !flowEl) {
      return;
    }

    if (active) {
      flowEl.classList.add('graph-entity-actions-hover');
      nodeEl.classList.add('graph-actions-hover-active');
      return;
    }

    nodeEl.classList.remove('graph-actions-hover-active');
    if (!flowEl.querySelector('.graph-actions-hover-active')) {
      flowEl.classList.remove('graph-entity-actions-hover');
    }
  }, []);

  const closeHoverActions = useCallback(() => {
    clearHoverCloseTimer();
    setHoverToolbarState((current) => (current === 'closed' ? current : 'exiting'));
    hoverCloseTimerRef.current = window.setTimeout(() => {
      setHoverToolbarState('closed');
      setEntityHoverFocus(false);
      closeEntityActions?.();
    }, HOVER_ACTIONS_EXIT_MS);
  }, [clearHoverCloseTimer, closeEntityActions, setEntityHoverFocus]);

  const onMetadataPopoverOpenChange = useCallback(
    (isOpen: boolean) => {
      setMetadataFiltersOpen(isOpen);
      if (isOpen) {
        clearHoverCloseTimer();
        return;
      }
      // Popover portals outside the card — if the pointer already left, dismiss chrome.
      window.requestAnimationFrame(() => {
        const container = hoverContainerRef.current;
        if (!container?.matches(':hover')) {
          closeHoverActions();
        }
      });
    },
    [clearHoverCloseTimer, closeHoverActions]
  );

  const onActionsHoverOpen = useCallback(() => {
    if (!revealsActionsOnHover) {
      return;
    }
    clearHoverCloseTimer();
    setHoverToolbarState('open');
    setEntityHoverFocus(true);
  }, [revealsActionsOnHover, clearHoverCloseTimer, setEntityHoverFocus]);

  const onActionsHoverLeave = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (!revealsActionsOnHover) {
        return;
      }

      // Keep chrome while the classic Action Menu or Entity Metadata popover is open.
      if (actionsMenuOpen || metadataFiltersOpen) {
        return;
      }

      const related = e.relatedTarget;
      if (
        related instanceof Element &&
        (related.closest(`[data-test-subj="${GRAPH_ENTITY_HOVER_ACTIONS_TOOLBAR_ID}"]`) ||
          related.closest(`[data-test-subj="${GRAPH_SIMPLIFIED_ACTIONS_TRIGGER_ID}"]`) ||
          related.closest('.euiPopover'))
      ) {
        return;
      }

      clearHoverCloseTimer();
      hoverCloseTimerRef.current = window.setTimeout(() => {
        closeHoverActions();
      }, HOVER_ACTIONS_CLOSE_DELAY_MS);
    },
    [
      revealsActionsOnHover,
      actionsMenuOpen,
      metadataFiltersOpen,
      clearHoverCloseTimer,
      closeHoverActions,
    ]
  );

  useEffect(
    () => () => {
      clearHoverCloseTimer();
      setEntityHoverFocus(false);
    },
    [clearHoverCloseTimer, setEntityHoverFocus]
  );

  const entityTypeLabel = formatEntityTypeSubtitle(
    getEntityTypeLabel({ tag, icon, shape, documentsData })
  );
  const isGroup = showStackedShape(count);

  const headerNameCss = css`
    ${metadataTextCss}
    font-weight: ${euiTheme.font.weight.bold};
    color: ${euiTheme.colors.textHeading};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `;

  const headerEntityTypeCss = css`
    ${metadataTextCss}
    font-weight: ${euiTheme.font.weight.regular};
    color: ${euiTheme.colors.textSubdued};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `;

  const entityName = label ?? props.id;
  // Single: entity name. Group: subtype title from `label` (e.g. "EC2 instances").
  const headerPrimaryText = entityName;
  const headerSecondaryText = entityTypeLabel;
  // Tooltip shows the full hostname when the card truncates long labels (e.g. edge-sec-ubuntu-…).
  const headerPrimaryTitle = typeof headerPrimaryText === 'string' ? headerPrimaryText : undefined;

  // Figma default entity card: Borders/Base/Plain for all states — no primary/blue
  // border on the origin or when selected (same color as sibling entity cards).
  const defaultBorderColor = euiTheme.colors.borderBasePlain;
  const activeBorderColor = euiTheme.colors.borderBasePlain;
  const cardBg = euiTheme.colors.backgroundBasePlain;
  const headerBg = cardBg;
  const iconBg = euiTheme.colors.backgroundBaseSubdued;
  const iconEmphasizedBg = iconBg;
  // Figma entity icons: pure black stroke for both single and group glyphs.
  const iconAccent = '#000000';
  const originOutlineColor = euiTheme.colors.borderBaseProminent;
  // Group cards always use the stacked-cards glyph (`group_entities.svg`).
  const resolvedIcon = isGroup ? resolveIcon(GROUP_CARD_ICON) : resolveIcon(icon, tag);

  // Risk badge is always shown in the header when score data is present (not a Layers toggle).
  const showRisk =
    riskScore !== undefined || (riskScoreMin !== undefined && riskScoreMax !== undefined);
  // Node metadata toggles apply to both singles and groups (groups use +N counters
  // and an asset-criticality range instead of per-level counts).
  const showIp = Boolean(ips && ips.length > 0);
  const showGeo = Boolean(countryCodes && countryCodes.length > 0);
  const showCriticality = Boolean(assetCriticality || assetCriticalityCounts);
  const showSource = Boolean(sources && sources.length > 0);
  const showEntityIdField = !isGroup && Boolean(showEntityId);
  const groupSubType = isGroup ? getGroupSubTypeLabel(entityName) : undefined;
  const showSubType = Boolean(isGroup && groupSubType);
  const hasBody =
    showIp || showGeo || showEntityIdField || showCriticality || showSource || showSubType;

  // Figma group range shows higher score first (e.g. 90.01 - 50.00).
  const riskRangeHigh =
    riskScoreMin !== undefined && riskScoreMax !== undefined
      ? Math.max(riskScoreMin, riskScoreMax)
      : undefined;
  const riskRangeLow =
    riskScoreMin !== undefined && riskScoreMax !== undefined
      ? Math.min(riskScoreMin, riskScoreMax)
      : undefined;

  const riskBadges = showRisk ? (
    <RiskBadgesRow>
      {riskScore !== undefined && riskScoreMin === undefined && (
        <RiskScoreBadge score={riskScore} />
      )}
      {riskRangeHigh !== undefined && riskRangeLow !== undefined && (
        <>
          <RiskScoreBadge score={riskRangeHigh} />
          <EuiText css={metadataTextCss}>{'-'}</EuiText>
          <RiskScoreBadge score={riskRangeLow} />
        </>
      )}
    </RiskBadgesRow>
  ) : null;

  const primaryIp = ips?.[0];
  const extraIpCount = ips && ips.length > 1 ? ips.length - 1 : 0;
  const primaryCountry = countryCodes?.[0];
  const primaryFlag = primaryCountry ? getCountryFlag(primaryCountry) : null;
  const primaryCountryName = primaryCountry ? getCountryName(primaryCountry) : null;
  // Groups show up to 2 flags then +N (Figma); singles show primary flag + overflow.
  const visibleGeoCodes = isGroup
    ? (countryCodes ?? []).slice(0, 2)
    : primaryCountry
    ? [primaryCountry]
    : [];
  const extraGeoCount = Math.max(0, (countryCodes?.length ?? 0) - visibleGeoCodes.length);
  const primarySource = sources?.[0];
  const extraSourceCount = sources && sources.length > 1 ? sources.length - 1 : 0;

  // Props retained on the node model / unused in this render path.
  void entityStyleMode;
  void entityActionsMode;
  void expandButtonClick;

  return (
    <CardWrapper
      ref={hoverContainerRef}
      $width={cardWidth}
      data-test-subj={GRAPH_ENTITY_NODE_ID}
      onMouseEnter={onActionsHoverOpen}
      onMouseLeave={onActionsHoverLeave}
    >
      {isHoverActionsVisible && getEntityActionItems && (
        <EntityHoverActionsToolbar
          getItems={getEntityActionItems}
          isExiting={hoverToolbarState === 'exiting'}
          onMetadataPopoverOpenChange={onMetadataPopoverOpenChange}
        />
      )}
      {highlightAsOrigin && (
        <OriginNodeOutline
          borderColor={originOutlineColor}
          borderRadius={ORIGIN_ENTITY_OUTLINE_BORDER_RADIUS}
        />
      )}
      <div
        css={css`
          display: flex;
          flex-direction: column;
          width: 100%;
        `}
      >
        <CardShell
          defaultBorderColor={defaultBorderColor}
          activeBorderColor={activeBorderColor}
          bgColor={cardBg}
          $defaultShadow={defaultShadow}
          $hoverShadow={hoverShadow}
        >
          <CardShellClip>
            <CardHeader
              bgColor={headerBg}
              $dividerColor={hasBody ? defaultBorderColor : undefined}
              data-test-subj={GRAPH_ENTITY_NODE_HOVER_SHAPE_ID}
            >
              <IconBox bgColor={iconBg} emphasizedBackgroundColor={iconEmphasizedBg}>
                <EuiIcon type={resolvedIcon} size="l" color={iconAccent} aria-hidden={true} />
              </IconBox>

              <HeaderText>
                {isGroup ? (
                  <>
                    <HeaderTitleRow>
                      {count !== undefined && <GroupCountPill count={count} />}
                      {headerPrimaryTitle && headerPrimaryTitle.length > 28 ? (
                        <EuiToolTip content={headerPrimaryTitle} display="block">
                          <EuiText css={headerNameCss}>{headerPrimaryText}</EuiText>
                        </EuiToolTip>
                      ) : (
                        <EuiText css={headerNameCss}>{headerPrimaryText}</EuiText>
                      )}
                    </HeaderTitleRow>
                    <HeaderSecondaryRow>
                      {headerSecondaryText ? (
                        <EuiText css={headerEntityTypeCss}>{headerSecondaryText}</EuiText>
                      ) : (
                        <span />
                      )}
                      {riskBadges}
                    </HeaderSecondaryRow>
                  </>
                ) : (
                  <>
                    {headerPrimaryTitle && headerPrimaryTitle.length > 24 ? (
                      <EuiToolTip content={headerPrimaryTitle} display="block">
                        <EuiText css={headerNameCss}>{headerPrimaryText}</EuiText>
                      </EuiToolTip>
                    ) : (
                      <EuiText css={headerNameCss}>{headerPrimaryText}</EuiText>
                    )}
                    {headerSecondaryText ? (
                      <EuiText css={headerEntityTypeCss}>{headerSecondaryText}</EuiText>
                    ) : null}
                  </>
                )}
              </HeaderText>

              {!isGroup && riskBadges}
            </CardHeader>

            {/* Metadata body — only when Apply filters → Node metadata toggles are on */}
            {hasBody && (
              <CardBody data-test-subj={GRAPH_ENTITY_NODE_DETAILS_ID}>
                {isGroup ? (
                  <>
                    {/* Figma group metadata: Sub-type | Source */}
                    {(showSubType || showSource) && (
                      <MetadataRow>
                        {showSubType && (
                          <MetadataField>
                            <FieldLabel>
                              {i18n.translate(
                                'securitySolutionPackages.csp.graph.node.card.label.subType',
                                { defaultMessage: 'Sub-type' }
                              )}
                            </FieldLabel>
                            <FieldValue truncate>{groupSubType}</FieldValue>
                          </MetadataField>
                        )}
                        {showSource && (
                          <MetadataField>
                            <FieldLabel>
                              {i18n.translate(
                                'securitySolutionPackages.csp.graph.node.card.label.source',
                                { defaultMessage: 'Source' }
                              )}
                            </FieldLabel>
                            <MetadataValueRow>
                              <FieldValue truncate>{primarySource}</FieldValue>
                              {extraSourceCount > 0 && <OverflowBadge count={extraSourceCount} />}
                            </MetadataValueRow>
                          </MetadataField>
                        )}
                      </MetadataRow>
                    )}

                    {/* IP +N | Geolocation flags +N */}
                    {(showIp || showGeo) && (
                      <MetadataRow>
                        {showIp && (
                          <MetadataField>
                            <FieldLabel>
                              {i18n.translate(
                                'securitySolutionPackages.csp.graph.node.card.label.ipAddress',
                                { defaultMessage: 'IP address' }
                              )}
                            </FieldLabel>
                            <MetadataValueRow>
                              {ipClickHandler && primaryIp ? (
                                <EuiButtonEmpty
                                  size="s"
                                  color="text"
                                  flush="both"
                                  onClick={ipClickHandler}
                                  css={css`
                                    ${metadataTextCss}
                                    font-weight: 400;
                                    height: ${CARD_METADATA_LINE_HEIGHT}px;
                                    min-height: ${CARD_METADATA_LINE_HEIGHT}px;
                                  `}
                                >
                                  {primaryIp}
                                </EuiButtonEmpty>
                              ) : (
                                <FieldValue truncate>{primaryIp}</FieldValue>
                              )}
                              {extraIpCount > 0 && <OverflowBadge count={extraIpCount} />}
                            </MetadataValueRow>
                          </MetadataField>
                        )}

                        {showGeo && (
                          <MetadataField>
                            <FieldLabel>
                              {i18n.translate(
                                'securitySolutionPackages.csp.graph.node.card.label.geolocation',
                                { defaultMessage: 'Geolocation' }
                              )}
                            </FieldLabel>
                            <MetadataValueRow>
                              {visibleGeoCodes.map((code) => {
                                const flag = getCountryFlag(code);
                                if (!flag) return null;
                                return (
                                  <span
                                    key={code}
                                    css={metadataTextCss}
                                    title={getCountryName(code) ?? code}
                                  >
                                    {flag}
                                  </span>
                                );
                              })}
                              {extraGeoCount > 0 && <OverflowBadge count={extraGeoCount} />}
                            </MetadataValueRow>
                          </MetadataField>
                        )}
                      </MetadataRow>
                    )}

                    {/* Asset criticality range (Extreme impact - High impact) */}
                    {showCriticality && (
                      <MetadataField>
                        <FieldLabel>
                          {i18n.translate(
                            'securitySolutionPackages.csp.graph.node.card.label.assetCriticality',
                            { defaultMessage: 'Asset criticality' }
                          )}
                        </FieldLabel>
                        {assetCriticalityCounts ? (
                          <CriticalityRange counts={assetCriticalityCounts} />
                        ) : assetCriticality ? (
                          <EuiHealth
                            color={getCriticalityHealthColor(assetCriticality)}
                            textSize="inherit"
                            css={metadataTextCss}
                          >
                            {assetCriticality}
                          </EuiHealth>
                        ) : null}
                      </MetadataField>
                    )}
                  </>
                ) : (
                  <>
                    {(showIp || showGeo) && (
                      <MetadataRow>
                        {showIp && (
                          <MetadataField>
                            <FieldLabel>
                              {i18n.translate(
                                'securitySolutionPackages.csp.graph.node.card.label.ipAddress',
                                { defaultMessage: 'IP address' }
                              )}
                            </FieldLabel>
                            <MetadataValueRow>
                              {ipClickHandler && primaryIp ? (
                                <EuiButtonEmpty
                                  size="s"
                                  color="text"
                                  flush="both"
                                  onClick={ipClickHandler}
                                  css={css`
                                    ${metadataTextCss}
                                    font-weight: 400;
                                    height: ${CARD_METADATA_LINE_HEIGHT}px;
                                    min-height: ${CARD_METADATA_LINE_HEIGHT}px;
                                  `}
                                >
                                  {primaryIp}
                                </EuiButtonEmpty>
                              ) : (
                                <FieldValue truncate>{primaryIp}</FieldValue>
                              )}
                              {extraIpCount > 0 && <OverflowBadge count={extraIpCount} />}
                            </MetadataValueRow>
                          </MetadataField>
                        )}

                        {showGeo && (
                          <MetadataField>
                            <FieldLabel>
                              {i18n.translate(
                                'securitySolutionPackages.csp.graph.node.card.label.geolocation',
                                { defaultMessage: 'Geolocation' }
                              )}
                            </FieldLabel>
                            <MetadataValueRow>
                              {primaryFlag &&
                                (countryClickHandler ? (
                                  <EuiButtonEmpty
                                    size="s"
                                    color="text"
                                    flush="both"
                                    onClick={countryClickHandler}
                                    css={css`
                                      height: ${CARD_METADATA_LINE_HEIGHT}px;
                                      min-height: ${CARD_METADATA_LINE_HEIGHT}px;
                                      padding: 0;
                                    `}
                                  >
                                    <span css={metadataTextCss}>
                                      {primaryCountryName
                                        ? `${primaryFlag} ${primaryCountryName}`
                                        : primaryFlag}
                                    </span>
                                  </EuiButtonEmpty>
                                ) : (
                                  <span css={metadataTextCss}>
                                    {primaryCountryName
                                      ? `${primaryFlag} ${primaryCountryName}`
                                      : primaryFlag}
                                  </span>
                                ))}
                              {extraGeoCount > 0 && <OverflowBadge count={extraGeoCount} />}
                            </MetadataValueRow>
                          </MetadataField>
                        )}
                      </MetadataRow>
                    )}

                    {showEntityIdField && (
                      <MetadataField>
                        <FieldLabel>
                          {i18n.translate(
                            'securitySolutionPackages.csp.graph.node.card.label.entityId',
                            { defaultMessage: 'Entity ID' }
                          )}
                        </FieldLabel>
                        <MetadataValueRow>
                          <FieldValue truncate>{props.id}</FieldValue>
                        </MetadataValueRow>
                      </MetadataField>
                    )}

                    {(showCriticality || showSource) && (
                      <MetadataRow>
                        {showCriticality && (
                          <MetadataField>
                            <FieldLabel>
                              {i18n.translate(
                                'securitySolutionPackages.csp.graph.node.card.label.assetCriticality',
                                { defaultMessage: 'Asset criticality' }
                              )}
                            </FieldLabel>
                            {assetCriticality && !assetCriticalityCounts && (
                              <EuiHealth
                                color={getCriticalityHealthColor(assetCriticality)}
                                textSize="inherit"
                                css={metadataTextCss}
                              >
                                {assetCriticality}
                              </EuiHealth>
                            )}
                            {assetCriticalityCounts && (
                              <CriticalityCountsGrid counts={assetCriticalityCounts} />
                            )}
                          </MetadataField>
                        )}

                        {showSource && (
                          <MetadataField>
                            <FieldLabel>
                              {i18n.translate(
                                'securitySolutionPackages.csp.graph.node.card.label.source',
                                { defaultMessage: 'Source' }
                              )}
                            </FieldLabel>
                            <MetadataValueRow>
                              <FieldValue truncate>{primarySource}</FieldValue>
                              {extraSourceCount > 0 && <OverflowBadge count={extraSourceCount} />}
                            </MetadataValueRow>
                          </MetadataField>
                        )}
                      </MetadataRow>
                    )}
                  </>
                )}
              </CardBody>
            )}
          </CardShellClip>
        </CardShell>

        {isGroup && (
          <GroupStackWrapper>
            <GroupStackTab
              defaultBorderColor={defaultBorderColor}
              activeBorderColor={activeBorderColor}
              bgColor={cardBg}
            />
          </GroupStackWrapper>
        )}
      </div>

      {interactive && (
        <NodeButton
          onClick={(e) => nodeClick?.(e, props)}
          width={cardWidth}
          css={css`
            position: absolute;
            top: 0;
            left: 0;
            z-index: 1;
          `}
        />
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
    </CardWrapper>
  );
});

CardNode.displayName = 'CardNode';
