/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import {
  BulkPurgeRollupResponse,
  BulkPurgeRollupParams,
} from '@kbn/slo-schema/src/rest_specs/routes/bulk_purge_rollup';
import { calendarAlignedTimeWindowSchema, Duration } from '@kbn/slo-schema';
import { assertNever } from '@elastic/eui';
import moment from 'moment';
import { SLI_DESTINATION_INDEX_PATTERN } from '../../common/constants';
import { SLORepository } from './slo_repository';
import { IllegalArgumentError } from '../errors';
import { SLODefinition } from '../domain/models';

export class BulkPurgeRollupData {
  constructor(private esClient: ElasticsearchClient, private repository: SLORepository) {}

  public async execute(params: BulkPurgeRollupParams): Promise<BulkPurgeRollupResponse> {
    const slos = await this.repository.findAllByIds(params.list);
    if (params.force !== true) {
      await this.validatePurgePolicy(slos, params.purgePolicy);
    }
    const cycles = 'cycles' in params.purgePolicy ? params.purgePolicy.cycles : 0;

    if (params.purgePolicy.purgeType === 'elapsed_window') {
      const responses = await Promise.all(
        slos.map(async (slo) => {
          const duration = slo.timeWindow.duration;
          const lookback = moment(Date.now())
            .subtract(cycles * duration.asSeconds(), 's')
            .startOf(duration.unit)
            .toISOString();
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
                    term: { 'slo.id': slo.id },
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
        })
      );
      return { taskIds: responses.map((response) => response.task) };
    } else {
      const lookback = this.getTimestamp(params.purgePolicy);

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
  }

  private async validatePurgePolicy(
    slos: SLODefinition[],
    purgePolicy: BulkPurgeRollupParams['purgePolicy']
  ) {
    const purgeType = purgePolicy.purgeType;
    let durationInvalid = false;
    let cyclesInvalid = false;

    switch (purgeType) {
      case 'fixed_age':
        const duration = purgePolicy.age;
        durationInvalid = slos.some((slo) => {
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
        durationInvalid = slos.some((slo) => {
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
      case 'elapsed_window':
        cyclesInvalid = purgePolicy.cycles < 1;
        break;
      default:
        assertNever(purgeType);
    }

    if (durationInvalid) {
      throw new IllegalArgumentError(
        `The provided purge policy is invalid. At least one SLO has a time window that is longer than the provided purge policy.`
      );
    } else if (cyclesInvalid) {
      throw new IllegalArgumentError(
        `The provided purge policy is invalid. The number of cycles must be greater than 0.`
      );
    }
  }

  private getTimestamp(
    purgePolicy:
      | {
          purgeType: 'fixed_age';
          age: Duration;
        }
      | {
          purgeType: 'fixed_time';
          timestamp: Date;
        }
  ): string {
    if (purgePolicy.purgeType === 'fixed_age') {
      return `now-${purgePolicy.age.format()}`;
    } else if (purgePolicy.purgeType === 'fixed_time') {
      return purgePolicy.timestamp.toISOString();
    }
    assertNever(purgePolicy);
  }
}
