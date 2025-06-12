/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TransformPutTransformRequest } from '@elastic/elasticsearch/lib/api/types';
import { DataViewsService } from '@kbn/data-views-plugin/common';
import {
  timesliceMetricComparatorMapping,
  TimesliceMetricIndicator,
  timesliceMetricIndicatorSchema,
  timeslicesBudgetingMethodSchema,
} from '@kbn/slo-schema';
import { getElasticsearchQueryOrThrow, parseIndex, TransformGenerator } from '.';
import {
  getSLOPipelineId,
  getSLOTransformId,
  SLI_DESTINATION_INDEX_NAME,
} from '../../../common/constants';
import { getSLOTransformTemplate } from '../../assets/transform_templates/slo_transform_template';
import { SLODefinition } from '../../domain/models';
import { InvalidTransformError } from '../../errors';
import { GetTimesliceMetricIndicatorAggregation } from '../aggregations';
import { getFilterRange } from './common';

const INVALID_EQUATION_REGEX = /[^A-Z|+|\-|\s|\d+|\.|\(|\)|\/|\*|>|<|=|\?|\:|&|\!|\|]+/g;

export class TimesliceMetricTransformGenerator extends TransformGenerator {
  constructor(spaceId: string, dataViewService: DataViewsService, isServerless: boolean) {
    super(spaceId, dataViewService, isServerless);
  }

  public async getTransformParams(slo: SLODefinition): Promise<TransformPutTransformRequest> {
    if (!timesliceMetricIndicatorSchema.is(slo.indicator)) {
      throw new InvalidTransformError(`Cannot handle SLO of indicator type: ${slo.indicator.type}`);
    }

    return getSLOTransformTemplate(
      this.buildTransformId(slo),
      this.buildDescription(slo),
      await this.buildSource(slo, slo.indicator),
      this.buildDestination(slo),
      this.buildCommonGroupBy(slo, slo.indicator.params.timestampField),
      this.buildAggregations(slo, slo.indicator),
      this.buildSettings(slo, slo.indicator.params.timestampField),
      slo
    );
  }

  private buildTransformId(slo: SLODefinition): string {
    return getSLOTransformId(slo.id, slo.revision);
  }

  private async buildSource(slo: SLODefinition, indicator: TimesliceMetricIndicator) {
    const dataView = await this.getIndicatorDataView(indicator.params.dataViewId);

    return {
      index: parseIndex(indicator.params.index),
      runtime_mappings: this.buildCommonRuntimeMappings(dataView),
      query: {
        bool: {
          filter: [
            getFilterRange(slo, indicator.params.timestampField, this.isServerless),
            getElasticsearchQueryOrThrow(indicator.params.filter, dataView),
          ],
        },
      },
    };
  }

  private buildDestination(slo: SLODefinition) {
    return {
      pipeline: getSLOPipelineId(slo.id, slo.revision),
      index: SLI_DESTINATION_INDEX_NAME,
    };
  }

  private buildAggregations(slo: SLODefinition, indicator: TimesliceMetricIndicator) {
    if (indicator.params.metric.equation.match(INVALID_EQUATION_REGEX)) {
      throw new Error(`Invalid equation: ${indicator.params.metric.equation}`);
    }

    if (!timeslicesBudgetingMethodSchema.is(slo.budgetingMethod)) {
      throw new Error('The sli.metric.timeslice indicator MUST have a timeslice budgeting method.');
    }

    const getIndicatorAggregation = new GetTimesliceMetricIndicatorAggregation(indicator);
    const comparator = timesliceMetricComparatorMapping[indicator.params.metric.comparator];
    return {
      ...getIndicatorAggregation.execute('_metric'),
      'slo.numerator': {
        bucket_script: {
          buckets_path: { value: '_metric>value' },
          script: {
            source: `params.value ${comparator} params.threshold ? 1 : 0`,
            params: { threshold: indicator.params.metric.threshold },
          },
        },
      },
      'slo.denominator': {
        bucket_script: {
          buckets_path: {},
          script: '1',
        },
      },
      'slo.isGoodSlice': {
        bucket_script: {
          buckets_path: {
            goodEvents: 'slo.numerator>value',
          },
          script: `params.goodEvents == 1 ? 1 : 0`,
        },
      },
    };
  }
}
