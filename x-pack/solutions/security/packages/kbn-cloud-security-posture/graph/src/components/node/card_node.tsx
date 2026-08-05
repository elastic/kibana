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
  useEuiShadow,
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
import { getCountryFlag } from './country_flags/country_codes';
import { showStackedShape } from '../utils';
import { useViewportZoom } from '../../hooks/use_viewport_zoom';
import { useMultipleNodesSelected } from '../../hooks/use_multiple_nodes_selected';
import { GRAPH_SIMPLIFIED_ZOOM_THRESHOLD } from '../constants';
import {
  EntityHoverActionsToolbar,
  GRAPH_ENTITY_HOVER_ACTIONS_TOOLBAR_ID,
} from './entity_hover_actions_toolbar';
import {
  SimplifiedActionsTrigger,
  GRAPH_SIMPLIFIED_ACTIONS_TRIGGER_ID,
} from './simplified_actions_trigger';
import {
  GRAPH_ENTITY_NODE_ID,
  GRAPH_ENTITY_NODE_HOVER_SHAPE_ID,
  GRAPH_ENTITY_NODE_DETAILS_ID,
  GRAPH_ENTITY_NODE_SIMPLIFIED_LABEL_ID,
  GRAPH_NODE_EXPAND_BUTTON_ID,
} from '../test_ids';

/** Card width per Figma entity component spec (node 11961:839). */
export const CARD_NODE_WIDTH = 300;

/** Default layout height for a single entity card with full metadata. */
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

const CARD_BORDER_RADIUS = 10;
const ICON_SIZE = 40;
/** Simplified (zoomed-out) entity icon square — 8px larger than the full-card icon box. */
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
const GROUP_STACK_HEIGHT = 8;
const GROUP_STACK_PADDING_X = 16;

const simplifiedCardHandleStyle: React.CSSProperties = {
  ...HandleStyleOverride,
  top: SIMPLIFIED_ICON_SIZE / 2,
};

type CriticalityLevel = 'extreme' | 'high' | 'medium' | 'low';
type CriticalityHealthColor = 'danger' | 'risk' | 'warning' | 'neutral';

/** Risk severity bands aligned with Entity Analytics (and Figma entity card variants). */
type EntityRiskLevel = 'critical' | 'high' | 'moderate' | 'low' | 'unknown';

interface EntityRiskTheme {
  /** Icon square fill — Backgrounds/Light/{Danger|Risk|Warning|Neutral|Text} */
  iconBackground: string;
  /** Icon glyph + risk badge text */
  accent: string;
  /** Risk score pill fill (same light token as icon) */
  badgeBackground: string;
}

const CRITICALITY_HEALTH_COLOR: Record<CriticalityLevel, CriticalityHealthColor> = {
  extreme: 'danger',
  high: 'risk',
  medium: 'warning',
  low: 'neutral',
};

// ── Styled shells ─────────────────────────────────────────────────────────────

const CardWrapper = styled.div<{
  $fitContent?: boolean;
}>`
  position: relative;
  width: ${({ $fitContent }) => ($fitContent ? 'max-content' : `${CARD_NODE_WIDTH}px`)};
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
  border: 1.5px solid ${({ defaultBorderColor }) => defaultBorderColor};
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

const CardHeader = styled.div<{ bgColor: string }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: ${({ bgColor }) => bgColor};
  position: relative;
`;

