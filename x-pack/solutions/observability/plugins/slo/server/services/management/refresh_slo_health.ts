/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { RefreshSLOHealthResponse } from '@kbn/slo-schema';
import moment from 'moment';
import { HEALTH_INDEX_PATTERN } from '../../../common/constants';
import { SLOHealth } from '../../domain/models';
import { TooManyRequestsException } from '../../errors';
import { ComputeSLOHealth } from './compute_slo_health';

const MIN_REFRESH_INTERVAL = 60;

export class RefreshSLOHealth {
  constructor(
    private computeSLOHealth: ComputeSLOHealth,
    private esClient: ElasticsearchClient,
    private spaceId: string
  ) {}

  public async execute(): Promise<RefreshSLOHealthResponse> {
    await this.assertRefreshableOrThrow();
    return await this.computeSLOHealth.execute(this.spaceId);
  }

  private async assertRefreshableOrThrow(): Promise<void> {
    const results = await this.esClient.search<Pick<SLOHealth, 'createdAt'>>({
      index: HEALTH_INDEX_PATTERN,
      size: 1,
      _source: ['createdAt'],
      sort: [{ createdAt: { order: 'desc' } }],
      query: { bool: { filter: [{ term: { spaceId: this.spaceId } }] } },
    });

    const lastRefreshedAt =
      results.hits.hits.length > 0 && !!results.hits.hits[0]._source?.createdAt
        ? new Date(results.hits.hits[0]._source.createdAt)
        : new Date();

    if (moment().diff(lastRefreshedAt, 's') <= MIN_REFRESH_INTERVAL) {
      throw new TooManyRequestsException(
        `Refresh operation is not allowed. The last refresh was performed on ${lastRefreshedAt.toISOString()}. Please wait at least ${MIN_REFRESH_INTERVAL} seconds before trying again.`
      );
    }
  }
}
