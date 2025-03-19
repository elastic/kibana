/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TransformPutTransformRequest } from '@elastic/elasticsearch/lib/api/types';
import { metricCustomIndicatorSchema, timeslicesBudgetingMethodSchema } from '@kbn/slo-schema';

import { DataViewsService } from '@kbn/data-views-plugin/common';
import { getElasticsearchQueryOrThrow, parseIndex, TransformGenerator } from '.';
import {
  getSLOPipelineId,
  getSLOTransformId,
  SLI_DESTINATION_INDEX_NAME,
} from '../../../common/constants';
import { getSLOTransformTemplate } from '../../assets/transform_templates/slo_transform_template';
import { MetricCustomIndicator, SLODefinition } from '../../domain/models';
import { InvalidTransformError } from '../../errors';
import { GetCustomMetricIndicatorAggregation } from '../aggregations';
import { getFilterRange, getTimesliceTargetComparator } from './common';

export const INVALID_EQUATION_REGEX = /[^A-Z|+|\-|\s|\d+|\.|\(|\)|\/|\*|>|<|=|\?|\:|&|\!|\|]+/g;

export class MetricCustomTransformGenerator extends TransformGenerator {
  constructor(spaceId: string, dataViewService: DataViewsService, isServerless: boolean) {
    super(spaceId, dataViewService, isServerless);
  }

  public async getTransformParams(slo: SLODefinition): Promise<TransformPutTransformRequest> {
    if (!metricCustomIndicatorSchema.is(slo.indicator)) {
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

  private async buildSource(slo: SLODefinition, indicator: MetricCustomIndicator) {
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

  private buildAggregations(slo: SLODefinition, indicator: MetricCustomIndicator) {
    if (indicator.params.good.equation.match(INVALID_EQUATION_REGEX)) {
      throw new Error(`Invalid equation: ${indicator.params.good.equation}`);
    }

    if (indicator.params.total.equation.match(INVALID_EQUATION_REGEX)) {
      throw new Error(`Invalid equation: ${indicator.params.total.equation}`);
    }

    const getCustomMetricIndicatorAggregation = new GetCustomMetricIndicatorAggregation(indicator);
    return {
      ...getCustomMetricIndicatorAggregation.execute({
        type: 'good',
        aggregationKey: 'slo.numerator',
      }),
      ...getCustomMetricIndicatorAggregation.execute({
        type: 'total',
        aggregationKey: 'slo.denominator',
      }),
      ...(timeslicesBudgetingMethodSchema.is(slo.budgetingMethod) && {
        'slo.isGoodSlice': {
          bucket_script: {
            buckets_path: {
              goodEvents: 'slo.numerator>value',
              totalEvents: 'slo.denominator>value',
            },
            script: `if (params.totalEvents == 0) { return 1 } else { return params.goodEvents / params.totalEvents ${getTimesliceTargetComparator(
              slo.objective.timesliceTarget!
            )} ${slo.objective.timesliceTarget} ? 1 : 0 }`,
          },
        },
      }),
    };
  }
}
