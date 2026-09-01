/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  THREAT_REPORTS_INDEX,
  THREAT_INTEL_SOURCES_INDEX,
  DIAMOND_SUMMARY_EMBEDDING_INFERENCE_ID,
} from '../../../common/threat_intel';
import { installIndexTemplates } from './index_templates';
import { seedDefaultSources, type SeedDefaultSourcesResult } from './seed_default_sources';

export interface BootstrapThreatIntelResult {
  seed: SeedDefaultSourcesResult;
}

// Bootstrap runs on the plugin boot path that the one-time readiness promise
// (and the routes gated on it) waits for, so these bound how long we retry
// transient Elasticsearch errors before giving up. 8 attempts is 7 × 2s ≈ 14s of
// backoff per operation, and template install and seeding each get their own
// budget, so cumulative boot delay can exceed that. The window is sized to ride
// out ES still starting or preconfigured endpoints/templates propagating on a
// fresh cluster, while staying bounded so a persistent failure surfaces (rejects
// readiness) instead of blocking boot indefinitely.
const BOOTSTRAP_RETRY_ATTEMPTS = 8;
const BOOTSTRAP_RETRY_DELAY_MS = 2_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const withElasticsearchRetry = async <T>(
  operation: () => Promise<T>,
  log: Logger,
  label: string
): Promise<T> => {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= BOOTSTRAP_RETRY_ATTEMPTS; attempt += 1) {
    try {
      return await operation();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt === BOOTSTRAP_RETRY_ATTEMPTS) {
        break;
      }
      log.warn(
        `${label} failed (attempt ${attempt}/${BOOTSTRAP_RETRY_ATTEMPTS}): ${lastError.message}; retrying`
      );
      await sleep(BOOTSTRAP_RETRY_DELAY_MS);
    }
  }

  throw lastError ?? new Error(`${label} failed`);
};

const REQUIRED_REPORT_SEMANTIC_FIELDS = ['title', 'body_text'] as const;

/** Verifies the effective endpoints used by required report-content fields. */
const checkReportSemanticTextEndpoints = async (
  esClient: ElasticsearchClient,
  log: Logger
): Promise<void> => {
  const mappings = await esClient.indices.getFieldMapping({
    index: THREAT_REPORTS_INDEX,
    fields: REQUIRED_REPORT_SEMANTIC_FIELDS.map((field) => `content.${field}`),
    include_defaults: true,
  });
  const fieldMappings = mappings[THREAT_REPORTS_INDEX]?.mappings;
  const endpointIds = new Set<string>();

  for (const field of REQUIRED_REPORT_SEMANTIC_FIELDS) {
    const fullName = `content.${field}`;
    const fieldMapping = fieldMappings?.[fullName];
    const mapping = fieldMapping?.mapping[field] ?? fieldMapping?.mapping[fullName];
    if (mapping?.type !== 'semantic_text' || !mapping.inference_id) {
      throw new Error(
        `Required report field content.${field} did not resolve to a semantic_text inference endpoint`
      );
    }
    endpointIds.add(mapping.inference_id);
  }

  for (const endpointId of endpointIds) {
    await esClient.inference.get({ inference_id: endpointId });
    log.debug(`Report semantic_text endpoint ${endpointId} verified present`);
  }
};

/**
 * Checks that the text-embedding endpoint backing the `semantic_text` Diamond
 * summary fields is present. Non-fatal: Elasticsearch validates `inference_id`
 * when a document is indexed rather than at template PUT, so a missing endpoint
 * only surfaces when `extract_diamond` first writes a `summary`.
 *
 * This is not the model that performs Diamond extraction — that one is resolved
 * per request from the `threat_intel_diamond` inference feature.
 */
const checkDiamondSummaryEmbeddingEndpoint = async (
  esClient: ElasticsearchClient,
  log: Logger
): Promise<void> => {
  try {
    await esClient.inference.get({ inference_id: DIAMOND_SUMMARY_EMBEDDING_INFERENCE_ID });
    log.debug(
      `Diamond summary embedding endpoint ${DIAMOND_SUMMARY_EMBEDDING_INFERENCE_ID} verified present`
    );
  } catch (err) {
    const status = err instanceof errors.ResponseError ? err.statusCode : undefined;
    if (status === 404) {
      log.warn(
        `The Diamond summary fields are mapped as semantic_text against ` +
          `"${DIAMOND_SUMMARY_EMBEDDING_INFERENCE_ID}", which this cluster does not have. ` +
          `Reports still index; only extracted.diamond.*.summary writes will fail. ` +
          `Dot-prefixed inference ids are preconfigured by Elasticsearch and cannot be created ` +
          `by hand, so a deployment without it needs those fields remapped to an endpoint ` +
          `that exists.`
      );
    } else {
      log.warn(
        `Could not verify the Diamond summary embedding endpoint: ${(err as Error).message}. ` +
          `This may be a transient error; re-check on next restart.`
      );
    }
  }
};

