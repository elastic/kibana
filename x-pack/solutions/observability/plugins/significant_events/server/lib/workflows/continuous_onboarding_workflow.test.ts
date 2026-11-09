/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import {
  NIGHTSHIFT_BOUND_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
  getManagedWorkflowDefinition,
} from '@kbn/workflows/managed';
import {
  COORDINATOR_INTERVAL_MINUTES,
  MAX_SCHEDULED_STREAMS,
  POLL_DELAY_SECONDS,
} from '../../../common/constants';
import { createContinuousOnboardingWorkflowService } from './continuous_onboarding_workflow';
import type { SignificantEventsKIsOnboardingClient } from './onboarding_workflow_client';

// The continuous onboarding workflow YAML lives in the managed workflow
// definition (kbn-workflows/managed/definitions/significant_events/knowledge_indicators/continuous_onboarding.yaml).
// These tests keep that YAML in sync with the constants in common/constants.ts.
const definition = getManagedWorkflowDefinition(
  NIGHTSHIFT_BOUND_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID
);

const getWorkflowYaml = (): string => {
  if (!definition || !('yamlTemplate' in definition) || !definition.yamlTemplate) {
    throw new Error('Continuous onboarding managed workflow definition is missing its template');
  }
  return definition.yamlTemplate({ serviceAccountId: 'sa-1' });
};

const WORKFLOW_YAML = getWorkflowYaml();

const assertYamlContains = (expected: string) => {
  expect(WORKFLOW_YAML).toContain(expected);
};

describe('continuous_onboarding.yaml stays in sync with constants', () => {
  it('is registered as a restorable managed workflow', () => {
    expect(definition?.management.enablement).toBe('restorable');
  });

  it('is disabled by default so the user setting controls enablement', () => {
    assertYamlContains('enabled: false');
  });

  it('uses the correct timeout', () => {
    assertYamlContains(`timeout: '${COORDINATOR_INTERVAL_MINUTES - 1}m'`);
  });

  it('uses the correct coordinator interval', () => {
    assertYamlContains(`every: '${COORDINATOR_INTERVAL_MINUTES}m'`);
  });

  it('declares consts that match the input defaults', () => {
    assertYamlContains(`maxScheduledStreams: ${MAX_SCHEDULED_STREAMS}`);
    assertYamlContains('lookbackHours: 24');
  });

  it('does not declare the removed excludedStreamPatterns input', () => {
    expect(WORKFLOW_YAML).not.toContain('excludedStreamPatterns');
  });

  it('uses the correct poll delay duration', () => {
    assertYamlContains(`duration: '${POLL_DELAY_SECONDS}s'`);
  });

  it('calls the eligibility endpoint with the correct query params', () => {
    assertYamlContains('_extraction/_eligible');
    assertYamlContains(
      'maxScheduledStreams={{ inputs.maxScheduledStreams | default: consts.maxScheduledStreams }}'
    );
    assertYamlContains('lookbackHours={{ inputs.lookbackHours | default: consts.lookbackHours }}');
    assertYamlContains(
      '{%- if inputs.extractionIntervalHours %}&extractionIntervalHours={{ inputs.extractionIntervalHours }}{% endif -%}'
    );
  });

  it('starts onboarding through the Kibana route, since the bound onboarding workflow refuses workflow-step callers', () => {
    assertYamlContains('onboarding/_execute');
    expect(WORKFLOW_YAML).not.toContain('workflow.executeAsync');
  });

  it('runs as the bound service account', () => {
    assertYamlContains('run_as: "sa-1"');
  });

  it('passes the eligibility sampling window to the route', () => {
    assertYamlContains("from: '${{ steps.get_eligible.output.timeRange.from }}'");
    assertYamlContains("to: '${{ steps.get_eligible.output.timeRange.to }}'");
  });

  it('polls the onboarding status endpoint to await completion', () => {
    assertYamlContains('onboarding/_status');
  });
});

