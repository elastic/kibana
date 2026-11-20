/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { DashboardLocatorParams } from '@kbn/dashboard-plugin/common';
import { toGeneratedPanelConfig } from '../../common/analytics_generated_dashboard';
import { buildClickstreamDashboardPanels } from './clickstream_dashboard';
import { quoteEsqlColumn, quoteEsqlSource } from './esql_identifiers';
import { TIME_BUCKETS_AS_LABELS, buildSourceDashboardPanels } from './source_dashboard';
import { getSampleUseCase } from './source_queries';
import type {
  AnalyticsEventSource,
  AnalyticsGeneratedPanel,
  AnalyticsUseCase,
  AnalyticsUseCaseId,
} from './types';

interface StarterDashboardFields {
  timeField: string;
  breakdownField: string;
  breakdownTitle: string;
}

type GenericDashboardUseCaseId = Exclude<AnalyticsUseCaseId, 'clickstream'>;

const getStarterDashboardFields = (): Record<
  GenericDashboardUseCaseId,
  StarterDashboardFields
> => ({
  gaming: {
    timeField: '@timestamp',
    breakdownField: 'event.action',
    breakdownTitle: i18n.translate(
      'xpack.searchHomepage.analytics.starterDashboard.gamingBreakdownTitle',
      { defaultMessage: 'Top player actions' }
    ),
  },
  transactions: {
    timeField: 'order_date',
    breakdownField: 'geoip.country_iso_code',
    breakdownTitle: i18n.translate(
      'xpack.searchHomepage.analytics.starterDashboard.transactionsBreakdownTitle',
      { defaultMessage: 'Top countries by orders' }
    ),
  },
  adtech: {
    timeField: '@timestamp',
    breakdownField: 'campaign.id',
    breakdownTitle: i18n.translate(
      'xpack.searchHomepage.analytics.starterDashboard.adtechBreakdownTitle',
      { defaultMessage: 'Top campaigns' }
    ),
  },
  iot: {
    timeField: '@timestamp',
    breakdownField: 'site.name',
    breakdownTitle: i18n.translate(
      'xpack.searchHomepage.analytics.starterDashboard.iotBreakdownTitle',
      { defaultMessage: 'Top sites' }
    ),
  },
  customerFacing: {
    timeField: '@timestamp',
    breakdownField: 'tenant.id',
    breakdownTitle: i18n.translate(
      'xpack.searchHomepage.analytics.starterDashboard.customerFacingBreakdownTitle',
      { defaultMessage: 'Top tenants' }
    ),
  },
});

/** Dashboard locator params for an unsaved dashboard with ES|QL panels over the use case's events. */
export const buildStarterDashboardParams = (useCase: AnalyticsUseCase): DashboardLocatorParams => {
  const { indexPattern } = useCase;
  const title = i18n.translate('xpack.searchHomepage.analytics.starterDashboard.title', {
    defaultMessage: '{useCase} overview',
    values: { useCase: useCase.title },
  });
  const timeRange = { from: 'now-7d', to: 'now' };

  if (useCase.id === 'clickstream') {
    return {
      title,
      viewMode: 'edit',
      time_range: timeRange,
      panels: buildClickstreamDashboardPanels(indexPattern),
    };
  }

  const { timeField, breakdownField, breakdownTitle } = getStarterDashboardFields()[useCase.id];
  // The named parameters bind each panel to the dashboard time picker whatever the time field is.
  const inTimeRange = `WHERE ${timeField} >= ?_tstart AND ${timeField} <= ?_tend`;

  return {
    title,
    viewMode: 'edit',
    time_range: timeRange,
    panels: [
      {
        type: 'vis',
        grid: { x: 0, y: 0, w: 12, h: 10 },
        config: {
          type: 'metric',
          title: i18n.translate('xpack.searchHomepage.analytics.starterDashboard.eventCountTitle', {
            defaultMessage: 'Events',
          }),
          data_source: {
            type: 'esql',
            query: `FROM ${indexPattern} | ${inTimeRange} | STATS events = COUNT(*)`,
          },
          metrics: [{ type: 'primary', column: 'events' }],
        },
      },
      {
        type: 'vis',
        grid: { x: 12, y: 0, w: 36, h: 10 },
        config: {
          type: 'xy',
          title: i18n.translate(
            'xpack.searchHomepage.analytics.starterDashboard.eventsOverTimeTitle',
            { defaultMessage: 'Events over time' }
          ),
          layers: [
            {
              type: 'line',
              data_source: {
                type: 'esql',
                query: `FROM ${indexPattern} | ${inTimeRange} | STATS events = COUNT(*) BY bucket = BUCKET(${timeField}, 75, ?_tstart, ?_tend)`,
              },
              x: { column: 'bucket' },
              y: [{ column: 'events' }],
            },
          ],
        },
      },
      {
        type: 'vis',
        grid: { x: 0, y: 10, w: 48, h: 12 },
        config: {
          type: 'xy',
          title: breakdownTitle,
          layers: [
            {
              type: 'bar_horizontal',
              data_source: {
                type: 'esql',
                query: `FROM ${indexPattern} | ${inTimeRange} | STATS events = COUNT(*) BY ${breakdownField} | SORT events DESC | LIMIT 10`,
              },
              x: { column: breakdownField },
              y: [{ column: 'events' }],
            },
          ],
        },
      },
    ],
  };
};

