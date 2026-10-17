/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useState, useRef, useLayoutEffect } from 'react';
import { EuiFlexGroup, EuiBadge, useEuiTheme, EuiIcon, EuiFlexItem } from '@elastic/eui';
import numeral from '@elastic/numeral';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

/** DistributionBar component props */
export interface DistributionBarProps {
  /** distribution data points */
  stats: Array<{
    key: string;
    count: number;
    color: string;
    label?: React.ReactNode;
    isCurrentFilter?: boolean;
    filter?: () => void;
    reset?: (event: React.MouseEvent<SVGElement, MouseEvent>) => void;
  }>;
  /** hide the label above the bar at first render */
  hideLastTooltip?: boolean;
  /** data-test-subj used for querying the component in tests */
  ['data-test-subj']?: string;
}

export interface EmptyBarProps {
  ['data-test-subj']?: string;
}

const useStyles = () => {
  const { euiTheme } = useEuiTheme();

  return {
    bar: css`
      gap: ${euiTheme.size.xxs};
      min-height: 7px; // for hovered bar to have enough space to grow
    `,
    part: {
      base: css`
        position: relative;
        border-radius: 2px;
        height: 5px;
        min-width: 10px; // prevents bar from shrinking too small
      `,
      empty: css`
        background-color: ${euiTheme.colors.lightShade};
        flex: 1;
      `,
      tick: css`
        &::after {
          content: '';
          opacity: 0;
          position: absolute;
          top: -10px;
          right: 0;
          width: 1px;
          height: 6px;
          background-color: ${euiTheme.colors.lightShade};
        }
      `,
      hover: css`
        &:hover {
          height: 7px;
          border-radius: 3px;

          .euiBadge {
            cursor: unset;
          }

          &::after {
            opacity: 1;
            transition: all 0.3s ease;
            top: -9px; // 10px - 1px to accommodate for height of hovered bar
          }

          transition: all 0.3s ease;
        }
      `,
      visibleTooltip: css`
        & > div {
          opacity: 1;
          top: calc(-${euiTheme.base + 2}px - 13px);
        }
        &::after {
          opacity: 1;
        }
      `,
    },
    tooltip: css`
      opacity: 0;
      position: absolute;
      z-index: ${Number(euiTheme.levels.content) + 1};
      height: calc(
        ${euiTheme.base + 2}px + 14px + 7px
      ); // 2px border of the badge + 14px height of the tick + 7px height of the bar
      top: calc(
        -${euiTheme.base + 2}px - 14px
      ); // 2px border of the badge + 14px height of the tick
      right: 0;

      &:hover {
        opacity: 1;
        top: calc(
          -${euiTheme.base + 2}px - 13px
        ); // 2px border of the badge + 14px height of the tick - 1px to accomodate for height of hovered bar
        transition: all 0.3s ease;
      }
    `,
    tooltipFlipped: css`
      left: 0;
      right: auto;
    `,
    tooltipActiveFilter: css`
      z-index: ${Number(euiTheme.levels.content) + 2};
    `,
    tooltipContent: css`
      display: inline-block;
    `,
    tooltipBadgeLeft: css`
      border-bottom-right-radius: 0;
      border-top-right-radius: 0;
    `,
    tooltipBadgeRight: css`
      border-left: none;
      border-bottom-left-radius: 0;
      border-top-left-radius: 0;
    `,
  };
};

const EmptyBar: React.FC<EmptyBarProps> = ({ 'data-test-subj': dataTestSubj }) => {
  const styles = useStyles();
  const emptyBarStyle = [styles.part.base, styles.part.empty];

  return <div css={emptyBarStyle} data-test-subj={`${dataTestSubj}`} />;
};

// Only show tooltip for segments thats hovered OR Set as Filter OR Last
const shouldShowTooltip = ({
  isHovered,
  isCurrentFilter,
  isLast,
  hasFilterActive,
  hideLastTooltip,
  isHoveringAnyStatsBar,
}: {
  isHovered: boolean;
  isCurrentFilter: boolean;
  isLast: boolean;
  hasFilterActive: boolean;
  hideLastTooltip?: boolean;
  isHoveringAnyStatsBar: boolean;
}) => {
  if (isHovered) return true;
  if (isCurrentFilter) return true;

  const shouldShowBecauseItIsLast = isLast && !hideLastTooltip && !hasFilterActive;

  return !isHoveringAnyStatsBar && shouldShowBecauseItIsLast;
};

/**
 * Security Solution DistributionBar component.
 * Shows visual representation of distribution of stats, such as alerts by criticality or misconfiguration findings by evaluation result.
 */
