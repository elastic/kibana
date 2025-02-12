/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TransformPutTransformRequest } from '@elastic/elasticsearch/lib/api/types';
import { DataViewsService } from '@kbn/data-views-plugin/common';
import {
  HistogramIndicator,
  histogramIndicatorSchema,
  timeslicesBudgetingMethodSchema,
} from '@kbn/slo-schema';
import { TransformGenerator, getElasticsearchQueryOrThrow, parseIndex } from '.';
import {
  SLI_DESTINATION_INDEX_NAME,
  getSLOPipelineId,
  getSLOTransformId,
} from '../../../common/constants';
import { getSLOTransformTemplate } from '../../assets/transform_templates/slo_transform_template';
import { SLODefinition } from '../../domain/models';
import { InvalidTransformError } from '../../errors';
import { GetHistogramIndicatorAggregation } from '../aggregations';
import { getFilterRange, getTimesliceTargetComparator } from './common';

export class HistogramTransformGenerator extends TransformGenerator {
  constructor(spaceId: string, dataViewService: DataViewsService, isServerless: boolean) {
    super(spaceId, dataViewService, isServerless);
  }

  public async getTransformParams(slo: SLODefinition): Promise<TransformPutTransformRequest> {
    if (!histogramIndicatorSchema.is(slo.indicator)) {
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

  private async buildSource(slo: SLODefinition, indicator: HistogramIndicator) {
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

  private buildAggregations(slo: SLODefinition, indicator: HistogramIndicator) {
    const getHistogramIndicatorAggregations = new GetHistogramIndicatorAggregation(indicator);

    return {
      ...getHistogramIndicatorAggregations.execute({
        type: 'good',
        aggregationKey: 'slo.numerator',
      }),
      ...getHistogramIndicatorAggregations.execute({
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
