/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
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
import type { EntityNodeViewModel, NodeProps } from '../types';
import { GraphNotificationBadge } from '../graph_notification_badge';
import {
  ORIGIN_ENTITY_OUTLINE_BORDER_RADIUS,
  ORIGIN_ENTITY_SIMPLIFIED_OUTLINE_BORDER_RADIUS,
  OriginNodeOutline,
} from './origin_node_outline';
import { NodeButton, HandleStyleOverride, NodeExpandButtonContainer } from './styles';
import { PILL_EXPAND_BUTTON_SIZE } from './pill_expand_button';
import { getEntityTypeIcon } from './get_entity_type_icon';
import { getEntityTypeLabel } from './get_entity_type_label';
import { getSpanIcon } from './get_span_icon';
import { getCountryFlag } from './country_flags/country_codes';
import { showStackedShape } from '../utils';
import { useViewportZoom } from '../../hooks/use_viewport_zoom';
import { useMultipleNodesSelected } from '../../hooks/use_multiple_nodes_selected';
import { GRAPH_SIMPLIFIED_ZOOM_THRESHOLD } from '../constants';
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
  overflow: hidden;
  ${({ $defaultShadow }) => $defaultShadow ?? ''}
  transition: border-color ${CARD_INTERACTIVE_TRANSITION},
    border-width ${CARD_INTERACTIVE_TRANSITION}, box-shadow ${CARD_INTERACTIVE_TRANSITION};

  .react-flow__node:not(.non-interactive):hover:not(.dragging) & {
    ${({ $hoverShadow }) => $hoverShadow ?? ''}
  }

  /* Selected: primary border only; no fill tint */
  .react-flow__node:not(.non-interactive).selected:not(.dragging) &,
  .react-flow__node:not(.non-interactive).dragging & {
    border-color: ${({ activeBorderColor }) => activeBorderColor};
    border-width: 2px;
  }
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
  borderColor: string;
  bgColor: string;
  emphasizedBackgroundColor: string;
}>`
  position: relative;
  flex-shrink: 0;
  width: ${ICON_SIZE}px;
  height: ${ICON_SIZE}px;
  border-radius: 8px;
  border: 1px solid ${({ borderColor }) => borderColor};
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
`;

