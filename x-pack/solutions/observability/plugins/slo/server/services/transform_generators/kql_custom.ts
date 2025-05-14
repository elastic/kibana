/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TransformPutTransformRequest } from '@elastic/elasticsearch/lib/api/types';
import { DataViewsService } from '@kbn/data-views-plugin/common';
import { kqlCustomIndicatorSchema, timeslicesBudgetingMethodSchema } from '@kbn/slo-schema';
import { TransformGenerator, getElasticsearchQueryOrThrow, parseIndex } from '.';
import {
  SLI_DESTINATION_INDEX_NAME,
  getSLOPipelineId,
  getSLOTransformId,
} from '../../../common/constants';
import { getSLOTransformTemplate } from '../../assets/transform_templates/slo_transform_template';
import { KQLCustomIndicator, SLODefinition } from '../../domain/models';
import { InvalidTransformError } from '../../errors';
import { getFilterRange, getTimesliceTargetComparator } from './common';

export class KQLCustomTransformGenerator extends TransformGenerator {
  constructor(spaceId: string, dataViewService: DataViewsService, isServerless: boolean) {
    super(spaceId, dataViewService, isServerless);
  }

  public async getTransformParams(slo: SLODefinition): Promise<TransformPutTransformRequest> {
    if (!kqlCustomIndicatorSchema.is(slo.indicator)) {
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

  private async buildSource(slo: SLODefinition, indicator: KQLCustomIndicator) {
    const dataView = await this.getIndicatorDataView(indicator.params.dataViewId);
    return {
      index: parseIndex(indicator.params.index),
      runtime_mappings: this.buildCommonRuntimeMappings(dataView),
      query: {
        bool: {
          filter: [
            getFilterRange(slo, indicator.params.timestampField, this.isServerless),
            getElasticsearchQueryOrThrow(indicator.params.filter),
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

  private buildAggregations(slo: SLODefinition, indicator: KQLCustomIndicator) {
    const numerator = getElasticsearchQueryOrThrow(indicator.params.good);
    const denominator = getElasticsearchQueryOrThrow(indicator.params.total);

    return {
      'slo.numerator': {
        filter: numerator,
      },
      'slo.denominator': {
        filter: denominator,
      },
      ...(timeslicesBudgetingMethodSchema.is(slo.budgetingMethod) && {
        'slo.isGoodSlice': {
          bucket_script: {
            buckets_path: {
              goodEvents: 'slo.numerator>_count',
              totalEvents: 'slo.denominator>_count',
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
