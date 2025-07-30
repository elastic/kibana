/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { IUiSettingsClient } from '@kbn/core/public';
import { getEsQueryConfig } from '@kbn/data-plugin/public';
import { DiscoverStart } from '@kbn/discover-plugin/public';
import { Filter, FilterStateStore, TimeRange } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { buildEsQuery } from '@kbn/observability-plugin/public';
import { kqlWithFiltersSchema, SLOWithSummaryResponse } from '@kbn/slo-schema';
import { isEmpty } from 'lodash';
import { v4 } from 'uuid';

function createDiscoverLocator({
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
  const indexId = v4();
  const filters: Filter[] = [];

  if (kqlWithFiltersSchema.is(slo.indicator.params.filter)) {
    slo.indicator.params.filter.filters.forEach((i) => filters.push(i));
  }

  const filterKuery = kqlWithFiltersSchema.is(slo.indicator.params.filter)
    ? slo.indicator.params.filter.kqlQuery
    : slo.indicator.params.filter;

  if (slo.indicator.type === 'sli.kql.custom') {
    const goodKuery = kqlWithFiltersSchema.is(slo.indicator.params.good)
      ? slo.indicator.params.good.kqlQuery
      : slo.indicator.params.good;
    const goodFilters = kqlWithFiltersSchema.is(slo.indicator.params.good)
      ? slo.indicator.params.good.filters
      : [];
    const totalKuery = kqlWithFiltersSchema.is(slo.indicator.params.total)
      ? slo.indicator.params.total.kqlQuery
      : slo.indicator.params.total;
    const totalFilters = kqlWithFiltersSchema.is(slo.indicator.params.total)
      ? slo.indicator.params.total.filters
      : [];

    const customGoodFilter = buildEsQuery({
      kuery: goodKuery,
      filters: goodFilters,
      ...(uiSettings && { config: getEsQueryConfig(uiSettings) }),
    });
    const customTotalFilter = buildEsQuery({
      kuery: totalKuery,
      filters: totalFilters,
      ...(uiSettings && { config: getEsQueryConfig(uiSettings) }),
    });
    const customBadFilter = { bool: { filter: customTotalFilter, must_not: customGoodFilter } };

    filters.push({
      $state: { store: FilterStateStore.APP_STATE },
      meta: {
        type: 'custom',
        alias: i18n.translate('xpack.slo.sloDetails.goodFilterLabel', {
          defaultMessage: 'Good events',
        }),
        disabled: !showGood,
        value: JSON.stringify(customGoodFilter),
        index: indexId,
      },
      query: customGoodFilter as Record<string, any>,
    });

    filters.push({
      $state: { store: FilterStateStore.APP_STATE },
      meta: {
        type: 'custom',
        alias: i18n.translate('xpack.slo.sloDetails.badFilterLabel', {
          defaultMessage: 'Bad events',
        }),
        disabled: !showBad,
        value: JSON.stringify(customBadFilter),
        index: indexId,
      },
      query: customBadFilter as Record<string, any>,
    });

    filters.push({
      $state: { store: FilterStateStore.APP_STATE },
      meta: {
        type: 'custom',
        alias: i18n.translate('xpack.slo.sloDetails.totalFilterLabel', {
          defaultMessage: 'Total events',
        }),
        disabled: showGood || showBad,
        value: JSON.stringify(customTotalFilter),
        index: indexId,
      },
      query: customTotalFilter as Record<string, any>,
    });
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
