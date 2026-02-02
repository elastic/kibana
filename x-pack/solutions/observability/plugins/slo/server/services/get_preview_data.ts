/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { AggregationsAggregationContainer } from '@elastic/elasticsearch/lib/api/types';
import { calculateAuto } from '@kbn/calculate-auto';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { DataView, DataViewsService } from '@kbn/data-views-plugin/common';
import type {
  APMTransactionErrorRateIndicator,
  GetPreviewDataParams,
  GetPreviewDataResponse,
  HistogramIndicator,
  KQLCustomIndicator,
  MetricCustomIndicator,
  SyntheticsAvailabilityIndicator,
  TimesliceMetricIndicator,
} from '@kbn/slo-schema';
import { ALL_VALUE } from '@kbn/slo-schema';
import { assertNever } from '@kbn/std';
import moment from 'moment';
import { SYNTHETICS_INDEX_PATTERN } from '../../common/constants';
import type { APMTransactionDurationIndicator, Groupings } from '../domain/models';
import { computeSLIForPreview } from '../domain/services';
import { typedSearch } from '../utils/queries';
import {
  GetCustomMetricIndicatorAggregation,
  GetHistogramIndicatorAggregation,
  GetTimesliceMetricIndicatorAggregation,
} from './aggregations';
import { getElasticsearchQueryOrThrow } from './transform_generators';
import { buildParamValues } from './transform_generators/synthetics_availability';

interface Options {
  range: {
    start: number;
    end: number;
  };
  interval: string;
  remoteName?: string;
  groupings?: Groupings;
  groupBy?: string[];
}

const RANGE_DURATION_24HOURS_LIMIT = 24 * 60 * 60 * 1000 + 60 * 1000; // 24 hours and 1min in milliseconds

export class GetPreviewData {
  constructor(
    private esClient: ElasticsearchClient,
    private spaceId: string,
    private dataViewService: DataViewsService
  ) {}

  private async getDataView(dataViewId?: string): Promise<DataView | undefined> {
    if (!dataViewId) {
      return undefined;
    }
    try {
      return await this.dataViewService.get(dataViewId);
    } catch (e) {
      // If the data view is not found, we will continue without it
      return undefined;
    }
  }

  private async buildRuntimeMappings({ dataViewId }: { dataViewId?: string }) {
    const dataView = await this.getDataView(dataViewId);
    return dataView?.getRuntimeMappings?.() ?? {};
  }

  private addExtraTermsOrMultiTermsAgg(
    perInterval: AggregationsAggregationContainer,
    groupBy?: string[]
  ): Record<string, AggregationsAggregationContainer> {
    if (!groupBy || groupBy.length === 0) return { perInterval };
    if (groupBy.length === 1) {
      return {
        perGroup: {
          terms: {
            size: 5,
            field: groupBy[0],
          },
          aggs: { perInterval },
        },
        perInterval,
      };
    }

    return {
      perGroup: {
        multi_terms: {
          size: 5,
          terms: groupBy.map((group) => ({ field: group })),
        },
        aggs: { perInterval },
      },
      perInterval,
    };
  }

