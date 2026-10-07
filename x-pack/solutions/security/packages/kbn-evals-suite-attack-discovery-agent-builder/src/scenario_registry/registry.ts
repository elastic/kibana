/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AD2_CLEAN_SCENARIO_KEYS,
  AD2_CLEAN_SCENARIOS,
  type Ad2CleanScenarioKey,
} from './clean_scenarios';
import { AD2_DENSE_SCENARIO_KEYS, AD2_DENSE_SCENARIOS } from './dense_scenarios';
import { ad2ScenarioAlertId } from './ids';
import { buildScenarioDocuments } from './build_documents';
import { getAd2RunMarker } from './run_marker';
import type { Ad2ScenarioDefinition, Ad2SeedPlan, Ad2SeedProfile } from './types';

export const listAd2ScenarioKeys = (profile: Ad2SeedProfile = 'clean'): readonly string[] => {
  if (profile === 'dense') {
    return AD2_DENSE_SCENARIO_KEYS;
  }
  return AD2_CLEAN_SCENARIO_KEYS;
};

export const getAd2Scenario = (
  scenarioKey: string,
  profile: Ad2SeedProfile = 'clean'
): Ad2ScenarioDefinition | undefined => {
  if (profile === 'dense') {
    return AD2_DENSE_SCENARIOS[scenarioKey];
  }
  return AD2_CLEAN_SCENARIOS[scenarioKey as Ad2CleanScenarioKey];
};

export const buildAd2SeedPlan = ({
  profile = 'clean',
  scenarioKey,
  baseTime = new Date(),
  runMarker = getAd2RunMarker(),
}: {
  profile?: Ad2SeedProfile;
  scenarioKey?: string;
  baseTime?: Date;
  /**
   * Defaults to the process marker, so a plan and the reference ids resolved
   * from it (`getAd2ScenarioAlertIds`) agree without either side naming the
   * marker. A spec that owns a run passes its own.
   */
  runMarker?: string;
} = {}): Ad2SeedPlan => {
  const scenarioKeys = scenarioKey ? [scenarioKey] : listAd2ScenarioKeys(profile);
  const alerts = [];
  const rawEvents = [];

  for (const key of scenarioKeys) {
    const scenario = getAd2Scenario(key, profile);
    if (!scenario) {
      throw new Error(`Unknown AD2 scenario key "${key}" for profile "${profile}"`);
    }
    const built = buildScenarioDocuments(scenario, baseTime, runMarker);
    alerts.push(...built.alerts);
    rawEvents.push(...built.rawEvents);
  }

  return { profile, runMarker, scenarioKeys, alerts, rawEvents };
};

/**
 * The reference `alertIds` the datasets attach and the Rubric evaluator scores
 * against. It resolves through the same function the seeder writes ids with, and
 * defaults to the same run marker the seeder defaults to, so the reference
 * cannot drift from the population — and, with a run marker of its own, cannot
 * name another run's documents either.
 */
export const getAd2ScenarioAlertIds = (
  scenarioKey: string,
  profile: Ad2SeedProfile = 'clean',
  runMarker: string = getAd2RunMarker()
): readonly string[] => {
  const scenario = getAd2Scenario(scenarioKey, profile);
  if (!scenario) {
    return [];
  }
  return scenario.steps.map((_, index) => ad2ScenarioAlertId(runMarker, scenarioKey, index + 1));
};
