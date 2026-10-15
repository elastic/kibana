/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { EngineAutoRunState } from '../../../common/detection_engine/types';
import type { EngineStorage } from './storage';

type WorkflowsManagementApi = WorkflowsServerPluginSetup['management'];

/** One workflow per space; ids allow lowercase letters, digits and hyphens only. */
export function autoRunWorkflowId(spaceId: string): string {
  return `detection-engine-prototype-autorun-${spaceId.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`;
}

/**
 * The workflow that runs the engine every minute in its space. A workflow, not a browser timer,
 * so detection keeps going with nobody on the page; it runs with the credentials of whoever turned
 * it on, like the plugin's other scheduled workflows.
 */
export function autoRunWorkflowYaml(): string {
  return `version: "1"
name: "Detection engine prototype: auto-run"
description: "Evaluates every completed minute with the detection engine prototype, so detection keeps running when nobody has the page open. Turned on and off from the Detection engine tab."
enabled: true
tags:
  - observability
  - significant-events
  - detection-engine-prototype
settings:
  timeout: "5m"
  concurrency:
    key: "detection-engine-prototype-autorun"
    strategy: drop
    max: 1
triggers:
  - type: scheduled
    with:
      every: "1m"
  - type: manual
steps:
  - name: set_space
    type: data.set
    with:
      spaceId: "{{ workflow.spaceId }}"
  - name: run_engine
    type: kibana.request
    with:
      method: POST
      path: "/s/{{ variables.spaceId }}/internal/significant_events/detection_engine/_run"
      headers:
        x-elastic-internal-origin: "kibana"
      body: {}
`;
}

/** Turns the server-side schedule on or off and records the choice. */
export async function setAutoRun({
  management,
  request,
  spaceId,
  storage,
  enabled,
}: {
  management: WorkflowsManagementApi | undefined;
  request: KibanaRequest;
  spaceId: string;
  storage: EngineStorage;
  enabled: boolean;
}): Promise<EngineAutoRunState> {
  const workflowId = autoRunWorkflowId(spaceId);
  const changedAt = new Date().toISOString();
  if (!management) {
    const state: EngineAutoRunState = {
      enabled: false,
      workflow_id: workflowId,
      changed_at: changedAt,
      error: 'Workflows are not available in this deployment, so auto-run cannot be scheduled.',
    };
    await storage.putState('auto_run', state);
    return state;
  }

  const existing = await management.getWorkflow(workflowId, spaceId, request);
  if (existing) {
    // Turning on re-renders the definition, so a schedule created by an older build picks up
    // changes. Turning off sends only the flag: the definition itself says `enabled: true`.
    await management.updateWorkflow(
      workflowId,
      enabled ? { yaml: autoRunWorkflowYaml(), enabled: true } : { enabled: false },
      spaceId,
      request
    );
  } else if (enabled) {
    await management.createWorkflow(
      { id: workflowId, yaml: autoRunWorkflowYaml() },
      spaceId,
      request
    );
  }

  const state: EngineAutoRunState = { enabled, workflow_id: workflowId, changed_at: changedAt };
  await storage.putState('auto_run', state);
  await storage.appendActivity([
    {
      step: 'operator',
      action: enabled ? 'auto_run_on' : 'auto_run_off',
      message: enabled
        ? `Auto-run on: the workflow "${workflowId}" now evaluates every minute on the server, with or without the page open.`
        : `Auto-run off: the workflow "${workflowId}" is disabled; the engine only runs when asked.`,
    },
  ]);
  return state;
}
