/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import type { SeedLedger } from './seed_ledger';
import {
  RAW_EVENTS_INDEX_PATTERN,
  RAW_EVENTS_TEMPLATE,
  SCHEDULED_ATTACK_DISCOVERY_INDEX_PREFIX,
  SEED_ATTACK_DISCOVERY_INDEX_PREFIX,
  SEED_CITED_ALERTS_INDEX_PREFIX,
  seedSpaceId,
  type EsClientLike,
} from './workflow_task';

export interface TeardownResult {
  /** Human-readable failures; teardown keeps going after each one. */
  readonly failures: string[];
}

/**
 * Removes exactly what one run seeded, driven by the {@link SeedLedger}: the persisted
 * discoveries (scheduled + ad-hoc copies), the cited alerts, the raw events and derived
 * entity docs stamped with this run's ids, the investigation conversations, and the
 * broad `logs-endpoint.events.*-default` data-stream template the seeder installed.
 *
 * Every step is id-scoped (`ids` / `labels.fp_tp_fixture` terms), so foreign documents in
 * the same indices survive. A failing step is recorded and the remaining steps still run:
 * one stuck delete must not leave the template (which changes ingestion mappings for every
 * later suite) behind.
 */
export const teardownSeededData = async ({
  esClient,
  fetch,
  log,
  ledger,
}: {
  esClient: EsClientLike;
  fetch: HttpHandler;
  log: ToolingLog;
  ledger: SeedLedger;
}): Promise<TeardownResult> => {
  const failures: string[] = [];
  const attempt = async (label: string, step: () => Promise<unknown>) => {
    try {
      await step();
    } catch (error) {
      const message = `${label}: ${error instanceof Error ? error.message : String(error)}`;
      failures.push(message);
      log.warning(`Seed teardown step failed (${message})`);
    }
  };
  const deleteIds = (index: string, ids: Set<string>) =>
    ids.size === 0
      ? undefined
      : attempt(`delete ${ids.size} doc(s) from ${index}`, () =>
          esClient.deleteByQuery({
            index,
            query: { ids: { values: [...ids] } },
            refresh: true,
            conflicts: 'proceed',
          })
        );

  const space = seedSpaceId();
  await deleteIds(`${SCHEDULED_ATTACK_DISCOVERY_INDEX_PREFIX}${space}`, ledger.attackDiscoveryIds);
  await deleteIds(`${SEED_ATTACK_DISCOVERY_INDEX_PREFIX}${space}`, ledger.attackDiscoveryIds);
  await deleteIds(`${SEED_CITED_ALERTS_INDEX_PREFIX}${space}`, ledger.alertIds);
  await deleteIds(`entities-latest-${space}`, ledger.entityIds);

  if (ledger.eventOwnerIds.size > 0) {
    await attempt(`delete raw events from ${RAW_EVENTS_INDEX_PATTERN}`, () =>
      esClient.deleteByQuery({
        index: RAW_EVENTS_INDEX_PATTERN,
        query: { terms: { 'labels.fp_tp_fixture': [...ledger.eventOwnerIds] } },
        refresh: true,
        conflicts: 'proceed',
      })
    );
  }

  for (const conversationId of ledger.conversationIds) {
    await attempt(`delete conversation ${conversationId}`, () =>
      fetch(`/api/agent_builder/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: { 'kbn-xsrf': 'true', 'elastic-api-version': '2023-10-31' },
      })
    );
  }

  // Last, and unconditional on the steps above: the template outlives the run otherwise
  // and keeps overriding the mappings of every `logs-endpoint.events.*` stream created later.
  if (ledger.rawEventsTemplateInstalled) {
    await attempt(`delete index template ${RAW_EVENTS_TEMPLATE}`, async () => {
      if (!esClient.indices) {
        throw new Error('esClient.indices is unavailable');
      }
      await esClient.indices.deleteIndexTemplate({ name: RAW_EVENTS_TEMPLATE });
    });
  }

  log.info(
    `Seed teardown: ${ledger.attackDiscoveryIds.size} discoveries, ${ledger.alertIds.size} alerts, ` +
      `${ledger.eventOwnerIds.size} event owner(s), ${ledger.entityIds.size} entities, ` +
      `${ledger.conversationIds.size} conversations, template ${
        ledger.rawEventsTemplateInstalled ? 'removed' : 'untouched'
      }; ${failures.length} failure(s)`
  );
  return { failures };
};
