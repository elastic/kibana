/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'yaml';
import { getManagedWorkflowDefinition } from '@kbn/workflows/managed';
import { BATCH_ALERT_CAP, IN_FLIGHT_CEILING } from './constants';

const BATCH_WORKFLOW_ID = 'system-security-floor-alert-triage-batch';

interface ParsedBatch {
  settings: { concurrency: { max: number; 'queue-size': number } };
  triggers: Array<{
    type: string;
    inputs?: { properties: { alert_ids: { maxItems: number } } };
  }>;
}

const getBatch = (): ParsedBatch => {
  const definition = getManagedWorkflowDefinition(BATCH_WORKFLOW_ID);
  if (!definition || !('yaml' in definition) || !definition.yaml)
    throw new Error('Batch workflow is not registered');
  return parse(definition.yaml) as ParsedBatch;
};

describe('Alert Triage batch workflow vs the sweep planner', () => {
  it('runs `max` batches and queues the rest so that together they equal the in-flight ceiling', () => {
    const { max, 'queue-size': queueSize } = getBatch().settings.concurrency;

    // The sweep counts running and queued batches against the ceiling. If the YAML allowed more
    // than the ceiling the sweep's limit would be fiction; if it allowed fewer, started batches
    // would be skipped by a full queue.
    expect(max + queueSize).toBe(IN_FLIGHT_CEILING);
  });

  it('accepts as many alerts per batch as the planner puts in one', () => {
    const manual = getBatch().triggers.find(({ type }) => type === 'manual');

    expect(manual?.inputs?.properties.alert_ids.maxItems).toBe(BATCH_ALERT_CAP);
  });
});
