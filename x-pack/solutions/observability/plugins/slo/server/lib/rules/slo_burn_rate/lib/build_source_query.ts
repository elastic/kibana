/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { DataViewsContract } from '@kbn/data-views-plugin/common';
import {
  ALL_VALUE,
  apmTransactionDurationIndicatorSchema,
  apmTransactionErrorRateIndicatorSchema,
  kqlCustomIndicatorSchema,
  metricCustomIndicatorSchema,
  timesliceMetricIndicatorSchema,
  histogramIndicatorSchema,
  syntheticsAvailabilityIndicatorSchema,
} from '@kbn/slo-schema';
import type { SLODefinition } from '../../../../domain/models';
import { getElasticsearchQueryOrThrow, parseIndex } from '../../../../services/transform_generators';
import { SYNTHETICS_INDEX_PATTERN } from '../../../../../common/constants';
import { buildParamValues } from '../../../../services/transform_generators/synthetics_availability';

/**
 * Builds a source data query for checking document existence in the source index.
 * This query matches EXACTLY what the SLO transform uses, but with a custom time range.
 *
 * @param slo - The SLO definition
 * @param timeRange - The time range to check (from and to dates)
 * @param dataViews - Data views contract for getting data views
 * @param spaceId - The space ID (needed for synthetics)
 * @param isServerless - Whether running in serverless mode
 * @returns An Elasticsearch query that can be used for a count check
 */
