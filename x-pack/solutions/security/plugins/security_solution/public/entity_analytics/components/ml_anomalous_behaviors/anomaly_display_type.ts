/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { first, trim } from 'lodash';
import moment from 'moment';
import type { AnomalySummaryEntry, EntityType } from '../../../../common/api/entity_analytics';

const ENTROPY_FIELD_NAMES = new Set([
  'powershell.file.script_block_text',
  'dns.question.name',
  'process.command_line_entropy',
]);

const GEO_BY_FIELD_NAMES = new Set([
  'source.geo.region_name',
  'source.geo.city_name',
  'source.geo.country_iso_code',
  'client.geo.region_name',
]);

const BYTES_FIELD_NAMES = new Set(['source.bytes', 'destination.bytes', 'file.size']);

const formatBytes = (bytes: number): string => {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  if (bytes >= 1e3) return `${Math.round(bytes / 1e3)} KB`;
  return `${bytes} B`;
};

const getDetectorFunctionCategory = (detectorFunction: string) => {
  switch (detectorFunction) {
    case 'time_of_day':
    case 'time_of_week':
      return 'time';

    case 'high_distinct_count':
    case 'high_non_zero_count':
    case 'high_count':
    case 'low_count':
    case 'high_sum':
    case 'high_mean':
    case 'high_median':
    case 'high_varp':
    case 'low_mean':
    case 'high_info_content':
      return 'magnitude';

    case 'rare':
      return 'rare';

    default:
      return 'generic';
  }
};

const toHumanReadableFieldName = (detectorFunction: string, fieldName: string) => {
  const modifier = detectorFunction.includes('distinct') ? 'distinct ' : '';

  if (ENTROPY_FIELD_NAMES.has(fieldName)) {
    return `${modifier}content`;
  }

  switch (fieldName) {
    case 'event.action':
      return `${modifier}actions`;
    case 'destination.ip':
      return `${modifier}destination IPs`;
    case 'destination.port':
      return `${modifier}destination ports`;
    case 'source.ip':
      return `${modifier}source IPs`;
    case 'gcp.audit.status.message':
      return `${modifier}statuses`;
    case 'session.duration':
      return `${modifier}session duration`;
    case 'total_length_process_args':
      return `${modifier}process arg length`;
    case 'process.command_line_entropy':
      return `${modifier}command entropy`;
    case 'file.size':
      return `${modifier}file size`;
    case 'powershell.file.script_block_text':
      return `${modifier}script length`;
    case 'dns_question_etld':
      return `${modifier}domain`;
    case 'blocklist_label':
      return `${modifier}blocklist hit`;
    case 'ml_is_dga.malicious_probability':
      return `${modifier}DGA probability`;
    case 'number_processes_per_session':
      return `${modifier}processes / session`;
    case 'okta_distinct_ips':
      return `${modifier}distinct IPs`;
    case 'problemchild.prediction_probability':
      return `${modifier}prediction score`;
    case 'source.bytes':
      return `${modifier}bytes sent`;
    case 'destination.geo.country_iso_code':
      return `${modifier}country`;
    case 'destination.geo.region_name':
      return `${modifier}region`;
    default:
      return `${modifier}events`;
  }
};

const formatValueBasedOnFieldName = (
  detectorFunction: string | null,
  fieldName: string | null,
  value: number
): string => {
  if (fieldName) {
    if (BYTES_FIELD_NAMES.has(fieldName)) {
      return formatBytes(value);
    }

    if (ENTROPY_FIELD_NAMES.has(fieldName)) {
      return `${value} bits`;
    }

    if (fieldName === 'session.duration') {
      return `${value} ms`;
    }

    if (fieldName === 'total_length_process_args') {
      return `${value} chars`;
    }
  }

  return detectorFunction
    ? `${value} ${toHumanReadableFieldName(detectorFunction, fieldName ?? '')}`
    : `${value}`;
};

const getModifierForDetectorFunction = (detectorFunction: string): string => {
  switch (detectorFunction) {
    case 'high_count':
    case 'high_distinct_count':
    case 'high_non_zero_count':
    case 'low_count':
      return '';
    case 'high_mean':
    case 'low_mean':
    case 'high_info_content':
      return 'avg ';
    case 'high_median':
      return 'median ';
    case 'high_sum':
      return 'total ';
    case 'high_varp':
      return 'variance of ';
    default:
      return '';
  }
};

const getComparatorForDetectorFunction = (detectorFunction: string): string =>
  detectorFunction.startsWith('high') ? '≤ ' : '≥ ';

const getByClause = (
  entityType: EntityType,
  byFieldName: string | null,
  byFieldValue: string | null
): string =>
  byFieldName && !byFieldName.startsWith(`${entityType}.`)
    ? ` where ${byFieldName}${byFieldValue ? ` is ${byFieldValue}` : ' exists'}`
    : '';

