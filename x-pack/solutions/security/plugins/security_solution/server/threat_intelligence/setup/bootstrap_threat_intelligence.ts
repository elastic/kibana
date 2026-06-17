/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { THREAT_INTEL_SOURCES_INDEX } from '../../../common/threat_intelligence/hub';
import { installIndexTemplates } from './index_templates';
import { seedDefaultSources, type SeedDefaultSourcesResult } from './seed_default_sources';

export type BootstrapThreatIntelligenceResult = {
  seed: SeedDefaultSourcesResult;
};

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

/**
 * Installs plugin-owned index templates / indices, then seeds the default feed
 * catalog into `.kibana-threat-intel-sources`.
 *
 * Invoked from `setupThreatIntelligence` via `core.getStartServices()` once core
 * and Elasticsearch are available. Retries transient cluster errors instead of
 * leaving an empty catalog when `start()` races a cold Elasticsearch process.
 */
export const bootstrapThreatIntelligence = async ({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<BootstrapThreatIntelligenceResult> => {
  const log = logger.get('bootstrap');

  log.info('Starting threat intelligence bootstrap (index templates + default sources)');

  await withElasticsearchRetry(
    () => installIndexTemplates({ esClient, logger }),
    log,
    'Threat intelligence index template installation'
  );

  const seed = await withElasticsearchRetry(
    () => seedDefaultSources({ esClient, logger }),
    log,
    'Threat intelligence default source seeding'
  );

  log.info(
    `Threat intelligence bootstrap finished: ${seed.created} sources created, ` +
      `${seed.skipped} already present, ${seed.failed} failed (${seed.total} catalog entries)`
  );

  if (seed.failed > 0) {
    log.warn(
      `Threat intelligence default-source seeding had ${seed.failed} failure(s); ` +
        'check earlier warn logs for per-source errors'
    );
  }

  const catalogCount = await esClient.count({ index: THREAT_INTEL_SOURCES_INDEX }, { ignore: [404] });
  if (catalogCount.count === 0 && seed.created === 0) {
    log.error(
      'Threat intelligence bootstrap completed but `.kibana-threat-intel-sources` is still empty'
    );
  }

  return { seed };
};

/**
 * Idempotent guard used on setup and start. Re-runs bootstrap when the sources
 * catalog index is missing or empty (e.g. Elasticsearch data was wiped while
 * Kibana stayed up, or the first bootstrap attempt failed during a cold start).
 */
export const ensureThreatIntelligenceBootstrap = async ({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<BootstrapThreatIntelligenceResult | undefined> => {
  const log = logger.get('bootstrap');

  const catalogCount = await esClient.count(
    { index: THREAT_INTEL_SOURCES_INDEX },
    { ignore: [404] }
  );

  if (catalogCount.count > 0) {
    log.debug(
      `Threat intelligence catalog already has ${catalogCount.count} sources; skipping bootstrap`
    );
    return undefined;
  }

  log.info(
    'Threat intelligence catalog is empty; running bootstrap (index templates + default sources)'
  );

  return bootstrapThreatIntelligence({ esClient, logger });
};