const SimplifiedIconBox = styled.div<{
  defaultBorderColor: string;
  activeBorderColor: string;
  bgColor: string;
  defaultShadow?: string;
  hoverShadow?: string;
}>`
  width: 100%;
  height: 100%;
  border-radius: 8px;
  border: 1px solid ${({ defaultBorderColor }) => defaultBorderColor};
  background: ${({ bgColor }) => bgColor};
  display: flex;
  align-items: center;
  justify-content: center;
  ${({ defaultShadow }) => defaultShadow ?? ''}
  transition: background-color 0.15s ease, box-shadow ${CARD_INTERACTIVE_TRANSITION},
    border-color ${CARD_INTERACTIVE_TRANSITION}, border-width ${CARD_INTERACTIVE_TRANSITION};

  .react-flow__node:not(.non-interactive):hover:not(.dragging) & {
    ${({ hoverShadow }) => hoverShadow ?? ''}
  }

  .react-flow__node:not(.non-interactive).selected:not(.dragging) &,
  .react-flow__node:not(.non-interactive).dragging & {
    border-color: ${({ activeBorderColor }) => activeBorderColor};
    border-width: 2px;
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

const getRiskBadgeColor = (score: number): 'danger' | 'warning' | 'hollow' => {
  if (score >= 70) return 'danger';
  if (score >= 40) return 'warning';
  return 'hollow';
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

interface CardExpandButtonProps {
  onClick?: (e: React.MouseEvent<HTMLElement>, unToggleCallback: () => void) => void;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  buttonSize?: number;
}

const CardExpandButton = ({
  onClick,
  containerRef,
  buttonSize = PILL_EXPAND_BUTTON_SIZE,
}: CardExpandButtonProps) => {
  const { euiTheme } = useEuiTheme();
  const [isToggled, setIsToggled] = React.useState(false);

  const unToggleCallback = useCallback(() => {
    setIsToggled(false);
  }, []);

  const onClickHandler = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      setIsToggled((curr) => !curr);
      onClick?.(e, unToggleCallback);
    },
    [onClick, unToggleCallback]
  );

  const positionCss = css`
    right: -12px;
    top: 50%;
    transform: translateY(-50%);
  `;

  return (
    <NodeExpandButtonContainer
      ref={containerRef}
      className={isToggled ? 'toggled' : undefined}
      css={css`
        position: absolute;
        z-index: 2;
        opacity: 0;
        transition: opacity ${CARD_INTERACTIVE_TRANSITION};
        ${positionCss}

        &.toggled {
          opacity: 1;
        }

        .react-flow__node:not(.non-interactive):hover &,
        .react-flow__node:not(.non-interactive).selected & {
          opacity: 1;
        }

        &:has(button:focus) {
          opacity: 1;
        }
      `}
    >
      <EuiButtonIcon
        iconType={isToggled ? 'minusInCircle' : 'plusInCircle'}
        aria-label={i18n.translate('securitySolutionPackages.csp.graph.node.card.expandActions', {
          defaultMessage: 'Open or close node actions',
        })}
        data-test-subj={GRAPH_NODE_EXPAND_BUTTON_ID}
        color="primary"
        display="fill"
        size="xs"
        onClick={onClickHandler}
        css={css`
          width: ${buttonSize}px;
          height: ${buttonSize}px;
          min-width: ${buttonSize}px;
          border-radius: 50%;
          background-color: ${euiTheme.colors.primary};

          &:hover,
          &:focus {
            background-color: ${euiTheme.colors.primary};
          }
        `}
      />
    </NodeExpandButtonContainer>
  );
};

// ── Simplified (zoomed-out) card ──────────────────────────────────────────────

interface SimplifiedCardProps {
  isGroup: boolean;
  resolvedIcon: string;
  count?: number;
  defaultBorderColor: string;
  activeBorderColor: string;
  iconBg: string;
  originOutlineColor: string;
  highlightAsOrigin?: boolean;
  defaultShadow?: string;
  hoverShadow?: string;
  interactive?: boolean;
  showExpandButton?: boolean;
  expandButtonClick?: EntityNodeViewModel['expandButtonClick'];
  nodeClick?: EntityNodeViewModel['nodeClick'];
  nodeProps: NodeProps;
  caption: string;
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
  defaultBorderColor,
  activeBorderColor,
  iconBg,
  originOutlineColor,
  highlightAsOrigin = false,
  defaultShadow,
  hoverShadow,
  interactive,
  showExpandButton = true,
  expandButtonClick,
  nodeClick,
  nodeProps,
  caption,
}: SimplifiedCardProps) => (
  <CardWrapper $fitContent data-test-subj={GRAPH_ENTITY_NODE_ID}>
    <SimplifiedCardContainer>
      <SimplifiedIconShell>
        {highlightAsOrigin && (
          <OriginNodeOutline
            borderColor={originOutlineColor}
            borderRadius={ORIGIN_ENTITY_SIMPLIFIED_OUTLINE_BORDER_RADIUS}
          />
        )}
        <SimplifiedIconBox
          defaultBorderColor={defaultBorderColor}
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
            aria-hidden={true}
            css={css`
              svg {
                width: ${SIMPLIFIED_ICON_INNER_SIZE}px;
                height: ${SIMPLIFIED_ICON_INNER_SIZE}px;
              }
            `}
          />
        </SimplifiedIconBox>

        {interactive && showExpandButton && (
          <CardExpandButton
            onClick={(e, unToggleCallback) => expandButtonClick?.(e, nodeProps, unToggleCallback)}
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
  } = props.data as EntityNodeViewModel;

  const { euiTheme } = useEuiTheme();
  const defaultShadow = useEuiShadow('xs');
  const hoverShadow = useEuiShadow('s');
  const zoom = useViewportZoom();
  const isMultipleNodesSelected = useMultipleNodesSelected();
  const showExpandButton = interactive && !isMultipleNodesSelected;

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
  const isCompact = zoom < GRAPH_SIMPLIFIED_ZOOM_THRESHOLD;

  const entityName = label ?? props.id;
  const simplifiedCaption = isGroup ? entityTypeLabel ?? entityName : entityName;
  const headerPrimaryText = isGroup ? entityTypeLabel ?? entityName : entityName;
  const headerSecondaryText = isGroup ? undefined : entityTypeLabel;

  // Figma entity card (node 13969:2409): Borders/Base/Prominent, Backgrounds/Light/Primary header.
  const defaultBorderColor = euiTheme.colors.borderBaseProminent;
  const activeBorderColor = euiTheme.colors.borderBasePrimary;
  const headerBg = euiTheme.colors.backgroundLightPrimary;
  const cardBg = euiTheme.colors.backgroundBasePlain;
  const iconBorderColor = euiTheme.colors.borderBaseProminent;
  const iconBg = euiTheme.colors.backgroundBasePlain;
  const iconEmphasizedBg = euiTheme.colors.backgroundBaseSubdued;
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
        defaultBorderColor={defaultBorderColor}
        activeBorderColor={activeBorderColor}
        iconBg={iconBg}
        originOutlineColor={originOutlineColor}
        highlightAsOrigin={highlightAsOrigin}
        defaultShadow={defaultShadow}
        hoverShadow={hoverShadow}
        interactive={interactive}
        showExpandButton={showExpandButton}
        expandButtonClick={expandButtonClick}
        nodeClick={nodeClick}
        nodeProps={props}
        caption={simplifiedCaption}
      />
    );
  }

  return (
    <CardWrapper data-test-subj={GRAPH_ENTITY_NODE_ID}>
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
          {/* Header */}
          <CardHeader bgColor={headerBg} data-test-subj={GRAPH_ENTITY_NODE_HOVER_SHAPE_ID}>
            <IconBox
              borderColor={iconBorderColor}
              bgColor={iconBg}
              emphasizedBackgroundColor={iconEmphasizedBg}
            >
              {isGroup && count !== undefined && (
                <IconCountBadge>
                  <EntityGroupCountBadge count={count} />
                </IconCountBadge>
              )}
              <EuiIcon type={resolvedIcon} size="l" aria-hidden={true} />
            </IconBox>

            <HeaderText>
              <EuiText css={headerNameCss}>{headerPrimaryText}</EuiText>
              {headerSecondaryText ? (
                <EuiText color="subdued" css={headerEntityTypeCss}>
                  {headerSecondaryText}
                </EuiText>
              ) : null}
            </HeaderText>
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
                    {i18n.translate('securitySolutionPackages.csp.graph.node.card.label.entityId', {
                      defaultMessage: 'Entity ID',
                    })}
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
                      <EuiBadge color={getRiskBadgeColor(riskScore)} css={metadataBadgeCss}>
                        {riskScore.toFixed(2)}
                      </EuiBadge>
                    )}
                    {riskScoreMin !== undefined && riskScoreMax !== undefined && (
                      <>
                        <EuiBadge color={getRiskBadgeColor(riskScoreMin)} css={metadataBadgeCss}>
                          {riskScoreMin.toFixed(2)}
                        </EuiBadge>
                        <EuiText css={metadataTextCss}>{'–'}</EuiText>
                        <EuiBadge color={getRiskBadgeColor(riskScoreMax)} css={metadataBadgeCss}>
                          {riskScoreMax.toFixed(2)}
                        </EuiBadge>
                      </>
                    )}
                  </MetadataValueRow>
                </MetadataField>
              )}
            </CardBody>
          )}
        </CardShell>

        {isGroup && (
          <GroupStackWrapper>
            <GroupStackTab
              defaultBorderColor={defaultBorderColor}
              activeBorderColor={activeBorderColor}
              bgColor={iconBg}
            />
          </GroupStackWrapper>
        )}
      </div>

      {interactive && (
        <>
          {showExpandButton && (
            <CardExpandButton
              onClick={(e, unToggleCallback) => expandButtonClick?.(e, props, unToggleCallback)}
            />
          )}
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
    </CardWrapper>
  );
});

CardNode.displayName = 'CardNode';