/**
 * Dashboard locator params for an unsaved dashboard over one of the user's event sources. Panels
 * are written from the parts the source's fields play; a source with no recognised field gets an
 * event count, plus events over time when it has a time field. Sample data gets its use case's
 * dashboard.
 */
export const buildSourceDashboardParams = (
  source: AnalyticsEventSource,
  selectedUseCaseId?: AnalyticsUseCaseId
): DashboardLocatorParams => {
  const sampleUseCase = getSampleUseCase(source);
  if (sampleUseCase) {
    return buildStarterDashboardParams(sampleUseCase);
  }

  const title = i18n.translate('xpack.searchHomepage.analytics.sourceDashboard.title', {
    defaultMessage: '{source} overview',
    values: { source: source.name },
  });
  if (source.fields !== undefined) {
    return {
      title,
      viewMode: 'edit',
      time_range: { from: 'now-7d', to: 'now' },
      panels: buildSourceDashboardPanels({ source, selectedUseCaseId }),
    };
  }

  const from = `FROM ${quoteEsqlSource(source.name)}`;
  const timeField = source.timeField === null ? null : quoteEsqlColumn(source.timeField);
  const inTimeRange =
    timeField === null ? '' : ` | WHERE ${timeField} >= ?_tstart AND ${timeField} <= ?_tend`;
  const eventCountTitle = i18n.translate(
    'xpack.searchHomepage.analytics.starterDashboard.eventCountTitle',
    { defaultMessage: 'Events' }
  );

  return {
    title,
    viewMode: 'edit',
    time_range: { from: 'now-7d', to: 'now' },
    panels: [
      {
        type: 'vis',
        grid: { x: 0, y: 0, w: 12, h: 10 },
        config: {
          type: 'metric',
          title: eventCountTitle,
          data_source: { type: 'esql', query: `${from}${inTimeRange} | STATS events = COUNT(*)` },
          metrics: [{ type: 'primary', column: 'events' }],
        },
      },
      ...(timeField === null
        ? []
        : [
            {
              type: 'vis' as const,
              grid: { x: 12, y: 0, w: 36, h: 10 },
              config: {
                type: 'xy' as const,
                title: i18n.translate(
                  'xpack.searchHomepage.analytics.starterDashboard.eventsOverTimeTitle',
                  { defaultMessage: 'Events over time' }
                ),
                layers: [
                  {
                    type: 'bar' as const,
                    data_source: {
                      type: 'esql' as const,
                      query: `${from}${inTimeRange} | STATS events = COUNT(*) BY bucket = BUCKET(${timeField}, 75, ?_tstart, ?_tend) | ${TIME_BUCKETS_AS_LABELS}`,
                    },
                    x: { column: 'bucket' },
                    y: [{ column: 'events' }],
                  },
                ],
              },
            },
          ]),
    ],
  };
};

/**
 * Dashboard locator params for an unsaved dashboard made of panels a model wrote for one of the
 * user's event sources; the server has run every panel's query against the source.
 */
export const buildGeneratedDashboardParams = (
  source: AnalyticsEventSource,
  panels: readonly AnalyticsGeneratedPanel[]
): DashboardLocatorParams => ({
  title: i18n.translate('xpack.searchHomepage.analytics.sourceDashboard.title', {
    defaultMessage: '{source} overview',
    values: { source: source.name },
  }),
  viewMode: 'edit',
  time_range: { from: 'now-7d', to: 'now' },
  panels: panels.map(({ grid, ...panel }) => ({
    type: 'vis',
    grid,
    config: toGeneratedPanelConfig(panel),
  })),
});
