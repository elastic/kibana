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
import { OriginNodeOutline } from './origin_node_outline';
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
const SIMPLIFIED_EXPAND_BUTTON_SIZE = 32;
const SIMPLIFIED_BADGE_SIZE = 24;
const SIMPLIFIED_LABEL_GAP = 4;
const SIMPLIFIED_LABEL_MAX_WIDTH = CARD_NODE_WIDTH;
const SIMPLIFIED_LABEL_TRUNCATE_LENGTH = 27;
const EXPAND_BUTTON_SIZE = 24;
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

const CardWrapper = styled.div<{ $fitContent?: boolean }>`
  position: relative;
  width: ${({ $fitContent }) => ($fitContent ? 'max-content' : `${CARD_NODE_WIDTH}px`)};
`;

const SimplifiedCardContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${SIMPLIFIED_LABEL_GAP}px;
  width: max-content;
  max-width: ${SIMPLIFIED_LABEL_MAX_WIDTH}px;
`;

const CardShell = styled.div<{
  borderColor: string;
  bgColor: string;
  shadow?: string;
}>`
  position: relative;
  width: 100%;
  border: 1.5px solid ${({ borderColor }) => borderColor};
  border-radius: ${CARD_BORDER_RADIUS}px;
  background: ${({ bgColor }) => bgColor};
  overflow: hidden;
  box-shadow: none;
  transition: box-shadow ${CARD_INTERACTIVE_TRANSITION};

  .react-flow__node:not(.non-interactive):hover &,
  .react-flow__node:not(.non-interactive).selected & {
    ${({ shadow }) => shadow ?? ''}
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

  .react-flow__node:not(.non-interactive):hover &,
  .react-flow__node:not(.non-interactive).selected & {
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
  isDanger,
  isSimplified = false,
}: {
  count: number;
  isDanger: boolean;
  isSimplified?: boolean;
}) => {
  const { euiTheme } = useEuiTheme();
  const label = count > 99 ? '99+' : String(count);

  const dangerBadgeCss = css`
    background-color: ${euiTheme.colors.backgroundFilledDanger};
    color: ${euiTheme.colors.textInverse};
  `;

  const simplifiedBadgeCss = css`
    ${metadataTextCss}
    font-weight: ${euiTheme.font.weight.medium};
    height: ${SIMPLIFIED_BADGE_SIZE}px;
    min-width: ${SIMPLIFIED_BADGE_SIZE}px;
    padding-inline: 4px;
  `;

  const badgeCss = [
    isSimplified ? simplifiedBadgeCss : undefined,
    isDanger ? dangerBadgeCss : undefined,
  ];

  return (
    <GraphNotificationBadge
      size={isSimplified ? 's' : 'm'}
      color={isDanger ? 'accent' : 'subdued'}
      css={badgeCss.length > 0 ? badgeCss : undefined}
    >
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

const GroupStackTab = styled.div<{ borderColor: string; bgColor: string }>`
  height: ${GROUP_STACK_HEIGHT}px;
  border-left: 1.5px solid ${({ borderColor }) => borderColor};
  border-right: 1.5px solid ${({ borderColor }) => borderColor};
  border-bottom: 1.5px solid ${({ borderColor }) => borderColor};
  border-bottom-left-radius: ${CARD_BORDER_RADIUS}px;
  border-bottom-right-radius: ${CARD_BORDER_RADIUS}px;
  background: ${({ bgColor }) => bgColor};
`;

const SimplifiedIconShell = styled.div`
  position: relative;
  width: ${SIMPLIFIED_ICON_SIZE}px;
  height: ${SIMPLIFIED_ICON_SIZE}px;
  flex-shrink: 0;
`;

const SimplifiedIconBox = styled.div<{
  borderColor: string;
  bgColor: string;
  emphasizedBackgroundColor: string;
  interactiveShadow?: string;
}>`
  width: 100%;
  height: 100%;
  border-radius: 8px;
  border: 1px solid ${({ borderColor }) => borderColor};
  background: ${({ bgColor }) => bgColor};
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: none;
  transition: background-color 0.15s ease, box-shadow ${CARD_INTERACTIVE_TRANSITION};

  .react-flow__node:not(.non-interactive):hover &,
  .react-flow__node:not(.non-interactive).selected & {
    background: ${({ emphasizedBackgroundColor }) => emphasizedBackgroundColor};
    box-shadow: ${({ interactiveShadow }) => interactiveShadow ?? 'none'};
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
  buttonSize = EXPAND_BUTTON_SIZE,
}: CardExpandButtonProps) => {
  const { euiTheme } = useEuiTheme();
  const expandShadow = useEuiShadow('m');
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
        size="s"
        onClick={onClickHandler}
        css={css`
          width: ${buttonSize}px;
          height: ${buttonSize}px;
          min-width: ${buttonSize}px;
          border-radius: 50%;
          background-color: ${euiTheme.colors.primary};
          box-shadow: ${expandShadow};

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
  isDanger: boolean;
  isGroup: boolean;
  resolvedIcon: string;
  iconColor: 'danger' | 'primary';
  count?: number;
  iconBorderColor: string;
  iconBg: string;
  iconEmphasizedBg: string;
  entityBorderColor: string;
  highlightAsOrigin?: boolean;
  interactiveShadow?: string;
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
  isDanger,
  isGroup,
  resolvedIcon,
  iconColor,
  count,
  iconBorderColor,
  iconBg,
  iconEmphasizedBg,
  entityBorderColor,
  highlightAsOrigin = false,
  interactiveShadow,
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
          <OriginNodeOutline borderColor={entityBorderColor} borderRadius={8} borderWidth={2} />
        )}
        <SimplifiedIconBox
          borderColor={iconBorderColor}
          bgColor={iconBg}
          emphasizedBackgroundColor={iconEmphasizedBg}
          interactiveShadow={interactiveShadow}
          data-test-subj={GRAPH_ENTITY_NODE_HOVER_SHAPE_ID}
        >
          {isGroup && count !== undefined && (
            <SimplifiedIconCountBadge>
              <EntityGroupCountBadge count={count} isDanger={isDanger} isSimplified={true} />
            </SimplifiedIconCountBadge>
          )}
          <EuiIcon type={resolvedIcon} size="xl" color={iconColor} aria-hidden={true} />
        </SimplifiedIconBox>

        {interactive && showExpandButton && (
          <CardExpandButton
            buttonSize={SIMPLIFIED_EXPAND_BUTTON_SIZE}
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
    color = 'primary',
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
  const cardShadow = useEuiShadow('s');
  const simplifiedHoverShadow = useEuiShadow('xs');
  const simplifiedActiveShadow = useEuiShadow('s');
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
  const isDanger = color === 'danger';
  const isGroup = showStackedShape(count);
  const isCompact = zoom < GRAPH_SIMPLIFIED_ZOOM_THRESHOLD;

  const entityName = label ?? props.id;
  const simplifiedCaption = isGroup ? entityTypeLabel ?? entityName : entityName;
  const headerPrimaryText = isGroup ? entityTypeLabel ?? entityName : entityName;
  const headerSecondaryText = isGroup ? undefined : entityTypeLabel;

  const borderColor = isDanger
    ? euiTheme.colors.borderBaseDanger
    : euiTheme.colors.borderBasePrimary;
  const headerBg = isDanger
    ? euiTheme.colors.backgroundBaseDanger
    : euiTheme.colors.backgroundBasePrimary;
  const cardBg = euiTheme.colors.backgroundBasePlain;
  const iconBorderColor = euiTheme.colors.borderBaseSubdued;
  const iconBg = euiTheme.colors.backgroundBasePlain;
  const iconEmphasizedBg = isDanger
    ? euiTheme.colors.backgroundLightDanger
    : euiTheme.colors.backgroundBaseSubdued;
  const resolvedIcon = resolveIcon(icon, tag);
  const iconColor = isDanger ? 'danger' : 'primary';

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
        isDanger={isDanger}
        isGroup={isGroup}
        resolvedIcon={resolvedIcon}
        iconColor={iconColor}
        count={count}
        iconBorderColor={iconBorderColor}
        iconBg={iconBg}
        iconEmphasizedBg={iconEmphasizedBg}
        entityBorderColor={borderColor}
        highlightAsOrigin={highlightAsOrigin}
        interactiveShadow={props.selected ? simplifiedActiveShadow : simplifiedHoverShadow}
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
        <OriginNodeOutline borderColor={borderColor} borderRadius={CARD_BORDER_RADIUS} />
      )}
      <div
        css={css`
          display: flex;
          flex-direction: column;
          width: 100%;
        `}
      >
        <CardShell borderColor={borderColor} bgColor={cardBg} shadow={cardShadow}>
          {/* Header */}
          <CardHeader bgColor={headerBg} data-test-subj={GRAPH_ENTITY_NODE_HOVER_SHAPE_ID}>
            <IconBox
              borderColor={iconBorderColor}
              bgColor={iconBg}
              emphasizedBackgroundColor={iconEmphasizedBg}
            >
              {isGroup && count !== undefined && (
                <IconCountBadge>
                  <EntityGroupCountBadge count={count} isDanger={isDanger} />
                </IconCountBadge>
              )}
              <EuiIcon type={resolvedIcon} size="l" color={iconColor} aria-hidden={true} />
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
            <GroupStackTab borderColor={borderColor} bgColor={iconBg} />
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
