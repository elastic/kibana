/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import {
  PurgePolicyType,
  PurgeRollupSchemaType,
} from '@kbn/slo-schema/src/rest_specs/routes/bulk_purge_rollup';
import { calendarAlignedTimeWindowSchema } from '@kbn/slo-schema';
import { assertNever } from '@elastic/eui';
import { DeleteByQueryResponse } from '@elastic/elasticsearch/lib/api/types';
import moment from 'moment';
import { SLI_DESTINATION_INDEX_PATTERN } from '../../common/constants';
import { SLORepository } from './slo_repository';
import { IllegalArgumentError } from '../errors';

export class PurgeRollupData {
  constructor(private esClient: ElasticsearchClient, private repository: SLORepository) {}

  public async execute(
    params: PurgeRollupSchemaType
  ): Promise<{ taskId: DeleteByQueryResponse['task'] }> {
    const lookback = this.getTimestamp(params.purgePolicy);

    if (params.force !== true) {
      await this.validatePurgePolicy(params);
    }

    const response = await this.esClient.deleteByQuery({
      index: SLI_DESTINATION_INDEX_PATTERN,
      refresh: false,
      wait_for_completion: false,
      conflicts: 'proceed',
      slices: 'auto',
      query: {
        bool: {
          filter: [
            {
              terms: { 'slo.id': params.ids },
            },
            {
              range: {
                '@timestamp': {
                  lte: lookback,
                },
              },
            },
          ],
        },
      },
    });

    return { taskId: response.task };
  }

  private async validatePurgePolicy(params: PurgeRollupSchemaType) {
    const { ids, purgePolicy } = params;
    const slos = await this.repository.findAllByIds(ids);
    const purgeType = purgePolicy.purgeType;
    let inputIsInvalid = false;

    switch (purgeType) {
      case 'fixed_age':
        const duration = purgePolicy.age;
        inputIsInvalid = slos.some((slo) => {
          if (calendarAlignedTimeWindowSchema.is(slo.timeWindow)) {
            return moment(Date.now())
              .subtract(duration.asSeconds(), 's')
              .isAfter(moment(Date.now()).startOf(slo.timeWindow.duration.unit));
          } else {
            return duration.isShorterThan(slo.timeWindow.duration);
          }
        });
        break;
      case 'fixed_time':
        const timestamp = purgePolicy.timestamp;
        inputIsInvalid = slos.some((slo) => {
          if (calendarAlignedTimeWindowSchema.is(slo.timeWindow)) {
            return moment(timestamp).isAfter(
              moment(Date.now()).startOf(slo.timeWindow.duration.unit)
            );
          } else {
            return moment(timestamp).isAfter(
              moment(Date.now()).subtract(slo.timeWindow.duration.asSeconds(), 's')
            );
          }
        });
        break;
      default:
        assertNever(purgeType);
    }

    if (inputIsInvalid) {
      throw new IllegalArgumentError(
        `The provided purge policy is invalid. At least one SLO has a time window that is longer than the provided purge policy.`
      );
    }
  }

  private getTimestamp(purgePolicy: PurgePolicyType): string {
    if (purgePolicy.purgeType === 'fixed_age') {
      return `now-${purgePolicy.age.format()}`;
    } else {
      return purgePolicy.timestamp.toISOString();
    }
  }
}
