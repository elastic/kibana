/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IUiSettingsClient } from '@kbn/core/public';
import { getEsQueryConfig } from '@kbn/data-plugin/public';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import type { DiscoverStart } from '@kbn/discover-plugin/public';
import type { Filter, TimeRange } from '@kbn/es-query';
import { FilterStateStore } from '@kbn/es-query';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import {
  ALL_VALUE,
  apmTransactionDurationIndicatorSchema,
  apmTransactionErrorRateIndicatorSchema,
  kqlCustomIndicatorSchema,
  kqlWithFiltersSchema,
} from '@kbn/slo-schema';
import { esql } from '@elastic/esql';
import { isEmpty } from 'lodash';
import { v4 } from 'uuid';
import { getApmAvailabilityQueries as getApmAvailabilityQueries } from './get_apm_availability_queries';
import { getApmLatencyQueries } from './get_apm_latency_queries';
import { getCustomKqlQueries } from './get_custom_kql_queries';
import { BAD_EVENTS, GOOD_EVENTS, TOTAL_EVENTS } from './i18n';

export function createDiscoverLocator({
  slo,
  showBad = false,
  showGood = false,
  timeRange,
  uiSettings,
}: {
  slo: SLOWithSummaryResponse;
  showBad: boolean;
  showGood: boolean;
  timeRange: TimeRange;
  uiSettings?: IUiSettingsClient;
}) {
  const esQueryConfig = uiSettings && getEsQueryConfig(uiSettings);
  const indexId = v4();
  const filters: Filter[] = [];

  const indicatorType = slo.indicator.type;
  switch (indicatorType) {
    case 'sli.apm.transactionDuration':
      if (apmTransactionDurationIndicatorSchema.is(slo.indicator)) {
        const { totalQuery } = getApmLatencyQueries(slo.indicator, esQueryConfig);
        filters.push({
          $state: { store: FilterStateStore.APP_STATE },
          meta: {
            type: 'custom',
            alias: TOTAL_EVENTS,
            disabled: false,
            index: indexId,
          },
          query: totalQuery,
        });
      }
      break;
    case 'sli.apm.transactionErrorRate':
      if (apmTransactionErrorRateIndicatorSchema.is(slo.indicator)) {
        const { goodQuery, badQuery, totalQuery } = getApmAvailabilityQueries(
          slo.indicator,
          esQueryConfig
        );

        filters.push({
          $state: { store: FilterStateStore.APP_STATE },
          meta: {
            type: 'custom',
            alias: TOTAL_EVENTS,
            disabled: showGood || showBad,
            index: indexId,
          },
          query: totalQuery,
        });

        filters.push({
          $state: { store: FilterStateStore.APP_STATE },
          meta: {
            type: 'custom',
            alias: GOOD_EVENTS,
            disabled: !showGood,
            index: indexId,
          },
          query: goodQuery,
        });

        filters.push({
          $state: { store: FilterStateStore.APP_STATE },
          meta: {
            type: 'custom',
            alias: BAD_EVENTS,
            disabled: !showBad,
            index: indexId,
          },
          query: badQuery,
        });
      }
      break;
    case 'sli.kql.custom':
      if (kqlCustomIndicatorSchema.is(slo.indicator)) {
        const { goodQuery, badQuery, totalQuery } = getCustomKqlQueries(
          slo.indicator,
          esQueryConfig
        );

        filters.push({
          $state: { store: FilterStateStore.APP_STATE },
          meta: {
            type: 'custom',
            alias: GOOD_EVENTS,
            disabled: !showGood,
            index: indexId,
          },
          query: goodQuery,
        });

        filters.push({
          $state: { store: FilterStateStore.APP_STATE },
          meta: {
            type: 'custom',
            alias: BAD_EVENTS,
            disabled: !showBad,
            index: indexId,
          },
          query: badQuery,
        });

        filters.push({
          $state: { store: FilterStateStore.APP_STATE },
          meta: {
            type: 'custom',
            alias: TOTAL_EVENTS,
            disabled: showGood || showBad,
            index: indexId,
          },
          query: totalQuery,
        });
      }
      break;
  }

  if (!isEmpty(slo.groupings)) {
    const groupingKeys = Object.keys(slo.groupings);
    const groupingFilters = groupingKeys.map((key) => ({
      meta: {
        disabled: false,
        negate: false,
        alias: null,
        key,
        params: {
          query: slo.groupings[key],
        },
        type: 'phrase',
        index: indexId,
      },
      $state: {
        store: FilterStateStore.APP_STATE,
      },
      query: {
        match_phrase: {
          [key]: slo.groupings[key],
        },
      },
    }));

    filters.push(...groupingFilters);
  }

  const timeFieldName =
    'timestampField' in slo.indicator.params ? slo.indicator.params.timestampField : '@timestamp';

  // Add the filters from the main query filter as discover filters
  if (kqlWithFiltersSchema.is(slo.indicator.params.filter)) {
    slo.indicator.params.filter.filters.forEach((f: Filter) => filters.push(f));
  }

  // Add the kql filter from the main query filter as discover kql query
  const filterKuery = kqlWithFiltersSchema.is(slo.indicator.params.filter)
    ? slo.indicator.params.filter.kqlQuery
    : slo.indicator.params.filter;

  return {
    timeRange,
    query: {
      query: filterKuery ?? '',
      language: 'kuery',
    },
    filters,
    dataViewSpec: {
      id: indexId,
      title: slo.remote
        ? `${slo.remote.remoteName}:${slo.indicator.params.index}`
        : slo.indicator.params.index,
      timeFieldName,
    },
  };
}

