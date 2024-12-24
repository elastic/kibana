/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useRef, useCallback, useEffect } from 'react';
import {
  EuiFlexItem,
  EuiFlexGroup,
  useEuiTheme,
  useEuiMaxBreakpoint,
  useEuiMinBreakpoint,
  useIsWithinBreakpoints,
  useResizeObserver,
  EuiListGroup,
  EuiListGroupItem,
  EuiSpacer,
} from '@elastic/eui';
import { css, cx } from '@emotion/css';
import { useAssetDetailsRenderPropsContext } from '../../hooks/use_asset_details_render_props';
import { useTabSwitcherContext } from '../../hooks/use_tab_switcher';
import { AddMetricsCalloutKey } from '../../add_metrics_callout/constants';
import { AddMetricsCallout } from '../../add_metrics_callout';
import { useEntitySummary } from '../../hooks/use_entity_summary';
import { isMetricsSignal } from '../../utils/get_data_stream_types';

export const MetricsTemplate = React.forwardRef<HTMLDivElement, { children: React.ReactNode }>(
  ({ children }, ref) => {
    const { euiTheme } = useEuiTheme();
    const { asset, renderMode } = useAssetDetailsRenderPropsContext();
    const { scrollTo, setScrollTo } = useTabSwitcherContext();
    const { dataStreams, status: dataStreamsStatus } = useEntitySummary({
      entityType: asset.type,
      entityId: asset.id,
    });

    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const initialScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const quickAccessItemsRef = useRef<Map<string, string | undefined>>(new Map());
    const contentRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
    const quickAccessRef = useRef<HTMLDivElement | null>(null);

    const isLargeScreen = useIsWithinBreakpoints(['xl'], true);
    const listGroupDimensions = useResizeObserver(quickAccessRef.current);

    const kibanaHeaderOffset =
      renderMode.mode === 'flyout'
        ? `0px`
        : `var(--kbnAppHeadersOffset, var(--euiFixedHeadersOffset, 0))`;

    const quickAccessHorizontalOffset = isLargeScreen
      ? `${euiTheme.size.s} - 1px` // arbitrary value to align with the content
      : `${listGroupDimensions.height}px`;

    const quickAccessOffset = `calc(${kibanaHeaderOffset} + ${quickAccessHorizontalOffset})`;

    const setContentRef = useCallback((contentRef: HTMLDivElement | null) => {
      const sectionId = contentRef?.getAttribute('data-section-id');
      const label = contentRef?.innerText;
      if (!sectionId) {
        return;
      }

      contentRefs.current[sectionId] = contentRef;

      if (!quickAccessItemsRef.current.has(sectionId)) {
        quickAccessItemsRef.current.set(sectionId, label);
      }
    }, []);

    const scrollToSection = useCallback((sectionId: string, retries = 5, delay = 300) => {
      const chartEl = contentRefs.current[sectionId]?.querySelectorAll('.euiPanel') ?? [];
      if (chartEl.length > 0) {
        contentRefs.current[sectionId]?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      } else if (retries > 0) {
        // Retry scrolling after a delay - needed for conditionally rendered content
        const nextDelay = delay * 2;
        scrollTimeoutRef.current = setTimeout(
          () => scrollToSection(sectionId, retries - 1),
          nextDelay
        );
      }
    }, []);

    const onQuickAccessItemClick = (metric: string) => {
      if (metric !== scrollTo) {
        setScrollTo(metric);
      } else {
        scrollToSection(metric);
      }
    };

    useEffect(() => {
      if (scrollTo) {
        // Wait for the calculation of quickAccessOffset
        initialScrollTimeoutRef.current = setTimeout(() => scrollToSection(scrollTo), 100);
      }
    }, [scrollTo, scrollToSection]);

    useEffect(
      () => () => {
        [scrollTimeoutRef.current, initialScrollTimeoutRef.current]
          .filter((timeout): timeout is NodeJS.Timeout => !!timeout)
          .forEach((timeout) => clearTimeout(timeout));
      },
      []
    );

    const quickAccessItems = [...quickAccessItemsRef.current];

    const showAddMetricsCallout =
      dataStreamsStatus === 'success' &&
      !isMetricsSignal(dataStreams) &&
      renderMode.mode === 'page';
    const addMetricsCalloutId: AddMetricsCalloutKey =
      asset.type === 'host' ? 'hostMetrics' : 'containerMetrics';

    return (
      <>
        {showAddMetricsCallout && (
          <>
            <AddMetricsCallout id={addMetricsCalloutId} />
            <EuiSpacer size="s" />
          </>
        )}
        <EuiFlexGroup
          gutterSize="s"
          direction="row"
          css={css`
            ${useEuiMaxBreakpoint('xl')} {
              flex-direction: column;
            }
          `}
          data-test-subj="infraAssetDetailsMetricChartsContent"
          ref={ref}
        >
          <EuiFlexItem
            grow={false}
            css={css`
              position: sticky;
              top: ${kibanaHeaderOffset};
              background: ${euiTheme.colors.emptyShade};
              min-width: 100px;
              z-index: ${euiTheme.levels.navigation};
              ${useEuiMinBreakpoint('xl')} {
                align-self: flex-start;
              }
            `}
          >
            <div ref={quickAccessRef}>
              <EuiListGroup
                flush
                css={css`
                  ${useEuiMaxBreakpoint('xl')} {
                    flex-direction: row;
                    flex-wrap: wrap;
                    gap: 0px ${euiTheme.size.xl};
                    min-width: 100%;
                    border-bottom: ${euiTheme.border.thin};
                  }
                `}
              >
                {quickAccessItems.map(([sectionId, label]) => (
                  <EuiListGroupItem
                    data-test-subj={`infraMetricsQuickAccessItem${sectionId}`}
                    key={sectionId}
                    onClick={() => onQuickAccessItemClick(sectionId)}
                    color="text"
                    size="s"
                    className={cx({
                      [css`
                        text-decoration: underline;
                      `]: sectionId === scrollTo,
                    })}
                    css={css`
                      background-color: unset;
                      & > button {
                        padding-block: ${euiTheme.size.s};
                        padding-inline: 0px;
                      }
                      &:hover,
                      &:focus-within {
                        background-color: unset;
                      }
                    `}
                    label={label}
                  />
                ))}
              </EuiListGroup>
            </div>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup
              gutterSize="m"
              direction="column"
              css={css`
                padding-top: ${euiTheme.size.s};
                & > [data-section-id] {
                  scroll-margin-top: ${quickAccessOffset};
                }
              `}
            >
              {React.Children.map(children, (child, index) => {
                if (React.isValidElement(child)) {
                  return React.cloneElement(child as React.ReactElement, {
                    ref: setContentRef,
                    key: index,
                  });
                }
              })}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    );
  }
);
