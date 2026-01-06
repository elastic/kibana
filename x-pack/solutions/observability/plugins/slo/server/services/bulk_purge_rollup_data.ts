/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assertNever } from '@elastic/eui';
import type { ElasticsearchClient } from '@kbn/core/server';
import { calendarAlignedTimeWindowSchema } from '@kbn/slo-schema';
import type {
  BulkPurgeRollupParams,
  BulkPurgeRollupResponse,
} from '@kbn/slo-schema/src/rest_specs/routes/bulk_purge_rollup';
import moment from 'moment';
import { SLI_DESTINATION_INDEX_PATTERN } from '../../common/constants';
import type { SLODefinition } from '../domain/models';
import { IllegalArgumentError } from '../errors';
import type { SLODefinitionRepository } from './slo_definition_repository';

export class BulkPurgeRollupData {
  constructor(private esClient: ElasticsearchClient, private repository: SLODefinitionRepository) {}

  public async execute(params: BulkPurgeRollupParams): Promise<BulkPurgeRollupResponse> {
    const lookback = this.getTimestamp(params.purgePolicy);
    const slos = await this.repository.findAllByIds(params.list);

    if (params.force !== true) {
      await this.validatePurgePolicy(slos, params.purgePolicy);
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
              terms: { 'slo.id': slos.map((slo) => slo.id) },
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

  private async validatePurgePolicy(
    slos: SLODefinition[],
    purgePolicy: BulkPurgeRollupParams['purgePolicy']
  ) {
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
        const timestampMoment = moment(purgePolicy.timestamp);
        inputIsInvalid = slos.some((slo) => {
          if (calendarAlignedTimeWindowSchema.is(slo.timeWindow)) {
            return timestampMoment.isAfter(
              moment(Date.now()).startOf(slo.timeWindow.duration.unit)
            );
          } else {
            return timestampMoment.isAfter(
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

  private getTimestamp(purgePolicy: BulkPurgeRollupParams['purgePolicy']): string {
    if (purgePolicy.purgeType === 'fixed_age') {
      return `now-${purgePolicy.age.format()}`;
    } else if (purgePolicy.purgeType === 'fixed_time') {
      return purgePolicy.timestamp.toISOString();
    }
    assertNever(purgePolicy);
  }
}
