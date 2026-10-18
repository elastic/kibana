/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { esqlGenerationDataset } from '../dataset';
import { esqlFixtureDocumentRequests } from './documents';
import {
  enrichPolicyNamesInGoldQueries,
  esqlFixtureEnrichIndexWildcards,
  esqlFixtureEnrichPolicies,
  goldQueriesFromDataset,
} from './enrich';
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
 *
 * The same rule applies to the enrichment policies the gold queries
 * reference (see `./enrich.ts`): a gold whose `ENRICH` step resolves to
 * nothing is equally unexecutable, so the policies are installed here and
 * every gold's `ENRICH` target is asserted to resolve before the dataset
 * runs.
 */
export async function setupEsqlFixtures({
  esClient,
  log,
}: {
  esClient: EsClient;
  log: ToolingLog;
}): Promise<void> {
  const indexCreateRequests = [
    ...esqlFixtureIndicesCreateRequests,
    ...esqlFixtureEnrichPolicies.map((fixture) => fixture.sourceIndexCreateRequest),
  ];

  log.info('[esql-regression] creating fixture indices');

  await Promise.all(
    indexCreateRequests.map(async (request) => {
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

  const documentRequests = [
    ...esqlFixtureDocumentRequests,
    ...esqlFixtureEnrichPolicies.flatMap((fixture) =>
      fixture.sourceDocuments.map((document) => ({
        index: fixture.sourceIndexCreateRequest.index,
        document,
      }))
    ),
  ];

  log.info(
    `[esql-regression] indexing ${documentRequests.length} sample documents (APM fixtures + enrich lookups)`
  );

  for (const request of documentRequests) {
    try {
      await esClient.index({ ...request, refresh: 'wait_for' });
    } catch (err) {
      throw new Error(`[esql-regression] failed to index sample document into "${request.index}"`, {
        cause: err instanceof Error ? err : new Error(String(err)),
      });
    }
  }

  await esClient.indices.refresh({
    index: indexCreateRequests
      .map((req) => req.index)
      .concat(documentRequests.map((req) => req.index)),
  });

  await installEnrichPolicies({ esClient, log });
}

/**
 * Install and execute the enrichment policies the gold queries reference,
 * then prove each one resolves by running a probe query derived from the
 * policy itself.
 *
 * `enrich.putPolicy` alone is not enough: an unexecuted policy has no enrich
 * index, so `ENRICH` still fails — the probe is what makes "installed" mean
 * "usable". Any failure is fatal, because the alternative is a run whose
 * `ES|QL Result Equivalence` scores are decided by the fixture gap.
 */
async function installEnrichPolicies({
  esClient,
  log,
}: {
  esClient: EsClient;
  log: ToolingLog;
}): Promise<void> {
  const goldPolicies = enrichPolicyNamesInGoldQueries(
    goldQueriesFromDataset(esqlGenerationDataset)
  );
  const installedPolicies = new Set(esqlFixtureEnrichPolicies.map((fixture) => fixture.policyName));

  const missing = goldPolicies.filter((name) => !installedPolicies.has(name));
  if (missing.length > 0) {
    throw new Error(
      `[esql-regression] dataset gold queries reference enrich policies no fixture installs: ${missing.join(
        ', '
      )}. Add them to src/fixtures/enrich.ts — an unprovisioned policy makes the gold unexecutable on every model.`
    );
  }

  for (const fixture of esqlFixtureEnrichPolicies) {
    log.info(`[esql-regression] installing enrich policy ${fixture.policyName}`);

    try {
      await esClient.enrich.putPolicy({ name: fixture.policyName, match: fixture.policy });
      await esClient.enrich.executePolicy({
        name: fixture.policyName,
        wait_for_completion: true,
      });
    } catch (err) {
      throw new Error(`[esql-regression] failed to install enrich policy "${fixture.policyName}"`, {
        cause: err instanceof Error ? err : new Error(String(err)),
      });
    }
  }

  for (const fixture of esqlFixtureEnrichPolicies) {
    try {
      await esClient.esql.query({ query: fixture.probeQuery });
    } catch (err) {
      throw new Error(
        `[esql-regression] enrich policy "${fixture.policyName}" does not resolve on the cluster; gold queries that use it cannot execute. Probe query: ${fixture.probeQuery}`,
        { cause: err instanceof Error ? err : new Error(String(err)) }
      );
    }
  }

  log.info(
    `[esql-regression] ${esqlFixtureEnrichPolicies.length} enrich policies installed and verified`
  );
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
 *
 * The enrichment policies go first: deleting a policy removes its
 * `.enrich-*` index, and a policy left behind would leak into the next
 * run's cluster state (changing what a gold resolves to).
 */
export async function cleanupEsqlFixtures({
  esClient,
  log,
}: {
  esClient: EsClient;
  log: ToolingLog;
}): Promise<void> {
  log.info('[esql-regression] cleaning up fixture indices');

  for (const fixture of esqlFixtureEnrichPolicies) {
    try {
      await esClient.enrich.deletePolicy({ name: fixture.policyName }, { ignore: [404] });
      log.debug(`[esql-regression] deleted enrich policy: ${fixture.policyName}`);
    } catch (err) {
      log.warning(
        new Error(
          `[esql-regression] cleanup failed to delete enrich policy ${fixture.policyName} — continuing`,
          { cause: err instanceof Error ? err : new Error(String(err)) }
        )
      );
    }
  }

  const resolveResponses = await Promise.all(
    [...esqlFixtureIndexWildcards, ...esqlFixtureEnrichIndexWildcards].map(async (pattern) => {
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
