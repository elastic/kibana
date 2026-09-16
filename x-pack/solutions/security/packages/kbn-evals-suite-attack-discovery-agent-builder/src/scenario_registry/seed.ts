/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { HttpHandler } from '@kbn/core/public';
import { AD2_ALERTS_INDEX, AD2_SCENARIO_ALL_INDICES, AD2_SCENARIO_SEED_LABEL } from './constants';
import { buildAd2SeedPlan } from './registry';
import type { Ad2SeedProfile, Ad2SeedSummary } from './types';

export interface SeedAd2ScenarioProfileOptions {
  readonly profile?: Ad2SeedProfile;
  readonly scenarioKey?: string;
  readonly baseTime?: Date;
}

export const seedAd2ScenarioProfile = async (
  esClient: EsClient,
  fetch: HttpHandler,
  options: SeedAd2ScenarioProfileOptions = {}
): Promise<Ad2SeedSummary> => {
  const profile = options.profile ?? 'clean';
  const plan = buildAd2SeedPlan({
    profile,
    scenarioKey: options.scenarioKey,
    baseTime: options.baseTime,
  });

  await fetch('/api/detection_engine/index', { method: 'POST', version: '1' });

  const alertOperations = plan.alerts.flatMap((alert) => [
    { index: { _index: AD2_ALERTS_INDEX, _id: alert.id } },
    alert.source,
  ]);

  if (alertOperations.length > 0) {
    await esClient.bulk({ refresh: 'wait_for', operations: alertOperations });
  }

  const rawOperations = plan.rawEvents.flatMap((event) => [
    { index: { _index: event.index, _id: event.id } },
    event.source,
  ]);

  if (rawOperations.length > 0) {
    await esClient.bulk({ refresh: 'wait_for', operations: rawOperations });
  }

  return {
    profile,
    scenarioKeys: plan.scenarioKeys,
    alertCount: plan.alerts.length,
    rawEventCount: plan.rawEvents.length,
  };
};

export const cleanupAd2ScenarioProfile = async (esClient: EsClient): Promise<void> => {
  const query = { term: { 'labels.ad_portable_seed': AD2_SCENARIO_SEED_LABEL } };

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

export const countAd2ScenarioProfileDocuments = async (
  esClient: EsClient
): Promise<Record<string, number>> => {
  const counts: Record<string, number> = {};
  const query = { term: { 'labels.ad_portable_seed': AD2_SCENARIO_SEED_LABEL } };

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
