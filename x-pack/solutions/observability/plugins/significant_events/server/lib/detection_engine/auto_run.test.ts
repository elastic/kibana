/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { autoRunWorkflowId, autoRunWorkflowYaml, setAutoRun } from './auto_run';
import type { EngineStorage } from './storage';

const REQUEST = {} as KibanaRequest;

function createStorage() {
  return {
    putState: jest.fn().mockResolvedValue(undefined),
    appendActivity: jest.fn().mockResolvedValue(undefined),
  } as unknown as EngineStorage & {
    putState: jest.Mock;
    appendActivity: jest.Mock;
  };
}

function createManagement(existing: unknown) {
  return {
    getWorkflow: jest.fn().mockResolvedValue(existing),
    createWorkflow: jest.fn().mockResolvedValue({}),
    updateWorkflow: jest.fn().mockResolvedValue({}),
  } as unknown as WorkflowsServerPluginSetup['management'] & {
    getWorkflow: jest.Mock;
    createWorkflow: jest.Mock;
    updateWorkflow: jest.Mock;
  };
}

describe('autoRunWorkflowId', () => {
  it('keeps only characters workflow ids allow', () => {
    expect(autoRunWorkflowId('Team_A')).toBe('detection-engine-prototype-autorun-team-a');
  });
});

describe('autoRunWorkflowYaml', () => {
  it('runs every minute and calls the run route of its own space', () => {
    const yaml = autoRunWorkflowYaml();

    expect(yaml).toContain('every: "1m"');
    expect(yaml).toContain(
      'path: "/s/{{ variables.spaceId }}/internal/significant_events/detection_engine/_run"'
    );
  });
});

describe('setAutoRun', () => {
  it('creates the workflow the first time it is turned on', async () => {
    const management = createManagement(null);
    const storage = createStorage();

    const state = await setAutoRun({
      management,
      request: REQUEST,
      spaceId: 'default',
      storage,
      enabled: true,
    });

    expect(management.createWorkflow).toHaveBeenCalledWith(
      { id: 'detection-engine-prototype-autorun-default', yaml: autoRunWorkflowYaml() },
      'default',
      REQUEST
    );
    expect(state.enabled).toBe(true);
    expect(storage.putState).toHaveBeenCalledWith('auto_run', state);
  });

  it('re-enables an existing workflow with the current definition', async () => {
    const management = createManagement({ id: 'existing' });

    await setAutoRun({
      management,
      request: REQUEST,
      spaceId: 'default',
      storage: createStorage(),
      enabled: true,
    });

    expect(management.updateWorkflow).toHaveBeenCalledWith(
      'detection-engine-prototype-autorun-default',
      { yaml: autoRunWorkflowYaml(), enabled: true },
      'default',
      REQUEST
    );
    expect(management.createWorkflow).not.toHaveBeenCalled();
  });

  it('turns off by sending only the flag, never the definition', async () => {
    const management = createManagement({ id: 'existing' });

    const state = await setAutoRun({
      management,
      request: REQUEST,
      spaceId: 'default',
      storage: createStorage(),
      enabled: false,
    });

    expect(management.updateWorkflow).toHaveBeenCalledWith(
      'detection-engine-prototype-autorun-default',
      { enabled: false },
      'default',
      REQUEST
    );
    expect(state.enabled).toBe(false);
  });

  it('records why it cannot schedule when workflows are unavailable', async () => {
    const state = await setAutoRun({
      management: undefined,
      request: REQUEST,
      spaceId: 'default',
      storage: createStorage(),
      enabled: true,
    });

    expect(state.enabled).toBe(false);
    expect(state.error).toBe(
      'Workflows are not available in this deployment, so auto-run cannot be scheduled.'
    );
  });
});
