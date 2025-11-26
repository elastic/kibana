/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import type { EsClient } from '@kbn/scout-oblt';
import {
  API_VERSIONS,
  ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_URL,
} from '@kbn/elastic-assistant-common';
import pRetry from 'p-retry';

export class SecurityKnowledgeBaseClient {
  constructor(
    private readonly fetch: HttpHandler,
    private readonly log: ToolingLog,
    private readonly esClient: EsClient
  ) {}

  async ensureInstalled(): Promise<void> {
    this.log.info('Ensuring Security Knowledge Base is installed');

    const status = await this.fetch<any>(
      ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_URL.replace('{resource?}', ''),
      {
        method: 'GET',
        version: API_VERSIONS.public.v1,
      }
    );

    if (status?.is_setup_available && status?.elser_exists) {
      this.log.success('Knowledge base is already installed');
      return;
    }

    await pRetry(
      async () => {
        this.log.info('Setting up Security Knowledge Base');
        await this.fetch(ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_URL.replace('{resource?}', ''), {
          method: 'POST',
          version: API_VERSIONS.public.v1,
          query: { ignoreSecurityLabs: true },
          body: JSON.stringify({}),
        });
      },
      { retries: 5 }
    );
  }

  async clear(space = 'default') {
    return this.esClient.deleteByQuery({
      index: `.kibana-elastic-ai-assistant-knowledge-base-${space}`,
      conflicts: 'proceed',
      query: { match_all: {} },
      refresh: true,
    });
  }
}
