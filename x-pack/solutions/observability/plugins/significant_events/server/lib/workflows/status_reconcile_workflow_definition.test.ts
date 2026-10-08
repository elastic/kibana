/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SIGNIFICANT_EVENTS_STATUS_RECONCILE_WORKFLOW_ID,
  getManagedWorkflowDefinition,
} from '@kbn/workflows/managed';

const definition = getManagedWorkflowDefinition(SIGNIFICANT_EVENTS_STATUS_RECONCILE_WORKFLOW_ID);

const getWorkflowYaml = (): string => {
  if (!definition || !('yaml' in definition) || typeof definition.yaml !== 'string') {
    throw new Error('Significant Events status workflow definition is missing inline YAML');
  }
  return definition.yaml;
};

const WORKFLOW_YAML = getWorkflowYaml();

describe('status_reconcile.yaml managed workflow definition', () => {
  it('is a dynamic, restorable managed workflow, like the cleanup workflow', () => {
    expect(definition?.management).toEqual({
      lifecycle: 'dynamic',
      versionStrategy: 'auto',
      enablement: 'restorable',
    });
  });

  it('is disabled by default so the bootstrap controls enablement', () => {
    expect(WORKFLOW_YAML).toContain('enabled: false');
  });

  it('drops overlapping runs via a single-instance concurrency key', () => {
    expect(WORKFLOW_YAML).toContain('key: significant-events-status-reconcile');
    expect(WORKFLOW_YAML).toContain('strategy: drop');
    expect(WORKFLOW_YAML).toContain('max: 1');
  });

  it('reconciles in the execution space with a window equal to its schedule', () => {
    expect(WORKFLOW_YAML).toContain(
      '/s/{{ workflow.spaceId }}/internal/significant_events/events/_reconcile_status'
    );
    expect(WORKFLOW_YAML).toContain("every: '15m'");
    expect(WORKFLOW_YAML).toContain('windowMinutes: 15');
  });

  it('makes no agent call', () => {
    expect(WORKFLOW_YAML).not.toContain('ai.agent');
    expect(WORKFLOW_YAML).not.toContain('workflow.execute');
  });
});
