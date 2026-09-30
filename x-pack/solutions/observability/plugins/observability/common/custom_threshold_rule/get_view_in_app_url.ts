/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FilterStateStore,
  buildCustomFilter,
  fromKueryExpression,
  toElasticsearchQuery,
  type Filter,
  type TimeRange,
} from '@kbn/es-query';
import { getPaddedAlertTimeRange } from '@kbn/observability-get-padded-alert-time-range-util';
import type { LocatorPublic } from '@kbn/share-plugin/common';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import { isEmpty } from 'lodash';
import { getGroupFilters } from './helpers/get_group';
import type { SearchConfigurationWithExtractedReferenceType } from './types';
import type { BaseMetricExpressionParams, CustomThresholdExpressionMetric } from './types';
import type { Group } from '../typings';

const getMetricFilterChips = (
  metrics: CustomThresholdExpressionMetric[],
  dataViewId?: string
): Filter[] => {
  if (!dataViewId) {
    return [];
  }

  const metricFilters = metrics.flatMap((metric) =>
    typeof metric.filter === 'string' && metric.filter.length > 0 ? [metric.filter] : []
  );
  const disabled = metricFilters.length !== 1;

  return metricFilters.map((filter) =>
    buildCustomFilter(
      dataViewId,
      toElasticsearchQuery(fromKueryExpression(filter)),
      disabled,
      false,
      null,
      FilterStateStore.APP_STATE
    )
  );
};

export interface GetViewInAppUrlArgs {
  searchConfiguration?: SearchConfigurationWithExtractedReferenceType;
  dataViewId?: string;
  endedAt?: string;
  groups?: Group[];
  logsLocator?: LocatorPublic<DiscoverAppLocatorParams>;
  metrics?: CustomThresholdExpressionMetric[];
  startedAt?: string;
  spaceId?: string;
  timeSize?: BaseMetricExpressionParams['timeSize'];
  timeUnit?: BaseMetricExpressionParams['timeUnit'];
}

export const getViewInAppLocatorParams = ({
  dataViewId,
  endedAt,
  groups,
  metrics = [],
  searchConfiguration,
  startedAt = new Date().toISOString(),
  timeSize,
  timeUnit,
}: GetViewInAppUrlArgs) => {
  const searchConfigurationQuery = searchConfiguration?.query.query;
  const searchConfigurationFilters = searchConfiguration?.filter || [];
  const groupFilters = getGroupFilters(groups);
  const lookBackWindow =
    timeSize !== undefined && timeUnit ? { size: timeSize, unit: timeUnit } : undefined;
  const timeRange: TimeRange | undefined = getPaddedAlertTimeRange(
    startedAt,
    endedAt,
    lookBackWindow
  );
  timeRange.to = endedAt ? timeRange.to : 'now';

  const query = {
    query: searchConfigurationQuery ?? '',
    language: 'kuery',
  };
  let dataViewSpec;

  if (
    typeof searchConfiguration?.index === 'object' &&
    searchConfiguration.index !== null &&
    !isEmpty(searchConfiguration.index)
  ) {
    dataViewSpec = searchConfiguration.index as DataViewSpec;
  }

  return {
    dataViewId,
    dataViewSpec,
    timeRange,
    query,
    filters: [
      ...searchConfigurationFilters,
      ...groupFilters,
      ...getMetricFilterChips(metrics, dataViewId),
    ],
  };
};

export const getViewInAppUrl = ({ logsLocator, spaceId, ...rest }: GetViewInAppUrlArgs) => {
  if (!logsLocator) return '';

  const params = getViewInAppLocatorParams(rest);

  return logsLocator.getRedirectUrl(params, { spaceId });
};
