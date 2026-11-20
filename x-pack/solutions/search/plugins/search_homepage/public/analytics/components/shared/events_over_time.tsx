/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, lazy, useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSkeletonRectangle,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useEventsOverTime } from '../../hooks/use_events_over_time';
import type { AnalyticsEventSource } from '../../types';
import { chartArea, getChartBlockSize } from './events_over_time_styles';
import {
  getEventsOverTimeSummary,
  getEventsOverTimeTitle,
  getEventsRangeLabel,
} from './events_over_time_text';
import type { AnalyticsPageId } from './page_ids';
import { getPageTestSubj } from './page_ids';
import { QuietErrorBoundary } from './quiet_error_boundary';

const EventsOverTimeChart = lazy(() =>
  import('./events_over_time_chart').then((module) => ({ default: module.EventsOverTimeChart }))
);

interface EventsOverTimeProps {
  page: AnalyticsPageId;
  headingElement: 'h2' | 'h3';
  /** The sources to chart; those without a time field are left out. */
  sources: readonly AnalyticsEventSource[];
  /** All sources in the cluster, so the title can say when the chart covers only some. */
  totalSources: number;
}

/**
 * The page's one graphic: events over time for the given sources. Renders nothing, rather than an
 * empty frame or an error, when no source has a time field, there are no recent events, or the
 * counts cannot be loaded.
 */
export const EventsOverTime = ({
  page,
  headingElement: Heading,
  sources,
  totalSources,
}: EventsOverTimeProps): React.JSX.Element | null => {
  const titleId = useGeneratedHtmlId({ prefix: 'analyticsEventsOverTime' });
  const { euiTheme } = useEuiTheme();
  const chartableSources = useMemo(
    () =>
      sources.flatMap(({ name, timeField }) => (timeField === null ? [] : [{ name, timeField }])),
    [sources]
  );
  const { data, isLoading, hasFailed, reportFailure } = useEventsOverTime(chartableSources);

  const hasNothingToShow = !isLoading && (data === undefined || data.buckets.length === 0);
  if (chartableSources.length === 0 || hasFailed || hasNothingToShow) {
    return null;
  }

  const skeleton = (
    <EuiSkeletonRectangle
      isLoading
      width="100%"
      height={getChartBlockSize(euiTheme)}
      borderRadius="m"
      contentAriaLabel={i18n.translate('xpack.searchHomepage.analytics.eventsOverTime.loading', {
        defaultMessage: 'events over time',
        description: 'Read out after the word "Loading" while the chart loads.',
      })}
      data-test-subj={getPageTestSubj(page, 'EventsOverTimeLoading')}
    />
  );

  return (
    <QuietErrorBoundary onError={() => reportFailure('render')}>
      <section aria-labelledby={titleId} data-test-subj={getPageTestSubj(page, 'EventsOverTime')}>
        <EuiFlexGroup
          gutterSize="s"
          alignItems="baseline"
          justifyContent="spaceBetween"
          responsive={false}
        >
          <EuiFlexItem>
            <EuiTitle size="xs">
              <Heading id={titleId} data-test-subj={getPageTestSubj(page, 'EventsOverTimeTitle')}>
                {getEventsOverTimeTitle({
                  sourceNames: chartableSources.map(({ name }) => name),
                  totalSources,
                })}
              </Heading>
            </EuiTitle>
          </EuiFlexItem>
          {data !== undefined && (
            <EuiFlexItem grow={false}>
              <EuiText
                size="xs"
                color="subdued"
                data-test-subj={getPageTestSubj(page, 'EventsOverTimeRange')}
              >
                {getEventsRangeLabel(data)}
              </EuiText>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <div css={chartArea}>
          {data === undefined ? (
            skeleton
          ) : (
            <Suspense fallback={skeleton}>
              <EventsOverTimeChart
                data={data}
                titleId={titleId}
                description={getEventsOverTimeSummary(data)}
              />
            </Suspense>
          )}
        </div>
      </section>
      <EuiSpacer size="l" />
    </QuietErrorBoundary>
  );
};
