/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { BulkResponse } from '@elastic/elasticsearch/lib/api/types';
import type { HttpHandler } from '@kbn/core/public';
import { AD2_ALERTS_INDEX, AD2_SCENARIO_ALL_INDICES } from './constants';
import { buildAd2SeedPlan } from './registry';
import type { Ad2SeedProfile, Ad2SeedRunScope, Ad2SeedSummary } from './types';

export interface SeedAd2ScenarioProfileOptions {
  /**
   * This run's marker (`run_marker.ts`). Required: it is what the seeded
   * documents, the retrieval scope and the cleanup all name, so defaulting it
   * would let a run be scoped by accident.
   */
  readonly runMarker: string;
  readonly profile?: Ad2SeedProfile;
  readonly scenarioKey?: string;
  readonly baseTime?: Date;
}

/**
 * A bulk request resolves with HTTP 200 even when individual documents were
 * rejected, so a partial seed would otherwise surface as an off-by-N retrieval
 * score instead of a fixture failure.
 */
const assertBulkIndexSucceeded = (response: BulkResponse, label: string): void => {
  if (!response.errors) {
    return;
  }

  const failures = response.items
    .map((item) => item.index)
    .filter((indexResult) => indexResult?.error !== undefined)
    .map(
      (indexResult) =>
        `${indexResult?._id ?? 'unknown id'} (${indexResult?.error?.type}: ${
          indexResult?.error?.reason
        })`
    );

  throw new Error(
    `Seeding ${label} failed: ${failures.length} of ${
      response.items.length
    } documents were rejected: ${failures.slice(0, 5).join(', ')}${
      failures.length > 5 ? ` (+${failures.length - 5} more)` : ''
    }`
  );
};

export const seedAd2ScenarioProfile = async (
  esClient: EsClient,
  fetch: HttpHandler,
  options: SeedAd2ScenarioProfileOptions
): Promise<Ad2SeedSummary> => {
  const profile = options.profile ?? 'clean';
  const { runMarker } = options;
  const plan = buildAd2SeedPlan({
    profile,
    scenarioKey: options.scenarioKey,
    baseTime: options.baseTime,
    runMarker,
  });

  await fetch('/api/detection_engine/index', { method: 'POST', version: '1' });

  const alertOperations = plan.alerts.flatMap((alert) => [
    { index: { _index: AD2_ALERTS_INDEX, _id: alert.id } },
    alert.source,
  ]);

  if (alertOperations.length > 0) {
    const response = await esClient.bulk({ refresh: 'wait_for', operations: alertOperations });
    assertBulkIndexSucceeded(response, `the ${plan.alerts.length} seeded alerts`);
  }

  const rawOperations = plan.rawEvents.flatMap((event) => [
    { index: { _index: event.index, _id: event.id } },
    event.source,
  ]);

  if (rawOperations.length > 0) {
    const response = await esClient.bulk({ refresh: 'wait_for', operations: rawOperations });
    assertBulkIndexSucceeded(response, `the ${plan.rawEvents.length} seeded raw events`);
  }

  return {
    profile,
    runMarker,
    scenarioKeys: plan.scenarioKeys,
    alertCount: plan.alerts.length,
    rawEventCount: plan.rawEvents.length,
  };
};

/**
 * Deletes the documents THIS run seeded, and only those.
 *
 * The run marker is the predicate, and it can be: the ids, `tags` and this
 * label all carry it, so the documents a run wrote are the documents that name
 * it. A generation-wide predicate (`AD2_SCENARIO_SEED_LABEL` alone, or the ids
 * the run seeded) is not a substitute — the dense profile re-seeds the clean
 * profile's four chains verbatim, so the clean spec's `afterAll` would take the
 * dense run's four target chains, the population its dataset asserts, out from
 * under a run still in flight.
 */
export const cleanupAd2ScenarioProfile = async (
  esClient: EsClient,
  scope: Ad2SeedRunScope
): Promise<void> => {
  const query = { term: { 'labels.ad_portable_seed': scope.runMarker } };

  for (const index of AD2_SCENARIO_ALL_INDICES) {
    try {
      await esClient.deleteByQuery({
        index,
        query,
        conflicts: 'proceed',
        refresh: true,
      });
    } catch (error) {
      const statusCode =
        typeof error === 'object' && error !== null && 'statusCode' in error
          ? (error as { statusCode?: number }).statusCode
          : undefined;
      if (statusCode !== 404) {
        throw error;
      }
    }
  }
};

/**
 * How much of THIS run's population is in the index, per index.
 *
 * Scoped by the run marker rather than by the fixture generation, so it answers
 * "did my run's documents survive" — which is the question a leak check asks,
 * and the one a generation-wide count cannot answer (it cannot tell this run's
 * documents from a concurrent run's).
 */
export const countAd2ScenarioProfileDocuments = async (
  esClient: EsClient,
  scope: Ad2SeedRunScope
): Promise<Record<string, number>> => {
  const counts: Record<string, number> = {};
  const query = { term: { 'labels.ad_portable_seed': scope.runMarker } };

  for (const index of AD2_SCENARIO_ALL_INDICES) {
    try {
      const result = await esClient.count({ index, query });
      counts[index] = result.count;
    } catch {
      counts[index] = 0;
    }
  }

  return counts;
};
