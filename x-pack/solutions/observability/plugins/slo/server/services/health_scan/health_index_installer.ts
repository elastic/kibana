/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { retryTransientEsErrors } from '../../utils/retry';
import { SLO_RESOURCES_VERSION } from '../../../common/constants';

export const HEALTH_DATA_STREAM_NAME = 'slo-observability.health';
export const HEALTH_INDEX_TEMPLATE_NAME = 'slo-observability.health@template';

export class HealthIndexInstaller {
  constructor(private esClient: ElasticsearchClient, private logger: Logger) {}

  public async install(): Promise<void> {
    try {
      this.logger.debug('Installing SLO health scan resources');

      await this.createOrUpdateIndexTemplate();
    } catch (err) {
      this.logger.error(`Error while installing SLO health scan resources: ${err}`);
    }
  }

  private async createOrUpdateIndexTemplate(): Promise<void> {
    this.logger.debug(
      `Installing index template [${HEALTH_INDEX_TEMPLATE_NAME}] with 7d lifecycle`
    );

    await this.execute(() =>
      this.esClient.indices.putIndexTemplate({
        name: HEALTH_INDEX_TEMPLATE_NAME,
        index_patterns: [`${HEALTH_DATA_STREAM_NAME}*`],
        priority: 500,
        data_stream: {
          hidden: true,
        },
        _meta: {
          description: 'Mappings for SLO rollup data',
          version: SLO_RESOURCES_VERSION,
          managed: true,
          managed_by: 'observability',
        },
        template: {
          lifecycle: {
            data_retention: '7d',
          },
          settings: {
            auto_expand_replicas: '0-1',
          },
          mappings: {
            dynamic: false,
            properties: {
              '@timestamp': { type: 'date' },
              scanId: { type: 'keyword' },
              spaceId: { type: 'keyword' },
              sloId: { type: 'keyword' },
              revision: { type: 'integer' },
              isProblematic: { type: 'boolean' },
            },
          },
        },
      })
    );
  }

  private async execute<T>(esCall: () => Promise<T>): Promise<T> {
    return await retryTransientEsErrors(esCall, { logger: this.logger });
  }
}
