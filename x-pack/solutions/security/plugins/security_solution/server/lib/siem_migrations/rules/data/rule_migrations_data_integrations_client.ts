/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackageList } from '@kbn/fleet-plugin/common';
import type { RuleMigrationIntegration } from '../types';
import { RuleMigrationsDataBaseClient } from './rule_migrations_data_base_client';

/* The minimum score required for a integration to be considered correct, might need to change this later */
const MIN_SCORE = 40 as const;
/* The number of integrations the RAG will return, sorted by score */
const RETURNED_INTEGRATIONS = 5 as const;

/* BULK_MAX_SIZE defines the number to break down the bulk operations by.
 * The 500 number was chosen as a reasonable number to avoid large payloads. It can be adjusted if needed.
 */
export class RuleMigrationsDataIntegrationsClient extends RuleMigrationsDataBaseClient {
  async getIntegrationPackages(): Promise<PackageList | undefined> {
    return this.dependencies.packageService?.asInternalUser.getPackages();
  }

  /** Indexes an array of integrations to be used with ELSER semantic search queries */
  async populate(): Promise<void> {
    const index = await this.getIndexName();
    const packages = await this.dependencies.packageService?.asInternalUser.getPackages();
    if (packages) {
      const ragIntegrations = packages.map<RuleMigrationIntegration>((pkg) => ({
        title: pkg.title,
        id: pkg.name,
        description: pkg?.description || '',
        data_streams:
          pkg.data_streams
            ?.filter((stream) => stream.type === 'logs')
            .map((stream) => ({
              dataset: stream.dataset,
              index_pattern: `${stream.type}-${stream.dataset}-*`,
              title: stream.title,
            })) || [],
        elser_embedding: [
          pkg.title,
          pkg.description,
          ...(pkg.data_streams
            ?.filter((stream) => stream.type === 'logs')
            .map((stream) => stream.title) || []),
        ].join(' - '),
      }));
      await this.esClient
        .bulk(
          {
            refresh: 'wait_for',
            operations: ragIntegrations.flatMap((integration) => [
              { update: { _index: index, _id: integration.id } },
              {
                doc: {
                  title: integration.title,
                  description: integration.description,
                  data_streams: integration.data_streams,
                  elser_embedding: integration.elser_embedding,
                },
                doc_as_upsert: true,
              },
            ]),
          },
          { requestTimeout: 10 * 60 * 1000 }
        )
        .catch((error) => {
          this.logger.error(`Error populating integrations for migration ${error.message}`);
          throw error;
        });
    } else {
      this.logger.warn('Package service not available, not able not populate integrations index');
    }
  }

  /** Based on a LLM generated semantic string, returns the 5 best results with a score above 40 */
  async retrieveIntegrations(semanticString: string): Promise<RuleMigrationIntegration[]> {
    const index = await this.getIndexName();
    const query = {
      bool: {
        should: [
          { semantic: { query: semanticString, field: 'elser_embedding', boost: 1.5 } },
          { multi_match: { query: semanticString, fields: ['title^2', 'description'], boost: 3 } },
        ],
      },
    };
    const results = await this.esClient
      .search<RuleMigrationIntegration>({
        index,
        query,
        size: RETURNED_INTEGRATIONS,
        min_score: MIN_SCORE,
      })
      .then(this.processResponseHits.bind(this))
      .catch((error) => {
        this.logger.error(`Error querying integration details for ELSER: ${error.message}`);
        throw error;
      });

    return results;
  }
}
