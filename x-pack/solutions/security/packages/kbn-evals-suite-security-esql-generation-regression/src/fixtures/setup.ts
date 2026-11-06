/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { esqlFixtureDocumentRequests } from './documents';
import { esqlFixtureIndexWildcards, esqlFixtureIndicesCreateRequests } from './indices';

/**
 * Create the regression-suite fixture indices and seed the APM document
 * fixtures so the dataset's gold queries actually have something to
 * execute against.
 *
 * Mirrors the LangSmith-era `PrepareIndicesForAssistantGraphEvaluations`
 * loader from `x-pack/solutions/security/plugins/elastic_assistant/server/routes/evaluate/prepare_indices_for_evaluations/graph_type/assistant/`,
 * minus the multi-environment / random-date hydration: the dataset's gold
 * queries only reference bare wildcards, so we materialise one concrete
 * index per template (see `./indices.ts`).
 *
 * Fail-fast on errors. The previous behaviour ("don't fail evals if
 * fixture setup fails") was load-bearing for the suite's bottom line —
 * without these indices the `ES|QL Execution Validity` and
 * `ES|QL Result Equivalence` evaluators score 0 for every example
 * (verified against a fresh Scout cluster: 28/31 gold-query failures were
 * `verification_exception` from missing indices). Surfacing the failure
 * here lets CI fail loudly instead of silently regressing to a fully
 * non-executable suite.
 */
export async function setupEsqlFixtures({
  esClient,
  log,
}: {
  esClient: EsClient;
  log: ToolingLog;
}): Promise<void> {
  log.info('[esql-regression] creating fixture indices');

  await Promise.all(
    esqlFixtureIndicesCreateRequests.map(async (request) => {
      try {
        await esClient.indices.create(request);
      } catch (err) {
        const cause = err as { meta?: { body?: { error?: { type?: string } } } };
        if (cause?.meta?.body?.error?.type === 'resource_already_exists_exception') {
          log.debug(`[esql-regression] index already exists, skipping: ${request.index}`);
          return;
        }
        throw new Error(`[esql-regression] failed to create index "${request.index}"`, {
          cause: err instanceof Error ? err : new Error(String(err)),
        });
      }
    })
  );

  log.info(
    `[esql-regression] indexing ${esqlFixtureDocumentRequests.length} sample documents (APM fixtures)`
  );

  for (const request of esqlFixtureDocumentRequests) {
    try {
      await esClient.index({ ...request, refresh: 'wait_for' });
    } catch (err) {
      throw new Error(`[esql-regression] failed to index sample document into "${request.index}"`, {
        cause: err instanceof Error ? err : new Error(String(err)),
      });
    }
  }

  await esClient.indices.refresh({
    index: esqlFixtureIndicesCreateRequests
      .map((req) => req.index)
      .concat(esqlFixtureDocumentRequests.map((req) => req.index)),
  });
}

/**
 * Delete every concrete or aliased index that any fixture file could have
 * created during this run. Resolves the configured wildcard patterns
 * (`logs-production.evaluations.*`, `traces-apm-*`, …) to concrete index
 * and data-stream names first, then deletes by exact name. Scout clusters
 * boot with `action.destructive_requires_name=true`, which rejects
 * wildcard deletes outright, so the resolve-then-delete pattern is
 * required — mirrors the legacy `PrepareIndicesForAssistantGraphEvaluations.cleanup`
 * loop.
 *
 * Tolerates missing indices (`ignore_unavailable: true` on resolve) so a
 * partially-completed setup doesn't cascade into a fixture leak on the
 * next run.
 */
export async function cleanupEsqlFixtures({
  esClient,
  log,
}: {
  esClient: EsClient;
  log: ToolingLog;
}): Promise<void> {
  log.info('[esql-regression] cleaning up fixture indices');

  const resolveResponses = await Promise.all(
    esqlFixtureIndexWildcards.map(async (pattern) => {
      try {
        return await esClient.indices.resolveIndex({
          name: pattern,
          expand_wildcards: 'open',
          ignore_unavailable: true,
          allow_no_indices: true,
        });
      } catch (err) {
        log.warning(
          new Error(
            `[esql-regression] cleanup resolve failed for pattern "${pattern}" — skipping`,
            {
              cause: err instanceof Error ? err : new Error(String(err)),
            }
          )
        );
        return undefined;
      }
    })
  );

  const indicesToDelete = Array.from(
    new Set(
      resolveResponses.flatMap((response) => response?.indices ?? []).map((index) => index.name)
    )
  );

  const dataStreamsToDelete = Array.from(
    new Set(
      resolveResponses
        .flatMap((response) => response?.data_streams ?? [])
        .map((dataStream) => dataStream.name)
    )
  );

  if (indicesToDelete.length > 0) {
    try {
      await esClient.indices.delete({ index: indicesToDelete });
      log.debug(`[esql-regression] deleted indices: ${indicesToDelete.join(', ')}`);
    } catch (err) {
      log.warning(
        new Error(
          `[esql-regression] cleanup failed to delete indices ${indicesToDelete.join(
            ', '
          )} — continuing`,
          { cause: err instanceof Error ? err : new Error(String(err)) }
        )
      );
    }
  }

  if (dataStreamsToDelete.length > 0) {
    try {
      await esClient.indices.deleteDataStream({ name: dataStreamsToDelete });
      log.debug(`[esql-regression] deleted data streams: ${dataStreamsToDelete.join(', ')}`);
    } catch (err) {
      log.warning(
        new Error(
          `[esql-regression] cleanup failed to delete data streams ${dataStreamsToDelete.join(
            ', '
          )} — continuing`,
          { cause: err instanceof Error ? err : new Error(String(err)) }
        )
      );
    }
  }
}
