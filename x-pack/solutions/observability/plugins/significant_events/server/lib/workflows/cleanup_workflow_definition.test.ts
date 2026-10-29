/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  NIGHTSHIFT_BOUND_CLEANUP_WORKFLOW_ID,
  getManagedWorkflowDefinition,
} from '@kbn/workflows/managed';

// The cleanup workflow YAML lives in the managed Significant Events definition, which the space's
// setup installs bound to the detection engine service account.
// These tests keep that YAML in sync with the significant_events constants.
const definition = getManagedWorkflowDefinition(NIGHTSHIFT_BOUND_CLEANUP_WORKFLOW_ID);

const getWorkflowYaml = (): string => {
  if (!definition || !('yamlTemplate' in definition) || !definition.yamlTemplate) {
    throw new Error('Significant Events cleanup workflow definition is missing its YAML template');
  }
  return definition.yamlTemplate({ serviceAccountId: 'service-account-id' });
};

const WORKFLOW_YAML = getWorkflowYaml();

const assertYamlContains = (expected: string) => {
  expect(WORKFLOW_YAML).toContain(expected);
};

describe('cleanup.yaml managed workflow definition', () => {
  it('is registered as a dynamic, restorable managed workflow', () => {
    expect(definition?.management).toEqual({
      lifecycle: 'dynamic',
      versionStrategy: 'auto',
      enablement: 'restorable',
    });
  });

  it('is disabled by default so the space setup controls enablement', () => {
    assertYamlContains('enabled: false');
  });

  it('runs as the service account it is installed with', () => {
    assertYamlContains('run_as: "service-account-id"');
  });

  it('drops overlapping runs via a single-instance concurrency key', () => {
    assertYamlContains('key: significant-events-cleanup');
    assertYamlContains('strategy: drop');
    assertYamlContains('max: 1');
  });

  it('only cleans stale events in the workflow execution space', () => {
    assertYamlContains("name: 'Significant Events Cleanup'");
    assertYamlContains('/s/{{ workflow.spaceId }}/internal/significant_events/events/_cleanup');
    expect(WORKFLOW_YAML).not.toContain('_streams_with_indicators');
    expect(WORKFLOW_YAML).not.toContain('knowledge_indicators/_reconcile');
  });
});