export async function buildSourceDataQuery(
  slo: SLODefinition,
  timeRange: { from: Date; to: Date },
  dataViews: DataViewsContract,
  spaceId: string,
  isServerless: boolean = false
): Promise<{ index: string | string[]; query: estypes.QueryDslQueryContainer }> {
  const indicator = slo.indicator;

  // Helper to get data view
  const getDataView = async (dataViewId?: string) => {
    if (!dataViewId) return undefined;
    try {
      return await dataViews.get(dataViewId);
    } catch (e) {
      // If the data view is not found, we will continue without it
      return undefined;
    }
  };

  // Helper to get runtime mappings
  const getRuntimeMappings = (dataView?: any) => {
    return dataView?.getRuntimeMappings?.() ?? {};
  };

  // Build time range filter for the past 1 hour
  const timeRangeFilter: estypes.QueryDslQueryContainer = {
    range: {
      [indicator.params.timestampField || '@timestamp']: {
        gte: timeRange.from.toISOString(),
        lte: timeRange.to.toISOString(),
        format: 'strict_date_optional_time',
      },
    },
  };

  if (apmTransactionDurationIndicatorSchema.is(indicator)) {
    const queryFilter: estypes.QueryDslQueryContainer[] = [timeRangeFilter];

    if (indicator.params.service !== ALL_VALUE) {
      queryFilter.push({
        match: {
          'service.name': indicator.params.service,
        },
      });
    }

    if (indicator.params.environment !== ALL_VALUE) {
      queryFilter.push({
        match: {
          'service.environment': indicator.params.environment,
        },
      });
    }

    if (indicator.params.transactionName !== ALL_VALUE) {
      queryFilter.push({
        match: {
          'transaction.name': indicator.params.transactionName,
        },
      });
    }

    if (indicator.params.transactionType !== ALL_VALUE) {
      queryFilter.push({
        match: {
          'transaction.type': indicator.params.transactionType,
        },
      });
    }

    const dataView = await getDataView(indicator.params.dataViewId);

    if (!!indicator.params.filter) {
      queryFilter.push(getElasticsearchQueryOrThrow(indicator.params.filter, dataView));
    }

    return {
      index: parseIndex(indicator.params.index),
      query: {
        bool: {
          filter: [
            { terms: { 'processor.event': ['metric'] } },
            { term: { 'metricset.name': 'transaction' } },
            { exists: { field: 'transaction.duration.histogram' } },
            ...queryFilter,
          ],
        },
      },
    };
  }

  if (apmTransactionErrorRateIndicatorSchema.is(indicator)) {
    const queryFilter: estypes.QueryDslQueryContainer[] = [timeRangeFilter];

    if (indicator.params.service !== ALL_VALUE) {
      queryFilter.push({
        match: {
          'service.name': indicator.params.service,
        },
      });
    }

    if (indicator.params.environment !== ALL_VALUE) {
      queryFilter.push({
        match: {
          'service.environment': indicator.params.environment,
        },
      });
    }

    if (indicator.params.transactionName !== ALL_VALUE) {
      queryFilter.push({
        match: {
          'transaction.name': indicator.params.transactionName,
        },
      });
    }

    if (indicator.params.transactionType !== ALL_VALUE) {
      queryFilter.push({
        match: {
          'transaction.type': indicator.params.transactionType,
        },
      });
    }

    const dataView = await getDataView(indicator.params.dataViewId);

    if (indicator.params.filter) {
      queryFilter.push(getElasticsearchQueryOrThrow(indicator.params.filter, dataView));
    }

    return {
      index: parseIndex(indicator.params.index),
      query: {
        bool: {
          filter: [
            { term: { 'metricset.name': 'transaction' } },
            { terms: { 'event.outcome': ['success', 'failure'] } },
            ...queryFilter,
          ],
        },
      },
    };
  }

  if (kqlCustomIndicatorSchema.is(indicator)) {
    return {
      index: parseIndex(indicator.params.index),
      query: {
        bool: {
          filter: [
            timeRangeFilter,
            getElasticsearchQueryOrThrow(indicator.params.filter),
          ],
        },
      },
    };
  }

  if (metricCustomIndicatorSchema.is(indicator)) {
    const dataView = await getDataView(indicator.params.dataViewId);

    return {
      index: parseIndex(indicator.params.index),
      query: {
        bool: {
          filter: [
            timeRangeFilter,
            getElasticsearchQueryOrThrow(indicator.params.filter, dataView),
          ],
        },
      },
    };
  }

  if (timesliceMetricIndicatorSchema.is(indicator)) {
    const dataView = await getDataView(indicator.params.dataViewId);

    return {
      index: parseIndex(indicator.params.index),
      query: {
        bool: {
          filter: [
            timeRangeFilter,
            getElasticsearchQueryOrThrow(indicator.params.filter, dataView),
          ],
        },
      },
    };
  }

  if (histogramIndicatorSchema.is(indicator)) {
    const dataView = await getDataView(indicator.params.dataViewId);

    return {
      index: parseIndex(indicator.params.index),
      query: {
        bool: {
          filter: [
            timeRangeFilter,
            getElasticsearchQueryOrThrow(indicator.params.filter, dataView),
          ],
        },
      },
    };
  }

  if (syntheticsAvailabilityIndicatorSchema.is(indicator)) {
    const queryFilter: estypes.QueryDslQueryContainer[] = [
      { term: { 'summary.final_attempt': true } },
      { term: { 'meta.space_id': spaceId } },
      timeRangeFilter,
    ];

    const { monitorIds, tags, projects } = buildParamValues({
      monitorIds: indicator.params.monitorIds || [],
      tags: indicator.params.tags || [],
      projects: indicator.params.projects || [],
    });

    if (!monitorIds.includes(ALL_VALUE) && monitorIds.length) {
      queryFilter.push({
        terms: {
          'monitor.id': monitorIds,
        },
      });
    }

    if (!tags.includes(ALL_VALUE) && tags.length) {
      queryFilter.push({
        terms: {
          tags,
        },
      });
    }

    if (!projects.includes(ALL_VALUE) && projects.length) {
      queryFilter.push({
        terms: {
          'monitor.project.id': projects,
        },
      });
    }

    if (!!indicator.params.filter) {
      queryFilter.push(getElasticsearchQueryOrThrow(indicator.params.filter));
    }

    return {
      index: SYNTHETICS_INDEX_PATTERN,
      query: {
        bool: {
          filter: queryFilter,
        },
      },
    };
  }

  throw new Error(`Unsupported indicator type: ${indicator.type}`);
}

