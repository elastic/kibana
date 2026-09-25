/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPanel,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

import type { ActiveFilter, SignalCardData, SignalCardId } from './data';

export interface SignalCardsProps {
  activeFilter: ActiveFilter | null;
  /** Card values for the current page filters — see `getSignalCards`. */
  cards: SignalCardData[];
  onFilterForCard: (cardId: SignalCardId) => void;
  /** Kept for MetricChartsPanel wiring; cards are whole-card toggles in v.5. */
  onFilterOutCard?: (cardId: SignalCardId) => void;
  onAddCardToTimeline?: (cardId: SignalCardId) => void;
}

/** 6 tiles in a 1×6 compact horizontal strip. */
const METRIC_LINE_HEIGHT = 1.2;
const DIMMED_OPACITY = 0.7;

/** v.5 title overrides (tooltip uses the same string). */
const V3_CARD_TITLES: Partial<Record<SignalCardId, string>> = {
  entitiesWithAlerts: 'Entities with alerts',
  entitiesWithAnomalies: 'Entities with anomalies',
  riskMovers: 'Risk movers',
  newlyHighCritical: 'Newly high/critical',
  watchlisted: 'Watchlisted',
  newEntity: 'New entity',
};

/** v.5 subtitle / description overrides (shared mock corpus stays unchanged). */
const V5_CARD_DESCRIPTIONS: Partial<Record<SignalCardId, string>> = {
  entitiesWithAlerts: 'Entities with at least one alert in the last 24h',
  entitiesWithAnomalies: 'Entities with at least one ML anomaly in the last 24h',
  // riskMovers, newlyHighCritical, watchlisted, newEntity descriptions are dynamic — driven by the selected time range from the page
};

const displayTitleFor = (card: SignalCardData): string => V3_CARD_TITLES[card.id] ?? card.title;

const displayDescriptionFor = (card: SignalCardData): string =>
  V5_CARD_DESCRIPTIONS[card.id] ?? card.description;

const filterTableTooltip = (title: string) =>
  i18n.translate('xpack.securitySolution.entityAnalytics.facelift.signalCards.filterTableTooltip', {
    defaultMessage: 'Filter table: {title}',
    values: { title },
  });

const unfilterTableTooltip = (title: string) =>
  i18n.translate(
    'xpack.securitySolution.entityAnalytics.facelift.signalCards.unfilterTableTooltip',
    {
      defaultMessage: 'Unfilter table: {title}',
      values: { title },
    }
  );

const CornerControl: React.FC<{
  selected: boolean;
  interactive: boolean;
  emphasized: boolean;
  onClear?: () => void;
}> = ({ selected, interactive, emphasized, onClear }) => {
  const { euiTheme } = useEuiTheme();

  if (!interactive) {
    return null;
  }

  // Match default filter chrome; selection is signaled by the accent dot only.
  const iconColor = emphasized ? 'primary' : euiTheme.colors.textSubdued;

  const icon = (
    <span
      css={css`
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        line-height: 0;
      `}
    >
      <EuiIcon type="filter" size="m" color={iconColor} aria-hidden />
      {selected ? (
        <EuiIcon
          type="dot"
          size="m"
          color="accent"
          aria-hidden
          css={css`
            position: absolute;
            inset-block-start: -8px;
            inset-inline-end: -8px;
            inline-size: 20px !important;
            block-size: 20px !important;
            pointer-events: none;
            stroke: ${euiTheme.colors.emptyShade};
            stroke-width: 1px;
            paint-order: stroke;
          `}
        />
      ) : null}
    </span>
  );

  if (selected && onClear) {
    return (
      <button
        type="button"
        aria-label={i18n.translate(
          'xpack.securitySolution.entityAnalytics.facelift.signalCards.clearFilter',
          { defaultMessage: 'Clear table filter' }
        )}
        data-test-subj="eaFaceliftSignalCardClearFilter"
        onMouseDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onClear();
        }}
        css={css`
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          border: 0;
          background: transparent;
          cursor: pointer;
        `}
      >
        {icon}
      </button>
    );
  }

  return icon;
};

interface SignalMetricCardProps {
  card: SignalCardData;
  selected: boolean;
  dimmed: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}