  private async getAPMTransactionDurationPreviewData(
    indicator: APMTransactionDurationIndicator,
    options: Options
  ): Promise<GetPreviewDataResponse> {
    const dataView = await this.getDataView(indicator.params.dataViewId);
    const filter: estypes.QueryDslQueryContainer[] = [];
    const groupingFilters = this.getGroupingFilters(options);
    if (groupingFilters) {
      filter.push(...groupingFilters);
    }
    if (indicator.params.service !== ALL_VALUE)
      filter.push({
        match: { 'service.name': indicator.params.service },
      });
    if (indicator.params.environment !== ALL_VALUE)
      filter.push({
        match: { 'service.environment': indicator.params.environment },
      });
    if (indicator.params.transactionName !== ALL_VALUE)
      filter.push({
        match: { 'transaction.name': indicator.params.transactionName },
      });
    if (indicator.params.transactionType !== ALL_VALUE)
      filter.push({
        match: { 'transaction.type': indicator.params.transactionType },
      });
    if (!!indicator.params.filter)
      filter.push(getElasticsearchQueryOrThrow(indicator.params.filter, dataView));

    const truncatedThreshold = Math.trunc(indicator.params.threshold * 1000);

    const index = options.remoteName
      ? `${options.remoteName}:${indicator.params.index}`
      : indicator.params.index;

    const response = await typedSearch(this.esClient, {
      index,
      runtime_mappings: await this.buildRuntimeMappings({
        dataViewId: indicator.params.dataViewId,
      }),
      size: 0,
      query: {
        bool: {
          filter: [
            { range: { '@timestamp': { gte: options.range.start, lte: options.range.end } } },
            { terms: { 'processor.event': ['metric'] } },
            { term: { 'metricset.name': 'transaction' } },
            { exists: { field: 'transaction.duration.histogram' } },
            ...filter,
          ],
        },
      },
      aggs: this.addExtraTermsOrMultiTermsAgg(
        {
          date_histogram: {
            field: '@timestamp',
            fixed_interval: options.interval,
            extended_bounds: {
              min: options.range.start,
              max: options.range.end,
            },
          },
          aggs: {
            _good: {
              range: {
                field: 'transaction.duration.histogram',
                keyed: true,
                ranges: [{ to: truncatedThreshold, key: 'target' }],
              },
            },
            good: {
              bucket_script: {
                buckets_path: {
                  _good: `_good['target']>_count`,
                },
                script: 'params._good',
              },
            },
            total: {
              value_count: {
                field: 'transaction.duration.histogram',
              },
            },
          },
        },
        options.groupBy
      ),
    });

    const results =
      // @ts-ignore
      response.aggregations?.perInterval.buckets.map((bucket) => {
        const good = bucket.good?.value ?? 0;
        const total = bucket.total?.value ?? 0;
        return {
          date: bucket.key_as_string,
          sliValue: computeSLIForPreview(good, total),
          events: {
            good,
            total,
            bad: total - good,
          },
        };
      }) ?? [];

    // @ts-ignore
    const groups = response.aggregations?.perGroup?.buckets?.reduce((acc, group) => {
      // @ts-ignore
      acc[group.key] = group.perInterval.buckets.map((bucket) => {
        const good = bucket.good?.value ?? 0;
        const total = bucket.total?.value ?? 0;
        return {
          date: bucket.key_as_string,
          sliValue: computeSLIForPreview(good, total),
          events: {
            good,
            bad: total - good,
            total,
          },
        };
      });
      return acc;
    }, {});

    return { results, groups };
  }

  private async getAPMTransactionErrorPreviewData(
    indicator: APMTransactionErrorRateIndicator,
    options: Options
  ): Promise<GetPreviewDataResponse> {
    const dataView = await this.getDataView(indicator.params.dataViewId);
    const filter: estypes.QueryDslQueryContainer[] = [];
    const groupingFilters = this.getGroupingFilters(options);
    if (groupingFilters) {
      filter.push(...groupingFilters);
    }
    if (indicator.params.service !== ALL_VALUE)
      filter.push({
        match: { 'service.name': indicator.params.service },
      });
    if (indicator.params.environment !== ALL_VALUE)
      filter.push({
        match: { 'service.environment': indicator.params.environment },
      });
    if (indicator.params.transactionName !== ALL_VALUE)
      filter.push({
        match: { 'transaction.name': indicator.params.transactionName },
      });
    if (indicator.params.transactionType !== ALL_VALUE)
      filter.push({
        match: { 'transaction.type': indicator.params.transactionType },
      });
    if (!!indicator.params.filter)
      filter.push(getElasticsearchQueryOrThrow(indicator.params.filter, dataView));

    const index = options.remoteName
      ? `${options.remoteName}:${indicator.params.index}`
      : indicator.params.index;

    const response = await typedSearch(this.esClient, {
      index,
      runtime_mappings: await this.buildRuntimeMappings({
        dataViewId: indicator.params.dataViewId,
      }),
      size: 0,
      query: {
        bool: {
          filter: [
            { range: { '@timestamp': { gte: options.range.start, lte: options.range.end } } },
            { term: { 'metricset.name': 'transaction' } },
            { terms: { 'event.outcome': ['success', 'failure'] } },
            ...filter,
          ],
        },
      },
      aggs: this.addExtraTermsOrMultiTermsAgg(
        {
          date_histogram: {
            field: '@timestamp',
            fixed_interval: options.interval,
            extended_bounds: {
              min: options.range.start,
              max: options.range.end,
            },
          },
          aggs: {
            good: {
              filter: {
                bool: {
                  should: {
                    match: {
                      'event.outcome': 'success',
                    },
                  },
                },
              },
            },
            total: {
              filter: {
                match_all: {},
              },
            },
          },
        },
        options.groupBy
      ),
    });

    const results =
      // @ts-ignore
      response.aggregations?.perInterval.buckets.map((bucket) => {
        const good = bucket.good?.doc_count ?? 0;
        const total = bucket.total?.doc_count ?? 0;
        return {
          date: bucket.key_as_string,
          sliValue: computeSLIForPreview(good, total),
          events: {
            good,
            bad: total - good,
            total,
          },
        };
      }) ?? [];

    // @ts-ignore
    const groups = response.aggregations?.perGroup?.buckets?.reduce((acc, group) => {
      // @ts-ignore
      acc[group.key] = group.perInterval.buckets.map((bucket) => {
        const good = bucket.good?.doc_count ?? 0;
        const total = bucket.total?.doc_count ?? 0;
        return {
          date: bucket.key_as_string,
          sliValue: computeSLIForPreview(good, total),
          events: {
            good,
            bad: total - good,
            total,
          },
        };
      });
      return acc;
    }, {});
    return { results, groups };
  }