const IconBox = styled.div<{
  bgColor: string;
  emphasizedBackgroundColor: string;
}>`
  position: relative;
  flex-shrink: 0;
  width: ${ICON_SIZE}px;
  height: ${ICON_SIZE}px;
  border-radius: 8px;
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
  padding: 0 ${GROUP_STACK_PADDING_X}px;
  width: 100%;
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
  border-radius: 8px;
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

const resolveIcon = (icon?: string, tag?: string): string => {
  if (icon) {
    const spanIcon = getSpanIcon(icon);
    if (spanIcon) return spanIcon;
    if (/^[a-zA-Z]/.test(icon)) return icon;
  }
  return getEntityTypeIcon(tag);
};

const getEntityRiskLevel = (score?: number): EntityRiskLevel => {
  if (score === undefined) return 'unknown';
  if (score > 90) return 'critical';
  if (score >= 70) return 'high';
  if (score >= 40) return 'moderate';
  if (score >= 20) return 'low';
  return 'unknown';
};

/** Borealis tokens: icon fill = Backgrounds/Light/*; glyph/badge text = Text/*. No icon border. */
const getEntityRiskTheme = (
  level: EntityRiskLevel,
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
): EntityRiskTheme => {
  switch (level) {
    case 'critical':
      return {
        iconBackground: colors.backgroundLightDanger,
        accent: colors.textDanger,
        badgeBackground: colors.backgroundLightDanger,
      };
    case 'high':
      return {
        iconBackground: colors.backgroundLightRisk,
        accent: colors.textRisk,
        badgeBackground: colors.backgroundLightRisk,
      };
    case 'moderate':
      return {
        iconBackground: colors.backgroundLightWarning,
        accent: colors.textWarning,
        badgeBackground: colors.backgroundLightWarning,
      };
    case 'low':
      return {
        iconBackground: colors.backgroundLightNeutral,
        accent: colors.textNeutral,
        badgeBackground: colors.backgroundLightNeutral,
      };
    case 'unknown':
    default:
      return {
        iconBackground: colors.backgroundLightText,
        accent: colors.textParagraph,
        badgeBackground: colors.backgroundLightText,
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

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <EuiText css={metadataLabelCss}>{children}</EuiText>
);

const FieldValue = ({ children, truncate }: { children: React.ReactNode; truncate?: boolean }) => (
  <EuiText
    css={css`
      ${metadataTextCss}
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

const OverflowBadge = ({ count }: { count: number }) => {
  const label = formatOverflowCount(count);
  if (!label) return null;

  return (
    <GraphNotificationBadge size="m" color="subdued" css={metadataBadgeCss}>
      {label}
    </GraphNotificationBadge>
  );
};