/**
 * Custom Needs-attention KPI tile (EUI layout + Area sparkline). Whole-card
 * filter toggle with hover / active / dimmed / all-clear states.
 */
const SignalMetricCard: React.FC<SignalMetricCardProps> = ({
  card,
  selected,
  dimmed,
  isExpanded,
  onToggle,
}) => {
  const { euiTheme } = useEuiTheme();
  const [hovered, setHovered] = useState(false);

  const isZero = card.value === 0;
  const isLoading = card.isLoading ?? false;
  const interactive = !isZero && !isLoading;
  // Hover only — mouse clicks must not leave focus chrome that looks like hover after deselect.
  const emphasized = interactive && hovered;

  const defaultBg = euiTheme.colors.backgroundBasePlain;
  const hoverBg = euiTheme.colors.backgroundBaseSubdued;
  const defaultBorder = euiTheme.colors.borderBasePlain;
  const hoverBorder = euiTheme.colors.borderBaseProminent;
  const activeBorder = euiTheme.colors.borderStrongPrimary;

  // Active keeps a white tile; only the border (and sparkline tint) mark selection.
  const tileBackground = selected ? defaultBg : emphasized ? hoverBg : defaultBg;
  const borderColor = selected ? activeBorder : emphasized ? hoverBorder : defaultBorder;
  const displayTitle = displayTitleFor(card);
  const displayDescription = displayDescriptionFor(card);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!interactive) {
        return;
      }
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onToggle();
      }
    },
    [interactive, onToggle]
  );

  const cardNode = (
    <div
      role="button"
      tabIndex={interactive ? 0 : -1}
      aria-pressed={interactive ? selected : undefined}
      aria-disabled={isZero || undefined}
      aria-label={displayTitle}
      data-test-subj={`eaFaceliftSignalCard-${card.id}`}
      onClick={interactive ? onToggle : undefined}
      onKeyDown={onKeyDown}
      onMouseDown={(event) => {
        // Keep mouse activation from focusing the card, so deselection returns to
        // the default tile (not sticky focus-as-hover) when the pointer leaves.
        if (interactive && event.button === 0) {
          event.preventDefault();
        }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      css={css`
        display: flex;
        flex-direction: column;
        block-size: 100%;
        min-block-size: ${isExpanded ? `calc(${euiTheme.base}px * 10)` : '0'};
        padding: ${euiTheme.size.s};
        border: 1px solid ${borderColor};
        border-radius: ${euiTheme.border.radius.medium};
        background: ${tileBackground};
        opacity: ${dimmed ? DIMMED_OPACITY : 1};
        cursor: ${interactive ? 'pointer' : 'default'};
        outline: none;
        overflow: hidden;
        position: relative;
        /* eslint-disable-next-line @elastic/eui/no-static-z-index -- local card stacking, no semantic token applies */
        z-index: ${selected || emphasized ? 2 : 1};
        transition: border-color ${euiTheme.animation.fast} ${euiTheme.animation.resistance},
          background-color ${euiTheme.animation.fast} ${euiTheme.animation.resistance},
          opacity ${euiTheme.animation.fast} ${euiTheme.animation.resistance};

        &:focus-visible {
          border-color: ${selected ? activeBorder : hoverBorder};
        }
      `}
    >
      <div
        css={css`
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          flex: 1 1 auto;
          min-block-size: 0;
        `}
      >
        <EuiFlexGroup
          gutterSize="s"
          alignItems="flexStart"
          justifyContent="spaceBetween"
          responsive={false}
        >
          <EuiFlexItem
            grow={true}
            css={css`
              min-inline-size: 0;
            `}
          >
            <EuiText
              size="m"
              css={css`
                font-weight: ${euiTheme.font.weight.bold};
                line-height: ${METRIC_LINE_HEIGHT};
                color: ${euiTheme.colors.textParagraph};
              `}
            >
              {displayTitle}
            </EuiText>
            <EuiText
              size="m"
              color="subdued"
              css={css`
                line-height: ${METRIC_LINE_HEIGHT};
                margin-block-start: ${euiTheme.size.xs};
              `}
            >
              {displayDescription}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <CornerControl
              selected={selected}
              interactive={interactive}
              emphasized={emphasized}
              onClear={selected ? onToggle : undefined}
            />
          </EuiFlexItem>
        </EuiFlexGroup>

        <div
          css={css`
            flex: 1 1 auto;
            min-block-size: ${euiTheme.size.m};
          `}
        />

        <EuiFlexGroup
          gutterSize="s"
          alignItems="flexEnd"
          justifyContent="flexEnd"
          responsive={false}
        >
          <EuiFlexItem grow={false}>
            <div
              css={css`
                display: flex;
                flex-direction: column;
                align-items: flex-end;
              `}
            >
              {isLoading ? (
                <EuiLoadingSpinner size="l" />
              ) : (
                <>
                  <EuiTitle
                    size="l"
                    css={css`
                      line-height: ${METRIC_LINE_HEIGHT};
                      text-align: end;
                      ${isExpanded ? `font-size: calc(${euiTheme.base}px * 2.5);` : ''}
                    `}
                  >
                    <span>{isZero ? '—' : card.value.toLocaleString()}</span>
                  </EuiTitle>
                  {isZero && card.noDataMessage && (
                    <EuiText
                      size="xs"
                      color="subdued"
                      css={css`
                        text-align: end;
                        margin-block-start: ${euiTheme.size.xs};
                        font-style: italic;
                      `}
                    >
                      {card.noDataMessage}
                    </EuiText>
                  )}
                </>
              )}
            </div>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </div>
  );

  if (!interactive) {
    return cardNode;
  }

  return (
    <EuiToolTip
      content={selected ? unfilterTableTooltip(displayTitle) : filterTableTooltip(displayTitle)}
      display="block"
      anchorProps={{
        css: css`
          block-size: 100%;
        `,
      }}
    >
      {cardNode}
    </EuiToolTip>
  );
};

/**
 * Needs-attention metrics in a compact 1×6 horizontal strip. Each card toggles
 * an in-page table filter; selection stays on the card itself.
 */
export const SignalCards: React.FC<SignalCardsProps> = ({
  activeFilter,
  cards,
  onFilterForCard,
}) => {
  const { euiTheme } = useEuiTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const anySelected = activeFilter?.type === 'card';
  const columns = isExpanded ? 3 : 6;

  return (
    <>
      <div
        css={css`
          display: flex;
          justify-content: flex-end;
          margin-block-end: ${euiTheme.size.xs};
        `}
      >
        <EuiToolTip content={isExpanded ? 'Compact layout' : 'Expanded layout'}>
          <EuiButtonIcon
            iconType={isExpanded ? 'tableOfContents' : 'apps'}
            onClick={() => setIsExpanded((prev) => !prev)}
            aria-label={isExpanded ? 'Switch to compact layout' : 'Switch to expanded layout'}
            size="xs"
            color="text"
          />
        </EuiToolTip>
      </div>
      <EuiPanel
        hasBorder={false}
        hasShadow={false}
        paddingSize="none"
        data-test-subj="eaFaceliftSignalCards"
        css={css`
          overflow: hidden;
        `}
      >
        <div
          css={css`
            display: grid;
            grid-template-columns: repeat(${columns}, minmax(0, 1fr));
            gap: ${euiTheme.size.s};
            block-size: 100%;
          `}
        >
          {cards.map((card) => {
            const selected = activeFilter?.type === 'card' && activeFilter.cardId === card.id;
            const dimmed = Boolean(anySelected && !selected);

            return (
              <div
                key={card.id}
                css={css`
                  min-inline-size: 0;
                  min-block-size: 0;
                  block-size: 100%;
                  position: relative;
                  /* eslint-disable-next-line @elastic/eui/no-static-z-index -- local grid cell stacking, no semantic token applies */
                  z-index: ${selected ? 2 : 1};

                  &:hover,
                  &:focus-within {
                    z-index: 2;
                  }
                `}
              >
                <SignalMetricCard
                  card={card}
                  selected={selected}
                  dimmed={dimmed}
                  isExpanded={isExpanded}
                  onToggle={() => onFilterForCard(card.id)}
                />
              </div>
            );
          })}
        </div>
      </EuiPanel>
    </>
  );
};
