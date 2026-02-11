/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackageList } from '@kbn/fleet-plugin/common';
import type { RuleMigrationIntegration } from '../types';
import { SiemMigrationsDataBaseClient } from '../../common/data/siem_migrations_data_base_client';

const INTEGRATION_WEIGHTS = [
  { ids: ['endpoint'], weight: 1.5 }, // Elastic Defend should be boosted
];

/**
 * excludes Splunk, QRadar and Elastic Security integrations since automatic migrations
 * intends to work with customers actual data instead of data improted from vendors
 * for which artifacts are being migrated
 *
 * */
const EXCLUDED_INTEGRATIONS = ['splunk', 'elastic_security', 'ibm_qradar'];

/* The minimum score required for a integration to be considered correct, might need to change this later */
const MIN_SCORE = 7 as const;
/* The number of integrations the RAG will return, sorted by score */
const RETURNED_INTEGRATIONS = 5 as const;

export class RuleMigrationsDataIntegrationsClient extends SiemMigrationsDataBaseClient {
  /** Returns the Security integration packages that have "logs" type `data_streams` configured, including pre-release packages */
  public async getSecurityLogsPackages(): Promise<PackageList | undefined> {
    const packages = await this.dependencies.packageService?.asInternalUser.getPackages({
      prerelease: true,
      category: 'security',
    });
    return packages?.filter((pkg) => pkg.data_streams?.some(({ type }) => type === 'logs'));
  }

  /** Indexes an array of integrations to be used with ELSER semantic search queries */
  public async populate(): Promise<void> {
    const index = await this.getIndexName();
    const packages = await this.getSecurityLogsPackages();
    if (packages) {
      const ragIntegrations = packages.reduce<RuleMigrationIntegration[]>((acc, pkg) => {
        const logsDataStreams = pkg.data_streams?.filter(({ type }) => type === 'logs');
        // Only include packages that have logs data streams
        if (logsDataStreams?.length) {
          acc.push({
            title: pkg.title,
            id: pkg.name,
            description: pkg?.description || '',
            data_streams: logsDataStreams.map((stream) => ({
              dataset: stream.dataset,
              index_pattern: `${stream.type}-${stream.dataset}-*`,
              title: stream.title,
            })),
            elser_embedding: [
              pkg.title,
              pkg.description,
              ...logsDataStreams.map((stream) => stream.title),
            ].join(' - '),
          });
        }
        return acc;
      }, []);

      if (ragIntegrations.length === 0) {
        this.logger.debug('No security integrations with logs data streams found to index');
        return;
      }

      await this.esClient
        .bulk(
          {
            refresh: 'wait_for',
            operations: ragIntegrations.flatMap(({ id, ...doc }) => [
              { update: { _index: index, _id: id } },
              { doc, doc_as_upsert: true },
            ]),
          },
          { requestTimeout: 10 * 60 * 1000 } // 10 minutes
        )
        .then((response) => {
          if (response.errors) {
            // use the first error to throw
            const reason = response.items.find((item) => item.update?.error)?.update?.error?.reason;
            throw new Error(reason ?? 'Unknown error');
          }
        })
        .catch((error) => {
          this.logger.error(`Error indexing integrations embeddings: ${error.message}`);
          throw error;
        });
    } else {
      this.logger.warn('Package service not available, not able not populate integrations index');
    }
  }

  /** Retrieves the integration details for a given semantic query */
  public async semanticSearch(semanticQuery: string): Promise<RuleMigrationIntegration[]> {
    const index = await this.getIndexName();
    const query = {
      function_score: {
        query: {
          bool: {
            must: { semantic: { query: semanticQuery, field: 'elser_embedding' } },
            must_not: { ids: { values: EXCLUDED_INTEGRATIONS } },
            filter: { exists: { field: 'data_streams' } },
          },
        },
        functions: INTEGRATION_WEIGHTS.map(({ ids, weight }) => ({
          filter: { ids: { values: ids } },
          weight,
        })),
        score_mode: 'multiply' as const,
        boost_mode: 'multiply' as const,
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
