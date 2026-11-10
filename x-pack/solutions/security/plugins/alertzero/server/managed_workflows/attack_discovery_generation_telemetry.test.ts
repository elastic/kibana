/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'yaml';
import {
  ALERTZERO_AD_GENERATION_TELEMETRY_PLUGIN_ID,
  ALERTZERO_INFERENCE_PARENT_FEATURE_ID,
} from '@kbn/alertzero-common';
import {
  ALERTZERO_ATTACK_DISCOVERY_BATCHED_GENERATION_WORKFLOW_ID,
  getManagedWorkflowDefinition,
} from '@kbn/workflows/managed';

interface YamlStep {
  name: string;
  steps?: YamlStep[];
  type: string;
  with?: Record<string, unknown>;
}

const findStep = (steps: YamlStep[], name: string): YamlStep | undefined => {
  for (const step of steps) {
    if (step.name === name) return step;
    const nested = step.steps ? findStep(step.steps, name) : undefined;
    if (nested) return nested;
  }
  return undefined;
};

describe('AlertZero batched Attack Discovery generation telemetry', () => {
  // The YAML cannot import @kbn/alertzero-common, so it carries literals. This pins them to the
  // constants the rest of AlertZero uses for the same rollup.
  const definition = getManagedWorkflowDefinition(
    ALERTZERO_ATTACK_DISCOVERY_BATCHED_GENERATION_WORKFLOW_ID
  );
  const yaml = definition && 'yaml' in definition ? definition.yaml : undefined;
  const runBatch = yaml ? findStep(parse(yaml).steps as YamlStep[], 'run_batch') : undefined;

  it('attributes the generation call to the AlertZero Attack Discovery plugin id', () => {
    expect(runBatch?.type).toBe('security.attack-discovery.run');
    expect(runBatch?.with?.plugin_id).toBe(ALERTZERO_AD_GENERATION_TELEMETRY_PLUGIN_ID);
  });

  it('rolls the cost up under the AlertZero parent feature', () => {
    expect(runBatch?.with?.aggregate_by).toBe(ALERTZERO_INFERENCE_PARENT_FEATURE_ID);
  });
});