export const DistributionBar: React.FC<DistributionBarProps> = React.memo(function DistributionBar(
  props
) {
  const styles = useStyles();
  const { stats, 'data-test-subj': dataTestSubj, hideLastTooltip } = props;

  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [shouldFlipTooltip, setShouldFlipTooltip] = useState<Record<string, boolean>>({});
  const barContainerRef = useRef<HTMLDivElement>(null);
  const partRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const tooltipContentRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const hasCurrentFilter = useMemo(() => stats.some((item) => item.isCurrentFilter), [stats]);

  // Calculate which tooltips need to be flipped to prevent left overflow
  useLayoutEffect(() => {
    if (!barContainerRef.current) return;

    const recalculate = () => {
      if (!barContainerRef.current) return;

      try {
        const containerRect = barContainerRef.current.getBoundingClientRect();
        const flippedMap: Record<string, boolean> = {};

        stats.forEach((stat) => {
          const partElement = partRefs.current[stat.key];
          const tooltipContentElement = tooltipContentRefs.current[stat.key];
          if (!partElement || !tooltipContentElement) return;

          const partRect = partElement.getBoundingClientRect();
          const tooltipContentRect = tooltipContentElement.getBoundingClientRect();

          // Flip to left-aligned when right-aligned would overflow the left edge AND the right
          // side of the segment has at least as much room as the left side. This prevents the
          // flipped tooltip from causing a worse right overflow than the original left overflow.
          const tooltipLeftEdge = partRect.right - tooltipContentRect.width;
          if (tooltipLeftEdge < containerRect.left) {
            const spaceOnRight = containerRect.right - partRect.left;
            const spaceOnLeft = partRect.right - containerRect.left;
            if (spaceOnRight >= spaceOnLeft) {
              flippedMap[stat.key] = true;
            }
          }
        });

        // Use functional update to bail out when nothing changed
        setShouldFlipTooltip((prev) => {
          const hasChanged = stats.some(
            (stat) => (prev[stat.key] ?? false) !== (flippedMap[stat.key] ?? false)
          );
          return hasChanged ? flippedMap : prev;
        });
      } catch (e) {
        // non-critical layout calculation — swallow errors to avoid crashing the component
      }
    };

    recalculate();

    let debounceTimer: ReturnType<typeof setTimeout>;
    const observer = new ResizeObserver(() => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(recalculate, 50);
    });
    observer.observe(barContainerRef.current);

    return () => {
      clearTimeout(debounceTimer);
      observer.disconnect();
    };
  }, [stats]);

  const parts = stats.map((stat, index) => {
    const isLast = index === stats.length - 1;
    const isHovered = hoveredKey === stat.key;
    const shouldFlip = shouldFlipTooltip[stat.key] ?? false;

    // Only show tooltip for segments thats hovered OR Set as Filter OR Last
    const isCurrentFilter = stat.isCurrentFilter ?? false;
    const showTooltip = shouldShowTooltip({
      isHovered,
      isCurrentFilter,
      isLast,
      hasFilterActive: hasCurrentFilter,
      hideLastTooltip,
      isHoveringAnyStatsBar: Boolean(hoveredKey),
    });

    const partStyle = [
      styles.part.base,
      styles.part.tick,
      styles.part.hover,
      css`
        background-color: ${stat.color};
        flex: ${stat.count};
      `,
    ];

    if (showTooltip) {
      partStyle.push(styles.part.visibleTooltip);
    }

    const prettyNumber = numeral(stat.count).format('0,0a');

    return (
      <div
        key={stat.key}
        ref={(el) => {
          partRefs.current[stat.key] = el;
        }}
        css={partStyle}
        data-test-subj={`${dataTestSubj}__part`}
        data-tooltip-flipped={shouldFlip ? 'true' : 'false'}
        onClick={stat.filter}
        onMouseEnter={() => setHoveredKey(stat.key)}
        onMouseLeave={() => setHoveredKey(null)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            stat.filter?.();
          }
        }}
        tabIndex={0}
        role="button"
      >
        <div
          css={[
            styles.tooltip,
            showTooltip && styles.part.visibleTooltip,
            shouldFlip && styles.tooltipFlipped,
            isCurrentFilter && styles.tooltipActiveFilter,
          ]}
        >
          <div
            ref={(el) => {
              tooltipContentRefs.current[stat.key] = el;
            }}
            css={styles.tooltipContent}
          >
            <EuiFlexGroup
              gutterSize="none"
              justifyContent={shouldFlip ? 'flexStart' : 'flexEnd'}
              wrap={false}
              responsive={false}
            >
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow" css={styles.tooltipBadgeLeft}>
                  {prettyNumber}
                </EuiBadge>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow" css={styles.tooltipBadgeRight}>
                  <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                    <EuiFlexItem grow={false}>
                      <EuiIcon type="dot" size="s" color={stat.color} aria-hidden={true} />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>{stat.label ?? stat.key}</EuiFlexItem>
                    {stat.isCurrentFilter && stat.reset && (
                      <EuiFlexItem grow={false}>
                        <EuiIcon
                          type="cross"
                          size="m"
                          aria-label={i18n.translate(
                            'securitySolutionPackages.distributionBar.removeFilterAriaLabel',
                            { defaultMessage: 'Remove filter' }
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            setHoveredKey(null);
                            stat.reset?.(e);
                          }}
                        />
                      </EuiFlexItem>
                    )}
                  </EuiFlexGroup>
                </EuiBadge>
              </EuiFlexItem>
            </EuiFlexGroup>
          </div>
        </div>
      </div>
    );
  });

  return (
    <div ref={barContainerRef}>
      <EuiFlexGroup
        alignItems="center"
        css={styles.bar}
        data-test-subj={dataTestSubj}
        responsive={false}
      >
        {parts.length ? parts : <EmptyBar data-test-subj={`${dataTestSubj}__emptyBar`} />}
      </EuiFlexGroup>
    </div>
  );
});