  private async getHistogramPreviewData(
    indicator: HistogramIndicator,
    options: Options
  ): Promise<GetPreviewDataResponse> {
    const dataView = await this.getDataView(indicator.params.dataViewId);
    const getHistogramIndicatorAggregations = new GetHistogramIndicatorAggregation(
      indicator,
      dataView
    );
    const filterQuery = getElasticsearchQueryOrThrow(indicator.params.filter, dataView);
    const timestampField = indicator.params.timestampField;

    const filter: estypes.QueryDslQueryContainer[] = [
      { range: { [timestampField]: { gte: options.range.start, lte: options.range.end } } },
      filterQuery,
    ];

    const groupingFilters = this.getGroupingFilters(options);
    if (groupingFilters) {
      filter.push(...groupingFilters);
    }

    const index = options.remoteName
      ? `${options.remoteName}:${indicator.params.index}`
      : indicator.params.index;

    const response = await this.esClient.search({
      index,
      runtime_mappings: await this.buildRuntimeMappings({
        dataViewId: indicator.params.dataViewId,
      }),
      size: 0,
      query: {
        bool: {
          filter,
        },
      },
      aggs: this.addExtraTermsOrMultiTermsAgg(
        {
          date_histogram: {
            field: timestampField,
            fixed_interval: options.interval,
            extended_bounds: {
              min: options.range.start,
              max: options.range.end,
            },
          },
          aggs: {
            ...getHistogramIndicatorAggregations.execute({
              type: 'good',
              aggregationKey: 'good',
            }),
            ...getHistogramIndicatorAggregations.execute({
              type: 'total',
              aggregationKey: 'total',
            }),
          },
        },
        options.groupBy
      ),
    });

    interface Bucket {
      key_as_string: string;
      good: { value: number };
      total: { value: number };
    }

    const results =
      // @ts-ignore buckets not typed properly
      response.aggregations?.perInterval.buckets.map((bucket: Bucket) => {
        const good = bucket.good?.value ?? 0;
        const total = bucket.total?.value ?? 0;
        return {
          date: bucket.key_as_string,
          sliValue: computeSLIForPreview(good, total),
          events: {
            good,
            bad: total - good,
            total,
          },
        };
      }) ?? [];

    // @ts-ignore
    const groups = response.aggregations?.perGroup?.buckets?.reduce((acc, group) => {
      // @ts-ignore
      acc[group.key] = group.perInterval.buckets.map((bucket) => {
        const good = bucket.good?.value ?? 0;
        const total = bucket.total?.value ?? 0;
        return {
          date: bucket.key_as_string,
          sliValue: computeSLIForPreview(good, total),
          events: {
            good,
            bad: total - good,
            total,
          },
        };
      });
      return acc;
    }, {});

    return { results, groups };
  }

