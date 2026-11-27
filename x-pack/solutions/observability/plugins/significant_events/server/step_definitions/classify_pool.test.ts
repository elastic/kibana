/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'yaml';
import {
  SIGNIFICANT_EVENTS_DISCOVERY_WORKFLOW_ID,
  getManagedWorkflowDefinition,
} from '@kbn/workflows/managed';
import { MAX_CLASSIFIED_ROWS } from './classify_decide_row';

interface DiscoveryWorkflow {
  triggers: Array<{ inputs?: { properties?: Record<string, { maximum?: number }> } }>;
  steps: Array<{ name: string; with?: { params?: unknown[] } }>;
}

const discovery = (): DiscoveryWorkflow => {
  const definition = getManagedWorkflowDefinition(SIGNIFICANT_EVENTS_DISCOVERY_WORKFLOW_ID);
  if (!definition || !('yaml' in definition) || typeof definition.yaml !== 'string') {
    throw new Error('Discovery managed workflow definition is missing inline YAML');
  }
  return parse(definition.yaml);
};

// The pool the managed workflow reads is written as a number in the YAML, which cannot import the
// classifier's constant. These tests tie the two together from the side that can import both.
describe('the detection pool of the discovery workflow', () => {
  it('is as large as the rows the classifier reads, so no row reaches it as over_cap', () => {
    const getDetections = discovery().steps.find(({ name }) => name === 'get_detections');

    expect(getDetections?.with?.params?.[0]).toBe(MAX_CLASSIFIED_ROWS);
  });

  it('is at least as large as the agent batch limit allows', () => {
    const inputs = discovery().triggers[0].inputs?.properties;

    expect(inputs?.detectionBatchMax?.maximum).toBeLessThanOrEqual(MAX_CLASSIFIED_ROWS);
  });
});