const CriticalityCountsGrid = ({
  counts,
}: {
  counts: NonNullable<EntityNodeViewModel['assetCriticalityCounts']>;
}) => (
  <CriticalityGrid>
    {(['extreme', 'high', 'medium', 'low'] as const).flatMap((level) => {
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
        ${metadataBadgeCss}
        background-color: ${theme.badgeBackground};
        color: ${theme.accent};
        border: none;
      `}
    >
      {score.toFixed(2)}
    </EuiBadge>
  );
};

// ── Simplified (zoomed-out) card ──────────────────────────────────────────────

interface SimplifiedCardProps {
  isGroup: boolean;
  resolvedIcon: string;
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
  /** Test A zoom-out: show `⋯` trigger on the right with slide/fade motion. */
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
    font-weight: ${euiTheme.font.weight.semiBold};
    color: ${isGroup ? euiTheme.colors.textSubdued : euiTheme.colors.textParagraph};
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
    highlightAsOrigin = false,
    entityActionsMode = 'button',
    closeEntityActions,
    getEntityActionItems,
  } = props.data as EntityNodeViewModel;

  const { euiTheme } = useEuiTheme();
  // Borealis Shadow/X-small only — keep elevation subtle (no bump to Small on hover).
  const defaultShadow = useEuiShadow('xs');
  const hoverShadow = defaultShadow;
  const zoom = useViewportZoom();
  const isMultipleNodesSelected = useMultipleNodesSelected();
  const isCompact = zoom < GRAPH_SIMPLIFIED_ZOOM_THRESHOLD;
  const showExpandButton =
    interactive && !isMultipleNodesSelected && entityActionsMode === 'button';

  const hoverContainerRef = useRef<HTMLDivElement>(null);
  const hoverCloseTimerRef = useRef<number | null>(null);
  const isHoverActionsMode = entityActionsMode === 'hover';
  /** Test A zoom-out uses the same hover reveal motion as Test B, but shows `⋯` → popover. */
  const revealsActionsOnHover =
    interactive &&
    !isMultipleNodesSelected &&
    (isHoverActionsMode || (entityActionsMode === 'button' && isCompact));
  const [hoverToolbarState, setHoverToolbarState] = useState<'closed' | 'open' | 'exiting'>(
    'closed'
  );
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const isHoverActionsVisible = hoverToolbarState !== 'closed' || actionsMenuOpen;

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

      // Keep chrome while the classic Action Menu popover is open (Test A).
      if (actionsMenuOpen) {
        return;
      }

      const related = e.relatedTarget;
      if (
        related instanceof Element &&
        (related.closest(`[data-test-subj="${GRAPH_ENTITY_HOVER_ACTIONS_TOOLBAR_ID}"]`) ||
          related.closest(`[data-test-subj="${GRAPH_SIMPLIFIED_ACTIONS_TRIGGER_ID}"]`))
      ) {
        return;
      }

      clearHoverCloseTimer();
      hoverCloseTimerRef.current = window.setTimeout(() => {
        closeHoverActions();
      }, HOVER_ACTIONS_CLOSE_DELAY_MS);
    },
    [revealsActionsOnHover, actionsMenuOpen, clearHoverCloseTimer, closeHoverActions]
  );

  const onSimplifiedActionsClick = useCallback(
    (e: React.MouseEvent<HTMLElement>, unToggleCallback: () => void) => {
      setActionsMenuOpen(true);
      expandButtonClick?.(e, props, () => {
        setActionsMenuOpen(false);
        unToggleCallback();
        // Popover closed — hide trigger if the pointer already left the node.
        const container = hoverContainerRef.current;
        if (container && !container.matches(':hover')) {
          closeHoverActions();
        }
      });
    },
    [expandButtonClick, props, closeHoverActions]
  );

  useEffect(
    () => () => {
      clearHoverCloseTimer();
      setEntityHoverFocus(false);
    },
    [clearHoverCloseTimer, setEntityHoverFocus]
  );

  const headerNameCss = css`
    ${metadataTextCss}
    font-weight: ${euiTheme.font.weight.semiBold};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `;

  const headerEntityTypeCss = css`
    ${metadataTextCss}
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `;

  const entityTypeLabel = getEntityTypeLabel({ tag, icon, shape, documentsData });
  const isGroup = showStackedShape(count);

  const entityName = label ?? props.id;
  const simplifiedCaption = isGroup ? entityTypeLabel ?? entityName : entityName;
  const headerPrimaryText = isGroup ? entityTypeLabel ?? entityName : entityName;
  const headerSecondaryText = isGroup ? undefined : entityTypeLabel;

  // Figma entity card (node 14262:12652): Base/Primary header; icon + risk badge themed by severity.
  const defaultBorderColor = euiTheme.colors.borderBaseSubdued;
  const activeBorderColor = euiTheme.colors.borderBasePrimary;
  const headerBg = euiTheme.colors.backgroundBasePrimary;
  const cardBg = euiTheme.colors.backgroundBasePlain;
  const displayRiskScore = getDisplayRiskScore(riskScore, riskScoreMin, riskScoreMax);
  const riskTheme = getEntityRiskTheme(getEntityRiskLevel(displayRiskScore), euiTheme.colors);
  const iconBg = riskTheme.iconBackground;
  const iconEmphasizedBg = riskTheme.iconBackground;
  const iconAccent = riskTheme.accent;
  const originOutlineColor = euiTheme.colors.borderBaseProminent;
  const resolvedIcon = resolveIcon(icon, tag);

  const showIp = ips && ips.length > 0;
  const showGeo = countryCodes && countryCodes.length > 0;
  const showCriticality = !!assetCriticality || !!assetCriticalityCounts;
  const showRisk =
    riskScore !== undefined || (riskScoreMin !== undefined && riskScoreMax !== undefined);
  const hasBody = showIp || showGeo || showEntityId || showCriticality || showRisk;

  const primaryIp = ips?.[0];
  const extraIpCount = ips && ips.length > 1 ? ips.length - 1 : 0;
  const primaryCountry = countryCodes?.[0];
  const primaryFlag = primaryCountry ? getCountryFlag(primaryCountry) : null;
  const extraGeoCount = countryCodes && countryCodes.length > 1 ? countryCodes.length - 1 : 0;

  if (isCompact) {
    return (
      <SimplifiedCard
        isGroup={isGroup}
        resolvedIcon={resolvedIcon}
        count={count}
        activeBorderColor={activeBorderColor}
        iconBg={iconBg}
        iconAccent={iconAccent}
        originOutlineColor={originOutlineColor}
        highlightAsOrigin={highlightAsOrigin}
        defaultShadow={defaultShadow}
        hoverShadow={hoverShadow}
        interactive={interactive}
        showExpandButton={showExpandButton}
        nodeClick={nodeClick}
        nodeProps={props}
        caption={simplifiedCaption}
        showHoverActionsToolbar={isHoverActionsMode && isHoverActionsVisible}
        getHoverActionItems={getEntityActionItems}
        hoverToolbarExiting={hoverToolbarState === 'exiting'}
        showActionsTrigger={showExpandButton && isHoverActionsVisible}
        actionsTriggerExiting={hoverToolbarState === 'exiting' && !actionsMenuOpen}
        onActionsTriggerClick={onSimplifiedActionsClick}
        onActionsHoverOpen={onActionsHoverOpen}
        onActionsHoverLeave={onActionsHoverLeave}
        hoverContainerRef={hoverContainerRef}
      />
    );
  }

  return (
    <CardWrapper
      ref={hoverContainerRef}
      data-test-subj={GRAPH_ENTITY_NODE_ID}
      onMouseEnter={onActionsHoverOpen}
      onMouseLeave={onActionsHoverLeave}
    >
      {isHoverActionsMode && isHoverActionsVisible && getEntityActionItems && (
        <EntityHoverActionsToolbar
          getItems={getEntityActionItems}
          isExiting={hoverToolbarState === 'exiting'}
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
            {/* Header */}
            <CardHeader bgColor={headerBg} data-test-subj={GRAPH_ENTITY_NODE_HOVER_SHAPE_ID}>
              <IconBox bgColor={iconBg} emphasizedBackgroundColor={iconEmphasizedBg}>
                {isGroup && count !== undefined && (
                  <IconCountBadge>
                    <EntityGroupCountBadge count={count} />
                  </IconCountBadge>
                )}
                <EuiIcon type={resolvedIcon} size="l" color={iconAccent} aria-hidden={true} />
              </IconBox>

              <HeaderText>
                <EuiText css={headerNameCss}>{headerPrimaryText}</EuiText>
                {headerSecondaryText ? (
                  <EuiText color="subdued" css={headerEntityTypeCss}>
                    {headerSecondaryText}
                  </EuiText>
                ) : null}
              </HeaderText>

              {interactive && showExpandButton && (
                <CardActionsButton
                  inHeader
                  onClick={(e, unToggleCallback) => expandButtonClick?.(e, props, unToggleCallback)}
                />
              )}
            </CardHeader>

            {/* Metadata body */}
            {hasBody && (
              <CardBody data-test-subj={GRAPH_ENTITY_NODE_DETAILS_ID}>
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
                          {isGroup && extraIpCount > 0 && <OverflowBadge count={extraIpCount} />}
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
                                <span css={metadataTextCss}>{primaryFlag}</span>
                              </EuiButtonEmpty>
                            ) : (
                              <span css={metadataTextCss}>{primaryFlag}</span>
                            ))}
                          {isGroup && extraGeoCount > 0 && <OverflowBadge count={extraGeoCount} />}
                        </MetadataValueRow>
                      </MetadataField>
                    )}
                  </MetadataRow>
                )}

                {showEntityId && (
                  <MetadataField>
                    <FieldLabel>
                      {i18n.translate(
                        'securitySolutionPackages.csp.graph.node.card.label.entityId',
                        {
                          defaultMessage: 'Entity ID',
                        }
                      )}
                    </FieldLabel>
                    <MetadataValueRow>
                      <FieldValue truncate={isGroup}>{props.id}</FieldValue>
                      {isGroup && <OverflowBadge count={99} />}
                    </MetadataValueRow>
                  </MetadataField>
                )}

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

                {showRisk && (
                  <MetadataField>
                    <FieldLabel>
                      {i18n.translate(
                        'securitySolutionPackages.csp.graph.node.card.label.riskScore',
                        {
                          defaultMessage: 'Risk score',
                        }
                      )}
                    </FieldLabel>
                    <MetadataValueRow>
                      {riskScore !== undefined && riskScoreMin === undefined && (
                        <RiskScoreBadge score={riskScore} />
                      )}
                      {riskScoreMin !== undefined && riskScoreMax !== undefined && (
                        <>
                          <RiskScoreBadge score={riskScoreMin} />
                          <EuiText css={metadataTextCss}>{'–'}</EuiText>
                          <RiskScoreBadge score={riskScoreMax} />
                        </>
                      )}
                    </MetadataValueRow>
                  </MetadataField>
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
          width={CARD_NODE_WIDTH}
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
