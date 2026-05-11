/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, KibanaRequest } from '@kbn/core/server';
import type { DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';
import type { PluginStart as DataPluginStart } from '@kbn/data-plugin/server';
import type {
  RuleQueryInspectorHandler,
  RuleQueryInspectorResponse,
  RuleQueryInspectorTimeRange,
} from '@kbn/alerting-plugin/server';
import { getIntervalInSeconds } from '../../../../common/utils/get_interval_in_seconds';
import type {
  CustomMetricExpressionParams,
  SearchConfigurationType,
} from '../../../../common/custom_threshold_rule/types';
import { Aggregators } from '../../../../common/custom_threshold_rule/types';
import type { CustomThresholdRuleTypeParams } from './types';
import { getElasticsearchMetricQuery } from './lib/metric_query';
import { createTimerange } from './lib/create_timerange';
import { getEsQueryConfig } from '../../../utils/get_es_query_config';

type GetStartServices = () => Promise<
  [
    CoreStart,
    {
      dataViews: DataViewsServerPluginStart;
      data: DataPluginStart;
    }
  ]
>;

interface QueryInspectorOptions {
  compositeSize: number;
}

export const createQueryInspector = (
  getStartServices: GetStartServices,
  options: QueryInspectorOptions
): RuleQueryInspectorHandler => {
  return async (
    request: KibanaRequest,
    ruleParams: Record<string, unknown>,
    mode: 'build' | 'execute',
    timeRange: RuleQueryInspectorTimeRange | undefined
  ): Promise<RuleQueryInspectorResponse> => {
    const params = ruleParams as unknown as CustomThresholdRuleTypeParams;
    const { criteria, searchConfiguration, groupBy } = params;
    const [coreStart, pluginStart] = await getStartServices();

    const esClient = coreStart.elasticsearch.client.asScoped(request).asCurrentUser;
    const savedObjectsClient = coreStart.savedObjects.getScopedClient(request);
    const uiSettingsClient = coreStart.uiSettings.asScopedToClient(savedObjectsClient);
    const esQueryConfig = await getEsQueryConfig(uiSettingsClient);

    const searchSourceClient = await pluginStart.data.search.searchSource.asScoped(request);
    const initialSearchSource = await searchSourceClient.createLazy(searchConfiguration);
    const dataView = initialSearchSource.getField('index')!;
    const timeFieldName = dataView.timeFieldName ?? '@timestamp';
    const runtimeMappings = dataView.getRuntimeMappings();
    const dataViewIndexPattern = dataView.getIndexPattern();

    if (!dataViewIndexPattern) {
      throw new Error('No matched data view');
    }

    const alertOnGroupDisappear =
      params.alertOnGroupDisappear !== false && params.noDataBehavior !== 'recover';

    const queries: RuleQueryInspectorResponse['queries'] = [];

    for (let i = 0; i < criteria.length; i++) {
      const criterion = criteria[i] as CustomMetricExpressionParams;
      const interval = `${criterion.timeSize}${criterion.timeUnit}`;
      const intervalAsSeconds = getIntervalInSeconds(interval);
      const intervalAsMS = intervalAsSeconds * 1000;
      const isRateAgg = criterion.metrics.some((m) => m.aggType === Aggregators.RATE);

      const calculatedTimerange = timeRange
        ? { start: new Date(timeRange.gte).valueOf(), end: new Date(timeRange.lte).valueOf() }
        : createTimerange(
            intervalAsMS,
            { start: new Date().toISOString(), end: new Date().toISOString() },
            undefined,
            isRateAgg
          );

      const esQuery = getElasticsearchMetricQuery(
        criterion,
        calculatedTimerange,
        timeFieldName,
        options.compositeSize,
        alertOnGroupDisappear,
        searchConfiguration as unknown as SearchConfigurationType,
        dataView,
        esQueryConfig,
        runtimeMappings,
        undefined,
        groupBy
      );

      const searchRequest = {
        index: dataViewIndexPattern,
        allow_no_indices: true,
        ignore_unavailable: true,
        ...esQuery,
      };

      const metricsLabel =
        criterion.label ||
        criterion.metrics.map((m) => (m.field ? `${m.aggType}(${m.field})` : m.aggType)).join(', ');
      const label = criteria.length > 1 ? `Criterion ${i + 1}: ${metricsLabel}` : undefined;

      let response;
      if (mode === 'execute') {
        response = await esClient.search(searchRequest);
      }

      queries.push({
        index: dataViewIndexPattern,
        request: searchRequest as unknown as Record<string, unknown>,
        ...(response ? { response: response as unknown as Record<string, unknown> } : {}),
        ...(label ? { label } : {}),
      });
    }

    return { queries };
  };
};