const getOverClause = (
  entityType: EntityType,
  detectorFunction: string,
  overFieldName: string | null,
  overFieldValue: string | null
): string =>
  overFieldName && !overFieldName.startsWith(`${entityType}.`)
    ? ` for ${overFieldValue ? `${overFieldValue} ` : ''}${toHumanReadableFieldName(
        detectorFunction,
        overFieldName
      )}`
    : '';

const getPartitionClause = (
  entityType: EntityType,
  partitionFieldName: string | null,
  partitionFieldValue: string | null
): string =>
  partitionFieldName && !partitionFieldName.startsWith(`${entityType}.`)
    ? ` where ${partitionFieldName}${
        partitionFieldValue ? ` is ${partitionFieldValue}` : ' exists'
      }`
    : '';

const magnitudeAnomalyToDisplayDetails = (anomaly: AnomalySummaryEntry) => {
  const { detectorFunction, fieldName } = anomaly;
  const observed = anomaly.actual[0] ?? 0;
  const expected = anomaly.typical[0] ?? 0;

  const formattedExpected = formatValueBasedOnFieldName(null, fieldName, expected);
  const formattedObserved = formatValueBasedOnFieldName(detectorFunction, fieldName, observed);

  // set values based on detector function
  const modifier = getModifierForDetectorFunction(detectorFunction);
  const comparator = getComparatorForDetectorFunction(detectorFunction);
  const fieldClause = toHumanReadableFieldName(detectorFunction, fieldName ?? '');

  return {
    expectedHeader: `${
      modifier
        ? `${modifier}${fieldClause} ${comparator}${formattedExpected}`
        : `${modifier}${comparator}${formattedExpected} ${fieldClause}`
    }`,
    observedHeader: `${formattedObserved}`,
  };
};

const rareAnomalyToDisplayDetails = (anomaly: AnomalySummaryEntry) => {
  const topBaselineValue = first(
    (anomaly.baseline ?? [])
      .filter((b) => b.value !== anomaly.byFieldValue)
      .map((b) => ({
        value: b.value,
        count: b.docCount,
      }))
  );
  const observedCount = (anomaly.baseline ?? [])
    .filter((b) => b.value === anomaly.byFieldValue)
    .map((b) => b.docCount);
  return {
    cardType: GEO_BY_FIELD_NAMES.has(anomaly.byFieldName ?? '') ? 'geo' : 'rare',
    expectedHeader: topBaselineValue?.value ?? '',
    observedHeader: anomaly.byFieldValue ?? '',
    observedSubtitle: observedCount ? `${observedCount[0]} occurrences` : '',
  };
};

const timeAnomalyToDisplayDetails = (anomaly: AnomalySummaryEntry) => {
  const observed = anomaly.actual[0] ?? 0;
  const expected = anomaly.typical[0] ?? 0;

  if (anomaly.detectorFunction === 'time_of_day') {
    return {
      expectedHeader: `Activity around ${moment.utc(expected * 1000).format('HH:mm')}`,
      observedHeader: `Activity at ${moment.utc(observed * 1000).format('HH:mm')}`,
    };
  }

  // seconds since the start of the week must be normalized to the start of the week
  // a Monday 00:00:00 timestamp is used as the reference point for formatting
  return {
    expectedHeader: `Activity around ${moment
      .utc('2018-01-01') // known Monday
      .add(expected, 'seconds')
      .format('ddd HH:mm')}`,
    observedHeader: `Activity at ${moment
      .utc('2018-01-01') // known Monday
      .add(observed, 'seconds')
      .format('ddd HH:mm')}`,
  };
};

interface AnomalyDisplayDetails {
  cardType: string;
  expectedHeader?: string;
  expectedSubtitle?: string;
  observedHeader?: string;
  observedSubtitle?: string;
}

export const anomalyToDisplayDetails = (
  entityType: EntityType,
  anomaly: AnomalySummaryEntry
): AnomalyDisplayDetails => {
  const {
    detectorFunction,
    byFieldName,
    byFieldValue,
    overFieldName,
    overFieldValue,
    partitionFieldName,
    partitionFieldValue,
  } = anomaly;
  const category = getDetectorFunctionCategory(detectorFunction);
  const byClause = getByClause(entityType, byFieldName, byFieldValue);
  const overClause = getOverClause(entityType, detectorFunction, overFieldName, overFieldValue);
  const partitionClause = getPartitionClause(entityType, partitionFieldName, partitionFieldValue);

  const expectedSubtitle = trim(`${byClause}${overClause}${partitionClause}`);

  switch (category) {
    case 'magnitude':
      return {
        cardType: 'magnitude',
        expectedSubtitle,
        ...magnitudeAnomalyToDisplayDetails(anomaly),
      };

    case 'rare':
      return {
        expectedSubtitle: trim(`${overClause}${partitionClause}`),
        ...rareAnomalyToDisplayDetails(anomaly),
      };

    case 'time':
      return { cardType: 'calendar', expectedSubtitle, ...timeAnomalyToDisplayDetails(anomaly) };

    default:
      return { cardType: 'unknown' };
  }
};
