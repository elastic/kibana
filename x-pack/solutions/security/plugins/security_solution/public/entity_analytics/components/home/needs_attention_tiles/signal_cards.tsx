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

import type { SignalCardData, SignalCardId } from './data';

export interface SignalCardsProps {
  activeTile: SignalCardId | null;
  /** Tile values for the current page filters. */
  cards: SignalCardData[];
  onFilterForTile: (tileId: SignalCardId) => void;
  /** Kept for MetricChartsPanel wiring; tiles are whole-tile toggles in v.5. */
  onFilterOutTile?: (tileId: SignalCardId) => void;
  onAddTileToTimeline?: (tileId: SignalCardId) => void;
}

/** Named container so the grid can step columns from its own width, not the viewport. */
const SIGNAL_CARDS_CONTAINER = 'eaSignalCards';
/** Compact: 6-across, then 3 / 2 / 1 so the last row stays even. */
const COMPACT_CARD_MIN_WIDTH = '12rem';
const COMPACT_COLUMN_STEPS = [6, 3, 2, 1] as const;
/** Expanded: two rows of 3, then 2 / 1. */
const EXPANDED_CARD_MIN_WIDTH = '16rem';
const EXPANDED_COLUMN_STEPS = [3, 2, 1] as const;
const METRIC_LINE_HEIGHT = 1.2;
const DIMMED_OPACITY = 0.7;

const spaceForColumns = (count: number, minItemWidth: string, gap: string): string =>
  count === 1 ? minItemWidth : `calc(${count} * ${minItemWidth} + ${count - 1} * ${gap})`;

/**
 * Caps column count (compact 6, expanded 3) and steps down via container queries
 * when tiles would otherwise shrink below `minItemWidth`.
 */
const layoutCappedGridCss = ({
  minItemWidth,
  columnSteps,
  gap,
}: {
  minItemWidth: string;
  columnSteps: readonly number[];
  gap: string;
}) => {
  const [maxColumns, ...narrower] = columnSteps;
  const steps = narrower
    .map((columns, index) => {
      const threshold = spaceForColumns(columnSteps[index], minItemWidth, gap);
      return `
        @container ${SIGNAL_CARDS_CONTAINER} (width < ${threshold}) {
          grid-template-columns: repeat(${columns}, minmax(0, 1fr));
        }
      `;
    })
    .join('');

  return css`
    display: grid;
    gap: ${gap};
    grid-template-columns: repeat(${maxColumns}, minmax(0, 1fr));
    ${steps}
  `;
};

const displayDescriptionFor = (card: SignalCardData): string => card.description;

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

const compactLayoutTooltip = i18n.translate(
  'xpack.securitySolution.entityAnalytics.facelift.signalCards.compactLayoutTooltip',
  { defaultMessage: 'Compact layout' }
);

const expandedLayoutTooltip = i18n.translate(
  'xpack.securitySolution.entityAnalytics.facelift.signalCards.expandedLayoutTooltip',
  { defaultMessage: 'Expanded layout' }
);

const switchToCompactLayoutAriaLabel = i18n.translate(
  'xpack.securitySolution.entityAnalytics.facelift.signalCards.switchToCompactLayoutAriaLabel',
  { defaultMessage: 'Switch to compact layout' }
);

const switchToExpandedLayoutAriaLabel = i18n.translate(
  'xpack.securitySolution.entityAnalytics.facelift.signalCards.switchToExpandedLayoutAriaLabel',
  { defaultMessage: 'Switch to expanded layout' }
);

const CornerControl: React.FC<{
  selected: boolean;
  interactive: boolean;
  emphasized: boolean;
  title: string;
  onToggle: () => void;
}> = ({ selected, interactive, emphasized, title, onToggle }) => {
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

  return (
    <button
      type="button"
      // Stay in the tab order only while selected so we do not add a second
      // stop per tile; keep the node mounted so keyboard clear does not lose focus.
      tabIndex={selected ? 0 : -1}
      aria-label={
        selected
          ? i18n.translate(
              'xpack.securitySolution.entityAnalytics.facelift.signalCards.clearFilter',
              { defaultMessage: 'Clear table filter' }
            )
          : filterTableTooltip(title)
      }
      data-test-subj="eaFaceliftSignalCardClearFilter"
      onMouseDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onToggle();
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
  const displayTitle = card.title;
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
      aria-label={
        isLoading
          ? i18n.translate(
              'xpack.securitySolution.entityAnalytics.facelift.signalCards.ariaLabelLoading',
              {
                defaultMessage: '{title}: loading. {description}',
                values: { title: displayTitle, description: displayDescription },
              }
            )
          : i18n.translate(
              'xpack.securitySolution.entityAnalytics.facelift.signalCards.ariaLabelCount',
              {
                defaultMessage: '{title}: {count}. {description}',
                values: {
                  title: displayTitle,
                  count: isZero ? 0 : card.value,
                  description: displayDescription,
                },
              }
            )
      }
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
        min-block-size: ${isExpanded ? `calc(${euiTheme.base}px * 10)` : 'auto'};
        padding: ${euiTheme.size.s};
        border: 1px solid ${borderColor};
        border-radius: ${euiTheme.border.radius.medium};
        background: ${tileBackground};
        opacity: ${dimmed ? DIMMED_OPACITY : 1};
        cursor: ${interactive ? 'pointer' : 'default'};
        outline: none;
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
              title={displayTitle}
              onToggle={onToggle}
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
 * Needs-attention metrics in a capped wrapping grid (6 compact, 3 expanded).
 * Each card toggles an in-page table filter; selection stays on the card itself.
 */
export const SignalCards: React.FC<SignalCardsProps> = ({ activeTile, cards, onFilterForTile }) => {
  const { euiTheme } = useEuiTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const anySelected = activeTile != null;

  return (
    <>
      <div
        css={css`
          display: flex;
          justify-content: flex-end;
          margin-block-end: ${euiTheme.size.xs};
        `}
      >
        <EuiToolTip content={isExpanded ? compactLayoutTooltip : expandedLayoutTooltip}>
          <EuiButtonIcon
            iconType={isExpanded ? 'tableOfContents' : 'apps'}
            onClick={() => setIsExpanded((prev) => !prev)}
            aria-label={
              isExpanded ? switchToCompactLayoutAriaLabel : switchToExpandedLayoutAriaLabel
            }
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
          container-type: inline-size;
          container-name: ${SIGNAL_CARDS_CONTAINER};
        `}
      >
        <div
          css={layoutCappedGridCss({
            minItemWidth: isExpanded ? EXPANDED_CARD_MIN_WIDTH : COMPACT_CARD_MIN_WIDTH,
            columnSteps: isExpanded ? EXPANDED_COLUMN_STEPS : COMPACT_COLUMN_STEPS,
            gap: euiTheme.size.s,
          })}
        >
          {cards.map((card) => {
            const selected = activeTile === card.id;
            const dimmed = Boolean(anySelected && !selected);

            return (
              <div
                key={card.id}
                css={css`
                  min-inline-size: 0;
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
                  onToggle={() => onFilterForTile(card.id)}
                />
              </div>
            );
          })}
        </div>
      </EuiPanel>
    </>
  );
};