export function getDiscoverLink({
  slo,
  timeRange,
  discover,
  uiSettings,
}: {
  slo: SLOWithSummaryResponse;
  timeRange: TimeRange;
  discover?: DiscoverStart;
  uiSettings?: IUiSettingsClient;
}) {
  const locatorConfig = createDiscoverLocator({
    slo,
    showBad: false,
    showGood: false,
    timeRange,
    uiSettings,
  });
  return discover?.locator?.getRedirectUrl(locatorConfig);
}

export function openInDiscover({
  slo,
  showBad = false,
  showGood = false,
  timeRange,
  discover,
  uiSettings,
}: {
  slo: SLOWithSummaryResponse;
  showBad: boolean;
  showGood: boolean;
  timeRange: TimeRange;
  discover?: DiscoverStart;
  uiSettings?: IUiSettingsClient;
}) {
  const locatorConfig = createDiscoverLocator({ slo, showBad, showGood, timeRange, uiSettings });
  discover?.locator?.navigate(locatorConfig);
}

export interface ApmTracesDiscoverParams {
  index: string;
  serviceName: string;
  environment: string;
  transactionType: string;
  transactionName: string;
}

export function getApmTracesDiscoverUrl({
  params,
  share,
  timeRange,
}: {
  params: ApmTracesDiscoverParams;
  share: SharePluginStart;
  timeRange: { from: string; to: string };
}): string | undefined {
  const { index, serviceName, environment, transactionType, transactionName } = params;

  let query = esql.from(index);

  if (serviceName && serviceName !== ALL_VALUE) {
    query = query.where`${esql.col('service.name')} == ${serviceName}`;
  }

  if (environment && environment !== ALL_VALUE) {
    query = query.where`${esql.col('service.environment')} == ${environment}`;
  }

  if (transactionType && transactionType !== ALL_VALUE) {
    query = query.where`${esql.col('transaction.type')} == ${transactionType}`;
  }

  if (transactionName && transactionName !== ALL_VALUE) {
    query = query.where`${esql.col('transaction.name')} == ${transactionName}`;
  }

  query = query.sort(['@timestamp', 'DESC']);

  const discoverLocator = share.url.locators.get(DISCOVER_APP_LOCATOR);

  return discoverLocator?.getRedirectUrl({
    timeRange,
    query: { esql: query.print() },
  });
}
