/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { pollUntilTrue } from './slo_poll';

export interface SloPipelineAssertions {
  assertNotFound(pipelineId: string): Promise<void>;
  assertExists(pipelineId: string): Promise<Record<string, unknown>>;
}

export function createSloPipelineAssertions(esClient: Client): SloPipelineAssertions {
  return {
    async assertNotFound(pipelineId: string) {
      await pollUntilTrue(
        async () => {
          try {
            await esClient.ingest.getPipeline({ id: pipelineId });
            return false;
          } catch (err: unknown) {
            const status = (err as { meta?: { statusCode?: number } }).meta?.statusCode;
            return status === 404;
          }
        },
        {
          timeoutMs: 40_000,
          intervalMs: 3000,
          label: `Wait for pipeline ${pipelineId} to be deleted`,
        }
      );
    },

    async assertExists(pipelineId: string) {
      let last: Record<string, unknown> = {};
      await pollUntilTrue(
        async () => {
          try {
            const response = await esClient.ingest.getPipeline({ id: pipelineId });
            if (!(pipelineId in response)) {
              return false;
            }
            last = response as Record<string, unknown>;
            return true;
          } catch {
            return false;
          }
        },
        {
          timeoutMs: 40_000,
          intervalMs: 3000,
          label: `Wait for pipeline ${pipelineId} to exist`,
        }
      );
      return last;
    },
  };
}
