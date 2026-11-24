/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import numeral from '@elastic/numeral';

export const NO_VALUE = '—';

const INTERVAL = /^(\d+)\s*(ms|s|m|h|d)$/;

const parseInterval = (value: string | undefined) => {
  const match = value ? INTERVAL.exec(value.trim()) : null;
  return match ? { count: Number(match[1]), unit: match[2] } : undefined;
};

/** "59s" as "59 seconds". Values that are not an interval are returned as they are. */
export const formatDuration = (value: string | undefined): string => {
  if (!value) {
    return NO_VALUE;
  }
  const interval = parseInterval(value);
  if (!interval) {
    return value;
  }
  const { count, unit } = interval;
  switch (unit) {
    case 'ms':
      return i18n.translate('xpack.securitySolution.entityAnalytics.entityStore.format.ms', {
        defaultMessage: '{count, plural, one {# millisecond} other {# milliseconds}}',
        values: { count },
      });
    case 's':
      return i18n.translate('xpack.securitySolution.entityAnalytics.entityStore.format.seconds', {
        defaultMessage: '{count, plural, one {# second} other {# seconds}}',
        values: { count },
      });
    case 'm':
      return i18n.translate('xpack.securitySolution.entityAnalytics.entityStore.format.minutes', {
        defaultMessage: '{count, plural, one {# minute} other {# minutes}}',
        values: { count },
      });
    case 'h':
      return i18n.translate('xpack.securitySolution.entityAnalytics.entityStore.format.hours', {
        defaultMessage: '{count, plural, one {# hour} other {# hours}}',
        values: { count },
      });
    default:
      return i18n.translate('xpack.securitySolution.entityAnalytics.entityStore.format.days', {
        defaultMessage: '{count, plural, one {# day} other {# days}}',
        values: { count },
      });
  }
};

/** "5m" as "Every 5 minutes", "1h" as "Every hour". */
export const formatFrequency = (value: string | undefined): string => {
  if (!value) {
    return NO_VALUE;
  }
  const interval = parseInterval(value);
  if (!interval) {
    return value;
  }
  const { count, unit } = interval;
  switch (unit) {
    case 'ms':
      return i18n.translate(
        'xpack.securitySolution.entityAnalytics.entityStore.format.everyMilliseconds',
        {
          defaultMessage: 'Every {count, plural, one {millisecond} other {# milliseconds}}',
          values: { count },
        }
      );
    case 's':
      return i18n.translate(
        'xpack.securitySolution.entityAnalytics.entityStore.format.everySeconds',
        {
          defaultMessage: 'Every {count, plural, one {second} other {# seconds}}',
          values: { count },
        }
      );
    case 'm':
      return i18n.translate(
        'xpack.securitySolution.entityAnalytics.entityStore.format.everyMinutes',
        {
          defaultMessage: 'Every {count, plural, one {minute} other {# minutes}}',
          values: { count },
        }
      );
    case 'h':
      return i18n.translate(
        'xpack.securitySolution.entityAnalytics.entityStore.format.everyHours',
        {
          defaultMessage: 'Every {count, plural, one {hour} other {# hours}}',
          values: { count },
        }
      );
    default:
      return i18n.translate('xpack.securitySolution.entityAnalytics.entityStore.format.everyDays', {
        defaultMessage: 'Every {count, plural, one {day} other {# days}}',
        values: { count },
      });
  }
};

/** 50000 as "50,000". */
export const formatCount = (value: number | undefined): string =>
  value === undefined ? NO_VALUE : numeral(value).format('0,0');

/** Days as "60 days". */
export const formatDays = (days: number): string =>
  i18n.translate('xpack.securitySolution.entityAnalytics.entityStore.format.retentionDays', {
    defaultMessage: '{days, plural, one {# day} other {# days}}',
    values: { days },
  });

/**
 * A task id, such as `entity_store:v2:extract_entity_non_priority_task:user:default`, as a name
 * people can read. Ids that are not Entity Store task ids are returned as they are.
 */
export const formatTaskName = (id: string): string => {
  const [prefix, , kind, subject] = id.split(':');
  if (prefix !== 'entity_store') {
    return id;
  }
  switch (kind) {
    case 'extract_entity_task':
      return i18n.translate('xpack.securitySolution.entityAnalytics.entityStore.task.extraction', {
        defaultMessage: 'Log extraction',
      });
    case 'extract_entity_non_priority_task':
      return i18n.translate(
        'xpack.securitySolution.entityAnalytics.entityStore.task.extractionNonPriority',
        { defaultMessage: 'Log extraction (non-priority)' }
      );
    case 'history_snapshot_task':
      return i18n.translate(
        'xpack.securitySolution.entityAnalytics.entityStore.task.historySnapshot',
        { defaultMessage: 'History snapshot' }
      );
    case 'status_report_task':
      return i18n.translate(
        'xpack.securitySolution.entityAnalytics.entityStore.task.statusReport',
        { defaultMessage: 'Status report' }
      );
    case 'entity_maintainer_task':
      return i18n.translate('xpack.securitySolution.entityAnalytics.entityStore.task.maintainer', {
        defaultMessage: 'Maintainer: {maintainer}',
        values: { maintainer: subject },
      });
    default:
      return id;
  }
};
