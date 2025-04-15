/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { PurgeRollupSchemaType } from '@kbn/slo-schema/src/rest_specs/routes/bulk_purge_rollup';
import { DeleteByQueryResponse } from '@elastic/elasticsearch/lib/api/types';
import { SLI_DESTINATION_INDEX_PATTERN } from '../../common/constants';
import { KibanaSavedObjectsSLORepository } from './slo_repository';
import { IllegalArgumentError } from '../errors';

export class PurgeRollupData {
  constructor(
    private esClient: ElasticsearchClient,
    private repository: KibanaSavedObjectsSLORepository
  ) {}

  public async execute(params: PurgeRollupSchemaType): Promise<DeleteByQueryResponse> {
    const { purgeType } = params.body.purgePolicy;
    const slos = await this.repository.findAllByIds(params.body.ids);

    let comparisonStamp: string | Date;

    if (purgeType === 'fixed_age') {
      const thisComparisonStamp = params.body.purgePolicy.age;
      comparisonStamp = thisComparisonStamp.format();
      if (params.query?.force !== 'true') {
        if (
          slos.some((slo) => {
            return thisComparisonStamp.isShorterThan(slo.timeWindow.duration);
          })
        ) {
          throw new IllegalArgumentError(
            'Age must be greater than or equal to the time window of the SLI data being purged.'
          );
        }
      }
    } else {
      const thisComparisonStamp = params.body.purgePolicy.timestamp;
      comparisonStamp = thisComparisonStamp;
      if (params.query?.force !== 'true') {
        if (
          slos.some((slo) => {
            return (
              thisComparisonStamp.getTime() >
              Date.now() - slo.timeWindow.duration.asSeconds() * 1000
            );
          })
        ) {
          throw new IllegalArgumentError(
            'Timestamp must be before the effective time window of the SLI data being purged.'
          );
        }
      }
    }

    console.log('TIMESTAMP**:', comparisonStamp);
    return this.esClient.deleteByQuery({
      index: SLI_DESTINATION_INDEX_PATTERN,
      refresh: false,
      wait_for_completion: false,
      conflicts: 'proceed',
      slices: 'auto',
      query: {
        bool: {
          filter: [
            {
              terms: { 'slo.id': params.body.ids },
            },
            {
              range: {
                '@timestamp': {
                  lte: comparisonStamp,
                },
              },
            },
          ],
        },
      },
    });
  }
}
