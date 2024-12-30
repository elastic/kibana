/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Integration } from '../types';
import { RuleMigrationsDataBaseClient } from './rule_migrations_data_base_client';

/* This will be removed once the package registry changes is performed */
import integrationsFile from './integrations_temp.json';

/* The minimum score required for a integration to be considered correct, might need to change this later */
const MIN_SCORE = 40 as const;
/* The number of integrations the RAG will return, sorted by score */
const RETURNED_INTEGRATIONS = 5 as const;

/* This is a temp implementation to allow further development until https://github.com/elastic/package-registry/issues/1252 */
const INTEGRATIONS = integrationsFile as Integration[];
/* BULK_MAX_SIZE defines the number to break down the bulk operations by.
 * The 500 number was chosen as a reasonable number to avoid large payloads. It can be adjusted if needed.
 */
export class RuleMigrationsDataIntegrationsClient extends RuleMigrationsDataBaseClient {
  /** Indexes an array of integrations to be used with ELSER semantic search queries */
  async create(): Promise<void> {
    const index = await this.getIndexName();
    await this.esClient
      .bulk(
        {
          refresh: 'wait_for',
          operations: INTEGRATIONS.flatMap((integration) => [
            { update: { _index: index, _id: integration.id } },
            {
              doc: {
                title: integration.title,
                description: integration.description,
                data_streams: integration.data_streams,
                elser_embedding: integration.elser_embedding,
                '@timestamp': new Date().toISOString(),
              },
              doc_as_upsert: true,
            },
          ]),
        },
        { requestTimeout: 10 * 60 * 1000 }
      )
      .catch((error) => {
        this.logger.error(`Error preparing integrations for SIEM migration ${error.message}`);
        throw error;
      });
  }

  /** Based on a LLM generated semantic string, returns the 5 best results with a score above 40 */
  async retrieveIntegrations(semanticString: string): Promise<Integration[]> {
    const index = await this.getIndexName();
    const query = {
      bool: {
        should: [
          {
            semantic: {
              query: semanticString,
              field: 'elser_embedding',
              boost: 1.5,
            },
          },
          {
            multi_match: {
              query: semanticString,
              fields: ['title^2', 'description'],
              boost: 3,
            },
          },
        ],
      },
    };
    const results = await this.esClient
      .search<Integration>({
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
