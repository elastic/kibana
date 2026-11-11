/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  AD2_ALERTS_INDEX,
  AD2_SCENARIO_ALL_INDICES,
  buildAd2SeedPlan,
  getAd2ScenarioAlertIds,
} from './src/scenario_registry';
export { ad2SeedId } from './src/scenario_registry/ids';
export type { Ad2IndexedAlert, Ad2IndexedRawEvent } from './src/scenario_registry';