describe('createContinuousOnboardingWorkflowService', () => {
  const request = {} as KibanaRequest;
  const spaceId = 'default';
  const workflowDocumentId = `${NIGHTSHIFT_BOUND_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID}-${spaceId}`;

  let logger: Logger;
  let getWorkflow: jest.Mock;
  let managementApi: jest.Mocked<WorkflowsServerPluginSetup['management']>;
  let installer: { install: jest.Mock; disable: jest.Mock };
  let managedWorkflowsClient: { install: jest.Mock };

  beforeEach(() => {
    logger = {
      get: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as unknown as Logger;
    (logger.get as jest.Mock).mockReturnValue(logger);
    getWorkflow = jest.fn();
    managementApi = {
      getClient: jest.fn(() => ({ getWorkflow })),
      getWorkflow: jest.fn(),
      updateWorkflow: jest.fn().mockResolvedValue(undefined),
      getWorkflowExecutions: jest.fn().mockResolvedValue({ results: [], total: 0 }),
      cancelWorkflowExecution: jest.fn().mockResolvedValue(undefined),
      cancelAllActiveWorkflowExecutions: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<WorkflowsServerPluginSetup['management']>;
    managedWorkflowsClient = {
      install: jest.fn().mockResolvedValue(undefined),
    };
    installer = {
      install: jest.fn().mockResolvedValue(undefined),
      disable: jest.fn().mockResolvedValue(true),
    };
  });

  const createService = () =>
    createContinuousOnboardingWorkflowService({
      logger,
      managementApi,
      streamsKIsOnboardingClient: {
        cancelAllRunning: jest.fn().mockResolvedValue(0),
      } as unknown as SignificantEventsKIsOnboardingClient,
      installer,
      getManagedWorkflowsClient: jest.fn().mockResolvedValue(managedWorkflowsClient),
    });

  // Enabling installs a workflow that then runs, and Nightshift only runs in the default space.
  it('installs nothing when turned on outside the default space', async () => {
    getWorkflow.mockResolvedValue({ enabled: false });

    await createService().ensureWorkflow({ enabled: true, request, spaceId: 'marketing' });

    expect(managedWorkflowsClient.install).not.toHaveBeenCalled();
    expect(managementApi.updateWorkflow).not.toHaveBeenCalled();
  });

  it('installs and enables the space document when turned on', async () => {
    getWorkflow.mockResolvedValue({ enabled: false });

    await createService().ensureWorkflow({ enabled: true, request, spaceId });

    expect(installer.install).toHaveBeenCalledWith({
      request,
      spaceId,
      workflowId: NIGHTSHIFT_BOUND_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
    });
    expect(getWorkflow).toHaveBeenCalledWith(workflowDocumentId, spaceId);
    expect(managementApi.updateWorkflow).toHaveBeenCalledWith(
      workflowDocumentId,
      { enabled: true },
      spaceId,
      request
    );
  });

  it('throws when turned on and the document is missing after install', async () => {
    getWorkflow.mockResolvedValue(undefined);

    await expect(
      createService().ensureWorkflow({ enabled: true, request, spaceId })
    ).rejects.toThrow(
      `Managed continuous onboarding workflow ${workflowDocumentId} is not installed yet`
    );
    expect(managementApi.updateWorkflow).not.toHaveBeenCalled();
  });

  it('throws when disabling fails', async () => {
    installer.disable.mockRejectedValue(new Error('disable failed'));

    await expect(
      createService().ensureWorkflow({ enabled: false, request, spaceId })
    ).rejects.toThrow('disable failed');
  });

  it('disables and drains the space document but keeps it when turned off', async () => {
    getWorkflow.mockResolvedValue({ enabled: true });
    (managementApi.getWorkflowExecutions as jest.Mock)
      .mockResolvedValueOnce({ results: [{ id: 'exec-1' }], total: 1 })
      .mockResolvedValue({ results: [], total: 0 });

    await createService().ensureWorkflow({ enabled: false, request, spaceId });

    // Through the owner: a plain update of a bound workflow needs `manage_security`.
    expect(installer.disable).toHaveBeenCalledWith({
      spaceId,
      workflowId: NIGHTSHIFT_BOUND_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
    });
    expect(managementApi.updateWorkflow).not.toHaveBeenCalled();
    expect(managementApi.cancelWorkflowExecution).toHaveBeenCalledWith('exec-1', spaceId, request);
    expect(installer.install).not.toHaveBeenCalled();
  });

  it('can disable future schedules without draining executions', async () => {
    getWorkflow.mockResolvedValue({ enabled: true });

    await createService().ensureWorkflow({
      enabled: false,
      request,
      spaceId,
      skipExecutionDrain: true,
    });

    // Through the owner: a plain update of a bound workflow needs `manage_security`.
    expect(installer.disable).toHaveBeenCalledWith({
      spaceId,
      workflowId: NIGHTSHIFT_BOUND_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
    });
    expect(managementApi.updateWorkflow).not.toHaveBeenCalled();
    expect(managementApi.getWorkflowExecutions).not.toHaveBeenCalled();
  });
});
