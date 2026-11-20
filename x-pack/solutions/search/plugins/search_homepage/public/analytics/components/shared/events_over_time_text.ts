/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { AnalyticsEventsOverTime } from '../../../../common/analytics';
import { formatCompactNumber } from './event_source_utils';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** "Events over time", naming what the chart covers whenever that is not every source. */
export const getEventsOverTimeTitle = ({
  sourceNames,
  totalSources,
}: {
  sourceNames: readonly string[];
  totalSources: number;
}): string => {
  if (sourceNames.length >= totalSources) {
    return i18n.translate('xpack.searchHomepage.analytics.eventsOverTime.title', {
      defaultMessage: 'Events over time',
    });
  }
  if (sourceNames.length === 1) {
    return i18n.translate('xpack.searchHomepage.analytics.eventsOverTime.sourceTitle', {
      defaultMessage: 'Events over time in {sourceName}',
      values: { sourceName: sourceNames[0] },
    });
  }
  return i18n.translate('xpack.searchHomepage.analytics.eventsOverTime.someSourcesTitle', {
    defaultMessage: 'Events over time in {count} of {total} sources',
    values: { count: sourceNames.length, total: totalSources },
  });
};

/**
 * How many events the chart shows over which period, e.g. "2.7K events in the last 7 days", so its
 * total is not mistaken for the all-time count in the page summary.
 */
export const getEventsRangeLabel = ({ from, to, total }: AnalyticsEventsOverTime): string => {
  const spanMs = to - from;
  const formattedTotal = formatCompactNumber(total);
  if (spanMs < 2 * HOUR_MS) {
    return i18n.translate('xpack.searchHomepage.analytics.eventsOverTime.rangeMinutes', {
      defaultMessage:
        '{total, plural, one {# event} other {{formattedTotal} events}} in the last {count, plural, one {minute} other {# minutes}}',
      values: { total, formattedTotal, count: Math.round(spanMs / MINUTE_MS) },
    });
  }
  if (spanMs < 2 * DAY_MS) {
    return i18n.translate('xpack.searchHomepage.analytics.eventsOverTime.rangeHours', {
      defaultMessage:
        '{total, plural, one {# event} other {{formattedTotal} events}} in the last {count, plural, one {hour} other {# hours}}',
      values: { total, formattedTotal, count: Math.round(spanMs / HOUR_MS) },
    });
  }
  return i18n.translate('xpack.searchHomepage.analytics.eventsOverTime.rangeDays', {
    defaultMessage:
      '{total, plural, one {# event} other {{formattedTotal} events}} in the last {count, plural, one {day} other {# days}}',
    values: { total, formattedTotal, count: Math.round(spanMs / DAY_MS) },
  });
};

const formatDateTime = (timestamp: number): string =>
  new Intl.DateTimeFormat(i18n.getLocale(), { dateStyle: 'medium', timeStyle: 'short' }).format(
    timestamp
  );

/** What the chart shows, in words, for people who cannot see it. */
export const getEventsOverTimeSummary = (data: AnalyticsEventsOverTime): string => {
  const [firstBucket, ...otherBuckets] = data.buckets;
  if (firstBucket === undefined) {
    return '';
  }
  const busiest = otherBuckets.reduce(
    (max, bucket) => (bucket.count > max.count ? bucket : max),
    firstBucket
  );
  return i18n.translate('xpack.searchHomepage.analytics.eventsOverTime.summary', {
    defaultMessage:
      'Bar chart of events from {from} to {to}: {total, plural, one {# event} other {{formattedTotal} events}} in total. The busiest period starts {busiestStart} with {busiestCount, plural, one {# event} other {{formattedBusiestCount} events}}.',
    values: {
      from: formatDateTime(data.from),
      to: formatDateTime(data.to),
      total: data.total,
      formattedTotal: formatCompactNumber(data.total),
      busiestStart: formatDateTime(busiest.timestamp),
      busiestCount: busiest.count,
      formattedBusiestCount: formatCompactNumber(busiest.count),
    },
  });
};
