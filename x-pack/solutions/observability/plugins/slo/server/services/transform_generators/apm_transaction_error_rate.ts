/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import { TransformPutTransformRequest } from '@elastic/elasticsearch/lib/api/types';
import { DataViewsService } from '@kbn/data-views-plugin/common';
import {
  ALL_VALUE,
  apmTransactionErrorRateIndicatorSchema,
  timeslicesBudgetingMethodSchema,
} from '@kbn/slo-schema';
import { TransformGenerator, getElasticsearchQueryOrThrow } from '.';
import {
  SLI_DESTINATION_INDEX_NAME,
  getSLOPipelineId,
  getSLOTransformId,
} from '../../../common/constants';
import { getSLOTransformTemplate } from '../../assets/transform_templates/slo_transform_template';
import { APMTransactionErrorRateIndicator, SLODefinition } from '../../domain/models';
import { InvalidTransformError } from '../../errors';
import { getFilterRange, getTimesliceTargetComparator, parseIndex } from './common';

export class ApmTransactionErrorRateTransformGenerator extends TransformGenerator {
  constructor(spaceId: string, dataViewService: DataViewsService, isServerless: boolean) {
    super(spaceId, dataViewService, isServerless);
  }

  public async getTransformParams(slo: SLODefinition): Promise<TransformPutTransformRequest> {
    if (!apmTransactionErrorRateIndicatorSchema.is(slo.indicator)) {
      throw new InvalidTransformError(`Cannot handle SLO of indicator type: ${slo.indicator.type}`);
    }

    return getSLOTransformTemplate(
      this.buildTransformId(slo),
      this.buildDescription(slo),
      await this.buildSource(slo, slo.indicator),
      this.buildDestination(slo),
      this.buildGroupBy(slo, slo.indicator),
      this.buildAggregations(slo),
      this.buildSettings(slo, '@timestamp'),
      slo
    );
  }

  private buildTransformId(slo: SLODefinition): string {
    return getSLOTransformId(slo.id, slo.revision);
  }

  private buildGroupBy(slo: SLODefinition, indicator: APMTransactionErrorRateIndicator) {
    // These groupBy fields must match the fields from the source query, otherwise
    // the transform will create permutations for each value present in the source.
    // E.g. if environment is not specified in the source query, but we include it in the groupBy,
    // we'll output documents for each environment value
    const extraGroupByFields = {
      ...(indicator.params.service !== ALL_VALUE && {
        'service.name': { terms: { field: 'service.name' } },
      }),
      ...(indicator.params.environment !== ALL_VALUE && {
        'service.environment': { terms: { field: 'service.environment' } },
      }),
      ...(indicator.params.transactionName !== ALL_VALUE && {
        'transaction.name': { terms: { field: 'transaction.name' } },
      }),
      ...(indicator.params.transactionType !== ALL_VALUE && {
        'transaction.type': { terms: { field: 'transaction.type' } },
      }),
    };

    return this.buildCommonGroupBy(slo, '@timestamp', extraGroupByFields);
  }

  private async buildSource(slo: SLODefinition, indicator: APMTransactionErrorRateIndicator) {
    const queryFilter: estypes.QueryDslQueryContainer[] = [
      getFilterRange(slo, '@timestamp', this.isServerless),
    ];

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

    const dataView = await this.getIndicatorDataView(indicator.params.dataViewId);

    if (indicator.params.filter) {
      queryFilter.push(getElasticsearchQueryOrThrow(indicator.params.filter, dataView));
    }

    return {
      index: parseIndex(indicator.params.index),
      runtime_mappings: this.buildCommonRuntimeMappings(dataView),
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

  private buildDestination(slo: SLODefinition) {
    return {
      pipeline: getSLOPipelineId(slo.id, slo.revision),
      index: SLI_DESTINATION_INDEX_NAME,
    };
  }

  private buildAggregations(slo: SLODefinition) {
    return {
      'slo.numerator': {
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
      'slo.denominator': {
        filter: {
          match_all: {},
        },
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