  private async getCustomMetricPreviewData(
    indicator: MetricCustomIndicator,
    options: Options
  ): Promise<GetPreviewDataResponse> {
    const dataView = await this.getDataView(indicator.params.dataViewId);
    const timestampField = indicator.params.timestampField;
    const filterQuery = getElasticsearchQueryOrThrow(indicator.params.filter, dataView);

    const getCustomMetricIndicatorAggregation = new GetCustomMetricIndicatorAggregation(
      indicator,
      dataView
    );

    const filter: estypes.QueryDslQueryContainer[] = [
      { range: { [timestampField]: { gte: options.range.start, lte: options.range.end } } },
      filterQuery,
    ];

    const groupingFilters = this.getGroupingFilters(options);
    if (groupingFilters) {
      filter.push(...groupingFilters);
    }

    const index = options.remoteName
      ? `${options.remoteName}:${indicator.params.index}`
      : indicator.params.index;

    const response = await this.esClient.search({
      index,
      runtime_mappings: await this.buildRuntimeMappings({
        dataViewId: indicator.params.dataViewId,
      }),
      size: 0,
      query: {
        bool: {
          filter,
        },
      },
      aggs: this.addExtraTermsOrMultiTermsAgg(
        {
          date_histogram: {
            field: timestampField,
            fixed_interval: options.interval,
            extended_bounds: {
              min: options.range.start,
              max: options.range.end,
            },
          },
          aggs: {
            ...getCustomMetricIndicatorAggregation.execute({
              type: 'good',
              aggregationKey: 'good',
            }),
            ...getCustomMetricIndicatorAggregation.execute({
              type: 'total',
              aggregationKey: 'total',
            }),
          },
        },
        options.groupBy
      ),
    });

    interface Bucket {
      key_as_string: string;
      good: { value: number };
      total: { value: number };
    }

    const results =
      // @ts-ignore buckets not typed properly
      response.aggregations?.perInterval.buckets.map((bucket: Bucket) => {
        const good = bucket.good?.value ?? 0;
        const total = bucket.total?.value ?? 0;
        return {
          date: bucket.key_as_string,
          sliValue: computeSLIForPreview(good, total),
          events: {
            good,
            bad: total - good,
            total,
          },
        };
      }) ?? [];

    // @ts-ignore
    const groups = response.aggregations?.perGroup?.buckets?.reduce((acc, group) => {
      // @ts-ignore
      acc[group.key] = group.perInterval.buckets.map((bucket) => {
        const good = bucket.good?.value ?? 0;
        const total = bucket.total?.value ?? 0;
        return {
          date: bucket.key_as_string,
          sliValue: computeSLIForPreview(good, total),
          events: {
            good,
            bad: total - good,
            total,
          },
        };
      });
      return acc;
    }, {});

    return { results, groups };
  }

  private async getTimesliceMetricPreviewData(
    indicator: TimesliceMetricIndicator,
    options: Options
  ): Promise<GetPreviewDataResponse> {
    const dataView = await this.getDataView(indicator.params.dataViewId);
    const timestampField = indicator.params.timestampField;
    const filterQuery = getElasticsearchQueryOrThrow(indicator.params.filter, dataView);
    const getCustomMetricIndicatorAggregation = new GetTimesliceMetricIndicatorAggregation(
      indicator,
      dataView
    );

    const filter: estypes.QueryDslQueryContainer[] = [
      { range: { [timestampField]: { gte: options.range.start, lte: options.range.end } } },
      filterQuery,
    ];

    const groupingFilters = this.getGroupingFilters(options);
    if (groupingFilters) {
      filter.push(...groupingFilters);
    }

    const index = options.remoteName
      ? `${options.remoteName}:${indicator.params.index}`
      : indicator.params.index;

    const response = await this.esClient.search({
      index,
      runtime_mappings: await this.buildRuntimeMappings({
        dataViewId: indicator.params.dataViewId,
      }),
      size: 0,
      query: {
        bool: {
          filter,
        },
      },
      aggs: this.addExtraTermsOrMultiTermsAgg(
        {
          date_histogram: {
            field: timestampField,
            fixed_interval: options.interval,
            extended_bounds: {
              min: options.range.start,
              max: options.range.end,
            },
          },
          aggs: getCustomMetricIndicatorAggregation.execute('metric'),
        },
        options.groupBy
      ),
    });

    interface Bucket {
      key_as_string: string;
      metric: { value: number };
    }

    const results =
      // @ts-ignore buckets not typed properly
      response.aggregations?.perInterval.buckets.map((bucket: Bucket) => {
        return {
          date: bucket.key_as_string,
          sliValue: bucket.metric?.value ?? null,
        };
      }) ?? [];

    // @ts-ignore
    const groups = response.aggregations?.perGroup?.buckets?.reduce((acc, group) => {
      // @ts-ignore
      acc[group.key] = group.perInterval.buckets.map((bucket) => {
        return {
          date: bucket.key_as_string,
          sliValue: bucket.metric?.value ?? null,
        };
      });
      return acc;
    }, {});

    return { results, groups };
  }

