/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { assertNever } from '@kbn/std';
import { toDuration } from './duration';

export const INDICATOR_CUSTOM_KQL = i18n.translate('xpack.slo.indicators.customKql', {
  defaultMessage: 'Custom Query',
});

export const INDICATOR_CUSTOM_METRIC = i18n.translate('xpack.slo.indicators.customMetric', {
  defaultMessage: 'Custom Metric',
});

export const INDICATOR_TIMESLICE_METRIC = i18n.translate('xpack.slo.indicators.timesliceMetric', {
  defaultMessage: 'Timeslice Metric',
});

export const INDICATOR_HISTOGRAM = i18n.translate('xpack.slo.indicators.histogram', {
  defaultMessage: 'Histogram Metric',
});

export const INDICATOR_APM_LATENCY = i18n.translate('xpack.slo.indicators.apmLatency', {
  defaultMessage: 'APM latency',
});

export const INDICATOR_APM_LATENCY_DESCRIPTION = i18n.translate(
  'xpack.slo.indicators.apmLatency.description',
  {
    defaultMessage:
      'An APM latency SLO defines a response-time objective for application requests and monitors compliance over time to detect performance degradation and error budget burn.',
  }
);

export const INDICATOR_APM_AVAILABILITY = i18n.translate('xpack.slo.indicators.apmAvailability', {
  defaultMessage: 'APM availability',
});

export const INDICATOR_APM_AVAILABILITY_DESCRIPTION = i18n.translate(
  'xpack.slo.indicators.apmAvailability.description',
  {
    defaultMessage:
      'An APM availability SLO defines an error-rate objective for application requests and monitors compliance over time to detect reliability issues and error budget burn.',
  }
);

export const INDICATOR_SYNTHETICS_AVAILABILITY = i18n.translate(
  'xpack.slo.indicators.syntheticsAvailability',
  { defaultMessage: 'Synthetics availability' }
);

export const INDICATOR_SYNTHETICS_AVAILABILITY_DESCRIPTION = i18n.translate(
  'xpack.slo.indicators.syntheticsAvailability.description',
  {
    defaultMessage:
      'A Synthetics availability SLO monitors uptime and availability of your synthetic monitors over time.',
  }
);

export const INDICATOR_CUSTOM_KQL_DESCRIPTION = i18n.translate(
  'xpack.slo.indicators.customKql.description',
  {
    defaultMessage:
      'A Custom Query SLO uses KQL queries to define good and total events from any Elasticsearch index.',
  }
);

export const INDICATOR_CUSTOM_METRIC_DESCRIPTION = i18n.translate(
  'xpack.slo.indicators.customMetric.description',
  {
    defaultMessage:
      'A Custom Metric SLO uses metric aggregations to calculate SLI values from any Elasticsearch index.',
  }
);

export const INDICATOR_TIMESLICE_METRIC_DESCRIPTION = i18n.translate(
  'xpack.slo.indicators.timesliceMetric.description',
  {
    defaultMessage:
      'A Timeslice Metric SLO evaluates a metric threshold for each time slice to determine compliance.',
  }
);

export const INDICATOR_HISTOGRAM_DESCRIPTION = i18n.translate(
  'xpack.slo.indicators.histogram.description',
  {
    defaultMessage:
      'A Histogram Metric SLO uses histogram aggregations to calculate SLI values from histogram fields.',
  }
);

export function toIndicatorTypeLabel(
  indicatorType: SLOWithSummaryResponse['indicator']['type']
): string {
  switch (indicatorType) {
    case 'sli.kql.custom':
      return INDICATOR_CUSTOM_KQL;

    case 'sli.apm.transactionDuration':
      return INDICATOR_APM_LATENCY;

    case 'sli.apm.transactionErrorRate':
      return INDICATOR_APM_AVAILABILITY;

    case 'sli.synthetics.availability':
      return INDICATOR_SYNTHETICS_AVAILABILITY;

    case 'sli.metric.custom':
      return INDICATOR_CUSTOM_METRIC;

    case 'sli.histogram.custom':
      return INDICATOR_HISTOGRAM;

    case 'sli.metric.timeslice':
      return INDICATOR_TIMESLICE_METRIC;

    default:
      assertNever(indicatorType as never);
  }
}

export function toIndicatorTypeDescription(
  indicatorType: SLOWithSummaryResponse['indicator']['type']
): string {
  switch (indicatorType) {
    case 'sli.kql.custom':
      return INDICATOR_CUSTOM_KQL_DESCRIPTION;

    case 'sli.apm.transactionDuration':
      return INDICATOR_APM_LATENCY_DESCRIPTION;

    case 'sli.apm.transactionErrorRate':
      return INDICATOR_APM_AVAILABILITY_DESCRIPTION;

    case 'sli.synthetics.availability':
      return INDICATOR_SYNTHETICS_AVAILABILITY_DESCRIPTION;

    case 'sli.metric.custom':
      return INDICATOR_CUSTOM_METRIC_DESCRIPTION;

    case 'sli.histogram.custom':
      return INDICATOR_HISTOGRAM_DESCRIPTION;

    case 'sli.metric.timeslice':
      return INDICATOR_TIMESLICE_METRIC_DESCRIPTION;

    default:
      assertNever(indicatorType as never);
  }
}

export const BUDGETING_METHOD_OCCURRENCES = i18n.translate(
  'xpack.slo.budgetingMethod.occurrences',
  {
    defaultMessage: 'Occurrences',
  }
);

export const BUDGETING_METHOD_TIMESLICES = i18n.translate('xpack.slo.budgetingMethod.timeslices', {
  defaultMessage: 'Timeslices',
});

export function toDurationLabel(durationStr: string): string {
  const duration = toDuration(durationStr);

  switch (duration.unit) {
    case 'm':
      return i18n.translate('xpack.slo.duration.minute', {
        defaultMessage: '{duration, plural, one {1 minute} other {# minutes}}',
        values: {
          duration: duration.value,
        },
      });
    case 'h':
      return i18n.translate('xpack.slo.duration.hour', {
        defaultMessage: '{duration, plural, one {1 hour} other {# hours}}',
        values: {
          duration: duration.value,
        },
      });
    case 'd':
      return i18n.translate('xpack.slo.duration.day', {
        defaultMessage: '{duration, plural, one {1 day} other {# days}}',
        values: {
          duration: duration.value,
        },
      });
    case 'w':
      return i18n.translate('xpack.slo.duration.week', {
        defaultMessage: '{duration, plural, one {1 week} other {# weeks}}',
        values: {
          duration: duration.value,
        },
      });
    case 'M':
      return i18n.translate('xpack.slo.duration.month', {
        defaultMessage: '{duration, plural, one {1 month} other {# months}}',
        values: {
          duration: duration.value,
        },
      });
  }
}

export function toDurationAdverbLabel(durationStr: string): string {
  const duration = toDuration(durationStr);

  switch (duration.unit) {
    case 'm':
      return i18n.translate('xpack.slo.duration.minutely', {
        defaultMessage: 'Minutely',
      });
    case 'h':
      return i18n.translate('xpack.slo.duration.hourly', {
        defaultMessage: 'Hourly',
      });
    case 'd':
      return i18n.translate('xpack.slo.duration.daily', {
        defaultMessage: 'Daily',
      });
    case 'w':
      return i18n.translate('xpack.slo.duration.weekly', {
        defaultMessage: 'Weekly',
      });
    case 'M':
      return i18n.translate('xpack.slo.duration.monthly', {
        defaultMessage: 'Monthly',
      });
  }
}
