/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  AD2_ALERTS_INDEX,
  AD2_SCENARIO_ALL_INDICES,
  AD2_SCENARIO_ID_PREFIX,
  AD2_SCENARIO_RAW_INDICES,
  AD2_SCENARIO_SEED_LABEL,
} from './constants';

export { AD2_CLEAN_SCENARIO_KEYS, AD2_CLEAN_SCENARIOS } from './clean_scenarios';
export type { Ad2CleanScenarioKey } from './clean_scenarios';
export { AD2_FULL_ONLY_SCENARIO_KEYS, AD2_FULL_ONLY_SCENARIOS } from './full_scenarios';
export type { Ad2FullOnlyScenarioKey } from './full_scenarios';
export {
  FULL_PROFILE_BACKGROUND_ALERT_COUNT,
  FULL_PROFILE_EXPECTED_SIGNAL_ALERT_COUNT,
  FULL_PROFILE_LOUD_CLUSTER_ALERT_COUNT,
  buildBackgroundNoiseAlerts,
  buildLoudClusterAlerts,
  getBackgroundNoiseAlertIds,
  isNoiseAlertId,
  isNoiseScenarioKey,
} from './background_noise';

export {
  buildAlertDocument,
  buildRawEventDocuments,
  buildScenarioDocuments,
} from './build_documents';

export {
  AD2_FULL_SCENARIO_KEYS,
  buildAd2SeedPlan,
  getAd2Scenario,
  getAd2ScenarioAlertIds,
  listAd2ScenarioKeys,
} from './registry';
export type { Ad2FullScenarioKey } from './registry';

export {
  cleanupAd2ScenarioProfile,
  countAd2ScenarioProfileDocuments,
  seedAd2ScenarioProfile,
} from './seed';
export type { SeedAd2ScenarioProfileOptions } from './seed';

export { createAd2RunMarker, getAd2RunMarker } from './run_marker';

export type {
  Ad2IndexedAlert,
  Ad2IndexedRawEvent,
  Ad2ScenarioDefinition,
  Ad2ScenarioStep,
  Ad2SeedPlan,
  Ad2SeedProfile,
  Ad2SeedRunScope,
  Ad2SeedSummary,
} from './types';