  private async getCustomKQLPreviewData(
    indicator: KQLCustomIndicator,
    options: Options
  ): Promise<GetPreviewDataResponse> {
    const dataView = await this.getDataView(indicator.params.dataViewId);
    const filterQuery = getElasticsearchQueryOrThrow(indicator.params.filter, dataView);
    const goodQuery = getElasticsearchQueryOrThrow(indicator.params.good, dataView);
    const totalQuery = getElasticsearchQueryOrThrow(indicator.params.total, dataView);

    const timestampField = indicator.params.timestampField;
    const filter: estypes.QueryDslQueryContainer[] = [
      { range: { [timestampField]: { gte: options.range.start, lte: options.range.end } } },
      filterQuery,
    ];

    const groupingFilters = this.getGroupingFilters(options);
    if (groupingFilters) {
      filter.push(...groupingFilters);
    }

    const index = options.remoteName
      ? `${options.remoteName}:${indicator.params.index}`
      : indicator.params.index;

    const response = await typedSearch(this.esClient, {
      index,
      runtime_mappings: await this.buildRuntimeMappings({
        dataViewId: indicator.params.dataViewId,
      }),
      size: 0,
      query: {
        bool: {
          filter,
        },
      },
      aggs: this.addExtraTermsOrMultiTermsAgg(
        {
          date_histogram: {
            field: timestampField,
            fixed_interval: options.interval,
            extended_bounds: {
              min: options.range.start,
              max: options.range.end,
            },
          },
          aggs: {
            good: { filter: goodQuery },
            total: { filter: totalQuery },
          },
        },
        options.groupBy
      ),
    });

    const results =
      // @ts-ignore
      response.aggregations?.perInterval.buckets.map((bucket) => {
        const good = bucket.good?.doc_count ?? 0;
        const total = bucket.total?.doc_count ?? 0;
        const sliValue = computeSLIForPreview(good, total);
        return {
          date: bucket.key_as_string,
          sliValue,
          events: {
            good,
            bad: total - good,
            total,
          },
        };
      }) ?? [];

    // @ts-ignore
    const groups = response.aggregations?.perGroup?.buckets?.reduce((acc, group) => {
      // @ts-ignore
      acc[group.key] = group.perInterval.buckets.map((bucket) => {
        const good = bucket.good?.doc_count ?? 0;
        const total = bucket.total?.doc_count ?? 0;
        return {
          date: bucket.key_as_string,
          sliValue: computeSLIForPreview(good, total),
          events: {
            good,
            bad: total - good,
            total,
          },
        };
      });
      return acc;
    }, {});

    return { results, groups };
  }

  private getGroupingFilters(options: Options): estypes.QueryDslQueryContainer[] | undefined {
    const groupingsKeys = Object.keys(options.groupings ?? {});
    if (groupingsKeys.length) {
      return groupingsKeys.map((key) => ({ term: { [key]: options.groupings![key] } }));
    }
  }