/**
 * Seeds the default feed catalog into `.kibana-threat-intel-sources`.
 *
 * Runs on every boot so missing sources are created and code-owned fields on
 * existing entries are reconciled without overwriting operator enablement.
 */
const seedThreatIntelCatalog = async ({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<BootstrapThreatIntelResult> => {
  const log = logger.get('bootstrap');

  const seed = await withElasticsearchRetry(
    async () => {
      const result = await seedDefaultSources({ esClient, logger });
      // Partial failures have to retry within this boot. `seedDefaultSources`
      // catches per-item and bulk errors and reports them as `failed`, so returning
      // here would treat a partial seed as success and leave the rest of the starter
      // catalog missing until the next restart. Retrying is safe because
      // already-created entries come back as `skipped` (conflicts are idempotent).
      if (result.failed > 0) {
        throw new Error(
          `${result.failed} of ${result.total} default sources failed to reconcile ` +
            `(${result.created} created, ${result.updated} updated, ${result.skipped} unchanged)`
        );
      }
      return result;
    },
    log,
    'Threat intelligence default source reconciliation'
  );

  const summary =
    `Threat intelligence source reconciliation finished: ${seed.created} created, ` +
    `${seed.updated} updated, ${seed.skipped} unchanged, ${seed.failed} failed ` +
    `(${seed.total} catalog entries)`;
  if (seed.created > 0 || seed.updated > 0 || seed.failed > 0) {
    log.info(summary);
  } else {
    log.debug(summary);
  }

  // Diagnostic only, so it must not be able to fail bootstrap. Templates, migrations,
  // and seeding have all succeeded by this point, and this is the one-time readiness
  // promise: letting a transient count timeout reject it would leave the pipeline
  // unready for the lifetime of the process, over a log line. The real setup work is
  // what `withElasticsearchRetry` guards.
  try {
    const catalogCount = await esClient.count(
      { index: THREAT_INTEL_SOURCES_INDEX },
      { ignore: [404] }
    );
    if (catalogCount.count === 0 && seed.created === 0) {
      log.error(
        'Threat intelligence source reconciliation completed but `.kibana-threat-intel-sources` is still empty'
      );
    }
  } catch (err) {
    log.debug(`Post-seed catalog count check failed, ignoring: ${(err as Error).message}`);
  }

  return { seed };
};

/**
 * Idempotent entry point called on every plugin boot.
 *
 * Index templates and schema migrations (installIndexTemplates) run on EVERY
 * boot — they are unconditional PUT operations that are safe to re-run and
 * must run on each restart so version bumps and migrateExisting* patches reach
 * populated clusters. Skipping them when the catalog is non-empty was the bug
 * that caused ALL schema migrations (v14–v19) to silently miss any cluster
 * that had already been seeded.
 *
 * Source catalog reconciliation also runs on every boot. It recreates missing
 * defaults and updates catalog-owned fields while preserving each operator-owned
 * `enabled` value and original `created_at`.
 */
export const ensureThreatIntelBootstrap = async ({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<BootstrapThreatIntelResult | undefined> => {
  const log = logger.get('bootstrap');

  // Always install templates and run migration patches — idempotent and safe
  // to re-run; skipping them on a populated cluster silently breaks schema
  // upgrades (the bug that kept templates at v18 on every non-fresh boot).
  await withElasticsearchRetry(
    () => installIndexTemplates({ esClient, logger }),
    log,
    'Threat intelligence index template installation'
  );

  await withElasticsearchRetry(
    () => checkReportSemanticTextEndpoints(esClient, log),
    log,
    'Threat intelligence report semantic_text endpoint validation'
  );

  // Non-blocking check — see `checkDiamondSummaryEmbeddingEndpoint` doc comment.
  await checkDiamondSummaryEmbeddingEndpoint(esClient, log);

  // Reconcile on every boot so partial writes retry and catalog corrections reach
  // existing installations. Deleting a fixed source does not stick; disabling it is
  // the supported operator control.
  return seedThreatIntelCatalog({ esClient, logger });
};
