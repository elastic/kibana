/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { retryTransientEsErrors } from '../../utils/retry';

export const HEALTH_INDEX_PATTERN = '.slo-observability.health-*';
export const HEALTH_INDEX_TEMPLATE_NAME = '.slo-observability.health';
export const HEALTH_INDEX_NAME = '.slo-observability.health-000001';
export const HEALTH_INDEX_ALIAS = '.slo-observability.health';
export const HEALTH_ILM_POLICY_NAME = '.slo-observability.health-policy';

export class HealthIndexInstaller {
  constructor(private esClient: ElasticsearchClient, private logger: Logger) {}

  public async install(): Promise<void> {
    try {
      this.logger.debug('Installing SLO health diagnose resources');

      await this.createOrUpdateILMPolicy();
      await this.createOrUpdateIndexTemplate();
      await this.createBootstrapIndex();
    } catch (err) {
      this.logger.error(`Error while installing SLO health diagnose resources: ${err}`);
    }
  }

  private async createOrUpdateILMPolicy(): Promise<void> {
    this.logger.debug(`Installing ILM policy [${HEALTH_ILM_POLICY_NAME}]`);

    await this.execute(() =>
      this.esClient.ilm.putLifecycle({
        name: HEALTH_ILM_POLICY_NAME,
        policy: {
          phases: {
            hot: {
              actions: {
                rollover: {
                  max_age: '1h',
                  max_primary_shard_size: '100mb',
                },
              },
            },
            delete: {
              min_age: '24h',
              actions: {
                delete: {},
              },
            },
          },
        },
      })
    );
  }

  private async createOrUpdateIndexTemplate(): Promise<void> {
    this.logger.debug(`Installing index template [${HEALTH_INDEX_TEMPLATE_NAME}]`);

    await this.execute(() =>
      this.esClient.indices.putIndexTemplate({
        name: HEALTH_INDEX_TEMPLATE_NAME,
        index_patterns: [HEALTH_INDEX_PATTERN],
        template: {
          settings: {
            hidden: true,
            'sort.field': ['taskId', 'sloId'],
            'sort.order': ['asc', 'asc'],
            auto_expand_replicas: '0-1',
            'index.lifecycle.name': HEALTH_ILM_POLICY_NAME,
            'index.lifecycle.rollover_alias': HEALTH_INDEX_ALIAS,
          },
          mappings: {
            dynamic: false,
            properties: {
              taskId: { type: 'keyword' },
              sloId: { type: 'keyword' },
              revision: { type: 'integer' },
              isProblematic: { type: 'boolean' },
              checkedAt: { type: 'date' },
            },
          },
        },
      })
    );
  }

  private async createBootstrapIndex(): Promise<void> {
    try {
      this.logger.debug(`Creating bootstrap index [${HEALTH_INDEX_NAME}]`);

      await this.execute(() =>
        this.esClient.indices.create({
          index: HEALTH_INDEX_NAME,
          aliases: {
            [HEALTH_INDEX_ALIAS]: {
              is_write_index: true,
            },
          },
        })
      );
    } catch (err) {
      if (err?.meta?.body?.error?.type !== 'resource_already_exists_exception') {
        throw err;
      }
      this.logger.debug(`Bootstrap index [${HEALTH_INDEX_NAME}] already exists`);
    }
  }

  private async execute<T>(esCall: () => Promise<T>): Promise<T> {
    return await retryTransientEsErrors(esCall, { logger: this.logger });
  }
}