  private async getSyntheticsAvailabilityPreviewData(
    indicator: SyntheticsAvailabilityIndicator,
    options: Options
  ): Promise<GetPreviewDataResponse> {
    const filter = [];
    const { monitorIds, tags, projects } = buildParamValues({
      monitorIds: indicator.params.monitorIds || [],
      tags: indicator.params.tags || [],
      projects: indicator.params.projects || [],
    });
    if (!monitorIds.includes(ALL_VALUE) && monitorIds.length > 0)
      filter.push({
        terms: { 'monitor.id': monitorIds },
      });
    if (!tags.includes(ALL_VALUE) && tags.length > 0)
      filter.push({
        terms: { tags },
      });
    if (!projects.includes(ALL_VALUE) && projects.length > 0)
      filter.push({
        terms: { 'monitor.project.id': projects },
      });

    const index = options.remoteName
      ? `${options.remoteName}:${SYNTHETICS_INDEX_PATTERN}`
      : SYNTHETICS_INDEX_PATTERN;

    const response = await typedSearch(this.esClient, {
      index,
      runtime_mappings: await this.buildRuntimeMappings({
        dataViewId: indicator.params.dataViewId,
      }),
      size: 0,
      query: {
        bool: {
          filter: [
            { range: { '@timestamp': { gte: options.range.start, lte: options.range.end } } },
            { term: { 'summary.final_attempt': true } },
            { term: { 'meta.space_id': this.spaceId } },
            ...filter,
          ],
        },
      },
      aggs: this.addExtraTermsOrMultiTermsAgg(
        {
          date_histogram: {
            field: '@timestamp',
            fixed_interval: options.interval,
            extended_bounds: {
              min: options.range.start,
              max: options.range.end,
            },
          },
          aggs: {
            good: {
              filter: {
                term: {
                  'monitor.status': 'up',
                },
              },
            },
            total: {
              filter: {
                match_all: {},
              },
            },
          },
        },
        options.groupBy
      ),
    });

    const results =
      // @ts-ignore
      response.aggregations?.perInterval.buckets.map((bucket) => {
        const good = bucket.good?.doc_count ?? 0;
        const total = bucket.total?.doc_count ?? 0;
        return {
          date: bucket.key_as_string,
          sliValue: computeSLIForPreview(good, total),
          events: {
            good,
            bad: total - good,
            total,
          },
        };
      }) ?? [];

    // @ts-ignore
    const groups = response.aggregations?.perGroup?.buckets?.reduce((acc, group) => {
      // @ts-ignore
      acc[group.key] = group.perInterval.buckets.map((bucket) => {
        const good = bucket.good?.doc_count ?? 0;
        const total = bucket.total?.doc_count ?? 0;
        return {
          date: bucket.key_as_string,
          sliValue: computeSLIForPreview(good, total),
          events: {
            good,
            bad: total - good,
            total,
          },
        };
      });
      return acc;
    }, {});

    return { results, groups };
  }

  public async execute(params: GetPreviewDataParams): Promise<GetPreviewDataResponse> {
    try {
      // If the time range is 24h or less, then we want to use the timeslice duration for the buckets
      // so that the chart is as close to the evaluation as possible.
      // Otherwise due to how the statistics work, the values might not look like
      // they've breached the threshold.
      const rangeDuration = moment(params.range.to).diff(params.range.from, 'ms');
      const bucketSize =
        rangeDuration <= RANGE_DURATION_24HOURS_LIMIT && params.objective?.timesliceWindow
          ? params.objective.timesliceWindow.asMinutes()
          : Math.max(
              calculateAuto.near(100, moment.duration(rangeDuration, 'ms'))?.asMinutes() ?? 0,
              1
            );

      const options: Options = {
        range: { start: params.range.from.getTime(), end: params.range.to.getTime() },
        remoteName: params.remoteName,
        groupings: params.groupings,
        interval: `${bucketSize}m`,
        groupBy: params.groupBy?.filter((value) => value !== ALL_VALUE),
      };

      const type = params.indicator.type;
      switch (type) {
        case 'sli.apm.transactionDuration':
          return this.getAPMTransactionDurationPreviewData(params.indicator, options);
        case 'sli.apm.transactionErrorRate':
          return this.getAPMTransactionErrorPreviewData(params.indicator, options);
        case 'sli.synthetics.availability':
          return this.getSyntheticsAvailabilityPreviewData(params.indicator, options);
        case 'sli.kql.custom':
          return this.getCustomKQLPreviewData(params.indicator, options);
        case 'sli.histogram.custom':
          return this.getHistogramPreviewData(params.indicator, options);
        case 'sli.metric.custom':
          return this.getCustomMetricPreviewData(params.indicator, options);
        case 'sli.metric.timeslice':
          return this.getTimesliceMetricPreviewData(params.indicator, options);
        default:
          assertNever(type);
      }
    } catch (err) {
      return { results: [] };
    }
  }
}
