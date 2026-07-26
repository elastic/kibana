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
import { esql, type ComposerQueryTagHole } from '@elastic/esql';
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
    const filterValue = typeof value === 'number' ? value : String(value);
    return q.where`${esql.col(field)} == ${filterValue}`;
  }, query);
}

type EsqlQueryBuilder = ReturnType<typeof esql.from>;

function buildApmEsqlQuery(
  slo: SLOWithSummaryResponse,
  transactionIndex: string,
  params: Parameters<typeof buildBaseWhereClauses>[1],
  {
    preEvalWhere,
    evalGoodCondition,
    conditionGood,
    conditionBad,
  }: {
    preEvalWhere?: (query: EsqlQueryBuilder) => EsqlQueryBuilder;
    evalGoodCondition: ComposerQueryTagHole;
    conditionGood: ComposerQueryTagHole;
    conditionBad: ComposerQueryTagHole;
  }
): string {
  let query = esql.from(transactionIndex);
  query = buildBaseWhereClauses(query, params);
  query = buildGroupingsWhereClauses(query, slo.groupings);
  if (preEvalWhere) query = preEvalWhere(query);
  query = query.pipe`EVAL ${esql.col(
    SLO_EVENT_FILTER_VARIABLE
  )} = CASE(${evalGoodCondition}, ${SLO_EVENT_GOOD}, ${SLO_EVENT_BAD})`;
  query = query.pipe`WHERE (?${esql.col(
    SLO_EVENT_FILTER_VARIABLE
  )} == ${SLO_EVENT_BAD} AND ${conditionBad}) OR (?${esql.col(
    SLO_EVENT_FILTER_VARIABLE
  )} == ${SLO_EVENT_GOOD} AND ${conditionGood}) OR ?${esql.col(
    SLO_EVENT_FILTER_VARIABLE
  )} == ${SLO_EVENT_ALL}`;
  return query.print();
}

function buildApmLatencyEsqlQuery(slo: SLOWithSummaryResponse, transactionIndex: string): string {
  if (!apmTransactionDurationIndicatorSchema.is(slo.indicator)) return '';

  const { params } = slo.indicator;
  // threshold is in ms, transaction.duration.us is in microseconds
  const thresholdUs = Math.trunc(params.threshold * 1000);
  const col = esql.col(TRANSACTION_DURATION);

  return buildApmEsqlQuery(slo, transactionIndex, params, {
    evalGoodCondition: esql.exp`${col} <= ${thresholdUs}`,
    conditionGood: esql.exp`${col} <= ${thresholdUs}`,
    conditionBad: esql.exp`${col} > ${thresholdUs}`,
  });
}

function buildApmAvailabilityEsqlQuery(
  slo: SLOWithSummaryResponse,
  transactionIndex: string
): string {
  if (!apmTransactionErrorRateIndicatorSchema.is(slo.indicator)) return '';

  const { params } = slo.indicator;
  const col = esql.col(EVENT_OUTCOME);

  return buildApmEsqlQuery(slo, transactionIndex, params, {
    preEvalWhere: (query) => query.where`${col} IN ("success", "failure")`,
    evalGoodCondition: esql.exp`${col} == "success"`,
    conditionGood: esql.exp`${col} == "success"`,
    conditionBad: esql.exp`${col} == "failure"`,
  });
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
