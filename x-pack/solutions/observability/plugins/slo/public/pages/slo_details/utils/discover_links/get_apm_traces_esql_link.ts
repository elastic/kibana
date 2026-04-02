/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiscoverStart } from '@kbn/discover-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import { ESQL_CONTROL } from '@kbn/controls-constants';
import {
  ALL_VALUE,
  apmTransactionDurationIndicatorSchema,
  apmTransactionErrorRateIndicatorSchema,
  type SLOWithSummaryResponse,
} from '@kbn/slo-schema';
import { i18n } from '@kbn/i18n';
import { esql } from '@elastic/esql';
import {
  EVENT_OUTCOME,
  PROCESSOR_EVENT,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  TRANSACTION_DURATION,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '@kbn/apm-types';
import type { SloEventType } from '../../types';

const SLO_EVENT_FILTER_VARIABLE = 'event_type';

const SLO_EVENT_GOOD = 'Good';
const SLO_EVENT_BAD = 'Bad';
const SLO_EVENT_ALL = 'All';

function buildBaseWhereClauses(
  query: ReturnType<typeof esql.from>,
  params: {
    service: string;
    environment: string;
    transactionType: string;
    transactionName: string;
  }
): ReturnType<typeof esql.from> {
  let q = query.where`${esql.col(PROCESSOR_EVENT)} == "transaction"`;

  if (params.service !== ALL_VALUE) {
    q = q.where`${esql.col(SERVICE_NAME)} == ${params.service}`;
  }
  if (params.environment !== ALL_VALUE) {
    q = q.where`${esql.col(SERVICE_ENVIRONMENT)} == ${params.environment}`;
  }
  if (params.transactionType !== ALL_VALUE) {
    q = q.where`${esql.col(TRANSACTION_TYPE)} == ${params.transactionType}`;
  }
  if (params.transactionName !== ALL_VALUE) {
    q = q.where`${esql.col(TRANSACTION_NAME)} == ${params.transactionName}`;
  }

  return q;
}

function buildGroupingsWhereClauses(
  query: ReturnType<typeof esql.from>,
  groupings: SLOWithSummaryResponse['groupings']
): ReturnType<typeof esql.from> {
  return Object.entries(groupings).reduce((q, [field, value]) => {
    if (typeof value === 'number') {
      return q.where`${esql.col(field)} == ${value}`;
    }
    return q.where`${esql.col(field)} == ${String(value)}`;
  }, query);
}

function buildApmLatencyEsqlQuery(slo: SLOWithSummaryResponse, transactionIndex: string): string {
  if (!apmTransactionDurationIndicatorSchema.is(slo.indicator)) return '';

  const { params } = slo.indicator;
  // threshold is in ms, transaction.duration.us is in microseconds
  const thresholdUs = Math.trunc(params.threshold * 1000);

  let query = esql.from(transactionIndex);
  query = buildBaseWhereClauses(query, params);
  query = buildGroupingsWhereClauses(query, slo.groupings);
  query = query.pipe`EVAL ${esql.col(SLO_EVENT_FILTER_VARIABLE)} = CASE(${esql.col(
    TRANSACTION_DURATION
  )} <= ${thresholdUs}, ${SLO_EVENT_GOOD}, ${SLO_EVENT_BAD})`;
  query = query.pipe`WHERE (?${esql.col(
    SLO_EVENT_FILTER_VARIABLE
  )} == ${SLO_EVENT_BAD} AND ${esql.col(TRANSACTION_DURATION)} > ${thresholdUs}) OR (?${esql.col(
    SLO_EVENT_FILTER_VARIABLE
  )} == ${SLO_EVENT_GOOD} AND ${esql.col(TRANSACTION_DURATION)} <= ${thresholdUs}) OR ?${esql.col(
    SLO_EVENT_FILTER_VARIABLE
  )} == ${SLO_EVENT_ALL}`;

  return query.print();
}

function buildApmAvailabilityEsqlQuery(
  slo: SLOWithSummaryResponse,
  transactionIndex: string
): string {
  if (!apmTransactionErrorRateIndicatorSchema.is(slo.indicator)) return '';

  const { params } = slo.indicator;

  let query = esql.from(transactionIndex);
  query = buildBaseWhereClauses(query, params);
  query = buildGroupingsWhereClauses(query, slo.groupings);
  query = query.where`${esql.col(EVENT_OUTCOME)} IN ("success", "failure")`;
  query = query.pipe`EVAL ${esql.col(SLO_EVENT_FILTER_VARIABLE)} = CASE(${esql.col(
    EVENT_OUTCOME
  )} == "success", ${SLO_EVENT_GOOD}, ${SLO_EVENT_BAD})`;
  query = query.pipe`WHERE (?${esql.col(
    SLO_EVENT_FILTER_VARIABLE
  )} == ${SLO_EVENT_BAD} AND ${esql.col(EVENT_OUTCOME)} == "failure") OR (?${esql.col(
    SLO_EVENT_FILTER_VARIABLE
  )} == ${SLO_EVENT_GOOD} AND ${esql.col(EVENT_OUTCOME)} == "success") OR ?${esql.col(
    SLO_EVENT_FILTER_VARIABLE
  )} == ${SLO_EVENT_ALL}`;

  return query.print();
}

function buildSloEventControl(selectedOption: SloEventType = SLO_EVENT_ALL) {
  return {
    slo_event_control: {
      type: ESQL_CONTROL,
      width: 'auto',
      grow: false,
      single_select: true,
      selected_options: [selectedOption],
      available_options: ['All', 'Good', 'Bad'],
      variable_type: 'values',
      variable_name: SLO_EVENT_FILTER_VARIABLE,
      title: i18n.translate('xpack.slo.sloDetails.esqlControl.EventType', {
        defaultMessage: 'Event type',
      }),
      esql_query: '',
      control_type: 'STATIC_VALUES',
      order: 0,
    },
  };
}

function buildApmTracesLocatorParams({
  slo,
  timeRange,
  transactionIndex,
  selectedEventType = SLO_EVENT_ALL,
}: {
  slo: SLOWithSummaryResponse;
  timeRange: TimeRange;
  transactionIndex: string;
  selectedEventType?: SloEventType;
}) {
  const esqlQuery = apmTransactionDurationIndicatorSchema.is(slo.indicator)
    ? buildApmLatencyEsqlQuery(slo, transactionIndex)
    : buildApmAvailabilityEsqlQuery(slo, transactionIndex);

  return {
    timeRange,
    query: { esql: esqlQuery },
    esqlControls: buildSloEventControl(selectedEventType),
    tab: {
      id: 'new',
      label: i18n.translate('xpack.slo.sloDetails.discoverTabLabel', {
        defaultMessage: 'Good vs bad events - {sloName}',
        values: { sloName: slo.name },
      }),
    },
  };
}

export function getApmTracesEsqlLink({
  slo,
  timeRange,
  discover,
  transactionIndex,
}: {
  slo: SLOWithSummaryResponse;
  timeRange: TimeRange;
  discover?: DiscoverStart;
  transactionIndex: string;
}): string | undefined {
  if (!discover?.locator || !transactionIndex) return undefined;

  return discover.locator.getRedirectUrl(
    buildApmTracesLocatorParams({ slo, timeRange, transactionIndex }) as Parameters<
      typeof discover.locator.getRedirectUrl
    >[0]
  );
}

export function navigateToApmTracesEsqlLink({
  slo,
  timeRange,
  discover,
  transactionIndex,
  selectedEventType,
}: {
  slo: SLOWithSummaryResponse;
  timeRange: TimeRange;
  discover?: DiscoverStart;
  transactionIndex: string;
  selectedEventType?: SloEventType;
}): void {
  if (!discover?.locator || !transactionIndex) return;

  discover.locator.navigate(
    buildApmTracesLocatorParams({
      slo,
      timeRange,
      transactionIndex,
      selectedEventType,
    }) as Parameters<typeof discover.locator.navigate>[0]
  );
}
