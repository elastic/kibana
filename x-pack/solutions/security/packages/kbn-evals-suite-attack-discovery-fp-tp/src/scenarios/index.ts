/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toRunMarker, uniquify, type FpTpWorld } from '../world';
import { encodedPowershellScenario } from './encoded_powershell';
import type { FpTpRegisteredExample, FpTpScenario } from './types';

/** Every scenario the eval runs. Add a scenario here to add its examples to the dataset. */
export const FP_TP_SCENARIOS: readonly FpTpScenario[] = [encodedPowershellScenario];

export const FP_TP_EXAMPLES: readonly FpTpRegisteredExample[] = FP_TP_SCENARIOS.flatMap(
  ({ key, examples }) => examples.map((example) => ({ ...example, scenarioKey: key }))
);

export const getFpTpScenario = (key: string): FpTpScenario => {
  const scenario = FP_TP_SCENARIOS.find((candidate) => candidate.key === key);
  if (!scenario) {
    throw new Error(
      `Unknown FP/TP scenario "${key}". Known: ${FP_TP_SCENARIOS.map((s) => s.key).join(', ')}`
    );
  }
  return scenario;
};

/**
 * Builds the documents one run of an example seeds. `suffix` must be unique per run
 * so repetitions and examples never share a document.
 */
export const buildFpTpExampleWorld = (exampleId: string, suffix: string): FpTpWorld => {
  const example = FP_TP_EXAMPLES.find(({ id }) => id === exampleId);
  if (!example) {
    throw new Error(`Unknown FP/TP example "${exampleId}"`);
  }
  const { sharedNames } = getFpTpScenario(example.scenarioKey);
  return uniquify(example.buildWorld(toRunMarker(suffix)), suffix, sharedNames);
};

export type {
  FpTpEvidenceState,
  FpTpExample,
  FpTpRegisteredExample,
  FpTpScenario,
  FpTpSituation,
} from './types';
