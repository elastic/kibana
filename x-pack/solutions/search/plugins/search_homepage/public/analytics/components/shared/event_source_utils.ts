/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ANALYTICS_SAMPLE_EVENTS_INDEX } from '../../../../common/analytics_sample_events';
import type { AnalyticsClusterState, AnalyticsEventSource, AnalyticsSource } from '../../types';

/** Whether the source is set up through the Integrations app, which needs its own privilege. */
export const isIntegrationSource = ({ target: { type } }: AnalyticsSource): boolean =>
  type === 'integrationSearch' || type === 'integrationCategory' || type === 'integrationCreate';

/**
 * The source to work with before the user picks one: their largest own source, else the
 * clickstream sample events, else the largest sample. Expects the largest sources first.
 */
export const getDefaultEventSource = (
  sources: readonly AnalyticsEventSource[]
): AnalyticsEventSource | undefined =>
  sources.find(({ isSampleData }) => !isSampleData) ??
  sources.find(({ name }) => name === ANALYTICS_SAMPLE_EVENTS_INDEX) ??
  sources[0];

/** Whether every event source in the cluster is sample data, so nothing new is arriving. */
export const hasOnlySampleSources = ({
  sources,
  totalSources,
}: Pick<AnalyticsClusterState, 'sources' | 'totalSources'>): boolean =>
  sources.length > 0 &&
  totalSources <= sources.length &&
  sources.every(({ isSampleData }) => isSampleData);

export const formatCompactNumber = (value: number): string =>
  new Intl.NumberFormat(i18n.getLocale(), {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);

/** One-line description of what the deployment holds, e.g. "1.2M events · 3 sources". */
export const getClusterSummary = (
  { documentsCount, totalSources, dashboardsCount }: AnalyticsClusterState,
  { includeDashboards }: { includeDashboards: boolean }
): string => {
  const parts: string[] = [];
  if (documentsCount !== null) {
    parts.push(
      i18n.translate('xpack.searchHomepage.analytics.summary.events', {
        defaultMessage: '{count, plural, one {# event} other {{formattedCount} events}}',
        values: { count: documentsCount, formattedCount: formatCompactNumber(documentsCount) },
      })
    );
  }
  parts.push(
    i18n.translate('xpack.searchHomepage.analytics.summary.sources', {
      defaultMessage: '{count, plural, one {# source} other {# sources}}',
      values: { count: totalSources },
    })
  );
  if (includeDashboards) {
    parts.push(
      i18n.translate('xpack.searchHomepage.analytics.summary.dashboards', {
        defaultMessage: '{count, plural, one {# dashboard} other {# dashboards}}',
        values: { count: dashboardsCount },
      })
    );
  }
  return parts.join(' · ');
};

/** Message sent to the agent when the user asks it to help explore one of their event sources. */
export const getExploreSourceAgentPrompt = ({
  name,
  kind,
  timeField,
}: AnalyticsEventSource): string =>
  `Help me explore the events in the ${name} ${
    kind === 'dataStream' ? 'data stream' : 'index'
  } with ES|QL.${
    timeField ? ` The event time is in the ${timeField} field.` : ''
  } Look at the fields it has, suggest the most useful questions to ask of these events, then write and run the queries.`;
