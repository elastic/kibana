/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import {
  SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
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
// These tests keep that YAML in sync with the streams constants.
const definition = getManagedWorkflowDefinition(
  SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID
);

const getWorkflowYaml = (): string => {
  if (!definition || !('yaml' in definition) || typeof definition.yaml !== 'string') {
    throw new Error('Continuous onboarding managed workflow definition is missing inline YAML');
  }
  return definition.yaml;
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

  it('uses the correct maxScheduledStreams input', () => {
    assertYamlContains(
      `name: maxScheduledStreams\n        type: number\n        default: ${MAX_SCHEDULED_STREAMS}`
    );
  });

  it('uses the correct lookbackHours input', () => {
    assertYamlContains(`name: lookbackHours\n        type: number\n        default: 24`);
  });

  it('declares consts that match the input defaults', () => {
    assertYamlContains(`maxScheduledStreams: ${MAX_SCHEDULED_STREAMS}`);
    assertYamlContains('lookbackHours: 24');
  });

  it('declares extractionIntervalHours as an optional input without default', () => {
    assertYamlContains('name: extractionIntervalHours\n        type: number\n        description:');
    expect(WORKFLOW_YAML).not.toMatch(
      /- name: extractionIntervalHours\n\s+type: number\n\s+default:/m
    );
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

  it('starts onboarding via workflow.executeAsync for the managed onboarding workflow', () => {
    assertYamlContains('type: workflow.executeAsync');
    assertYamlContains("workflow-id: 'system-streams-ki-onboarding'");
  });

  it('runs both features identification and queries generation', () => {
    assertYamlContains('skipFeatures: false');
    assertYamlContains('skipQueries: false');
  });

  it('converts the eligibility sampling window from ISO to epoch ms', () => {
    assertYamlContains(
      `featuresStart: "\${{ steps.get_eligible.output.timeRange.from | date: '%s' | times: 1000 }}"`
    );
    assertYamlContains(
      `featuresEnd: "\${{ steps.get_eligible.output.timeRange.to | date: '%s' | times: 1000 }}"`
    );
  });

  it('polls the onboarding status endpoint to await completion', () => {
    assertYamlContains('onboarding/_status');
  });
});

describe('createContinuousOnboardingWorkflowService', () => {
  const request = {} as KibanaRequest;
  const spaceId = 'space-a';
  const workflowDocumentId = `${SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID}-${spaceId}`;
  const managedWorkflowOptions = { spaceId, workflowIdSuffix: spaceId };

  let logger: Logger;
  let getWorkflow: jest.Mock;
  // The legacy unsuffixed document is read through the management API, the space document
  // through the request-scoped client.
  let getLegacyWorkflow: jest.Mock;
  let managementApi: jest.Mocked<WorkflowsServerPluginSetup['management']>;
  let managedWorkflowsClient: { install: jest.Mock; uninstall: jest.Mock };

  beforeEach(() => {
    logger = {
      get: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as unknown as Logger;
    (logger.get as jest.Mock).mockReturnValue(logger);
    getWorkflow = jest.fn();
    getLegacyWorkflow = jest.fn().mockResolvedValue(null);
    managementApi = {
      getClient: jest.fn(() => ({ getWorkflow })),
      getWorkflow: getLegacyWorkflow,
      updateWorkflow: jest.fn().mockResolvedValue(undefined),
      getWorkflowExecutions: jest.fn().mockResolvedValue({ results: [], total: 0 }),
      cancelWorkflowExecution: jest.fn().mockResolvedValue(undefined),
      cancelAllActiveWorkflowExecutions: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<WorkflowsServerPluginSetup['management']>;
    managedWorkflowsClient = {
      install: jest.fn().mockResolvedValue(undefined),
      uninstall: jest.fn().mockResolvedValue(undefined),
    };
  });

  const createService = () =>
    createContinuousOnboardingWorkflowService({
      logger,
      managementApi,
      streamsKIsOnboardingClient: {
        cancelAllRunning: jest.fn().mockResolvedValue(0),
      } as unknown as SignificantEventsKIsOnboardingClient,
      getManagedWorkflowsClient: jest.fn().mockResolvedValue(managedWorkflowsClient),
    });

  it('installs and enables the space document when turned on', async () => {
    getWorkflow.mockResolvedValue({ enabled: false });

    await createService().ensureWorkflow({ enabled: true, request, spaceId });

    expect(managedWorkflowsClient.install).toHaveBeenCalledWith(
      SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
      managedWorkflowOptions
    );
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
    getWorkflow.mockResolvedValue({ enabled: true });
    managementApi.updateWorkflow.mockRejectedValue(new Error('update failed'));

    await expect(
      createService().ensureWorkflow({ enabled: false, request, spaceId })
    ).rejects.toThrow('update failed');
  });

  it('disables and drains the space document but keeps it when turned off', async () => {
    getWorkflow.mockResolvedValue({ enabled: true });
    (managementApi.getWorkflowExecutions as jest.Mock)
      .mockResolvedValueOnce({ results: [{ id: 'exec-1' }], total: 1 })
      .mockResolvedValue({ results: [], total: 0 });

    await createService().ensureWorkflow({ enabled: false, request, spaceId });

    expect(managementApi.updateWorkflow).toHaveBeenCalledWith(
      workflowDocumentId,
      { enabled: false },
      spaceId,
      request
    );
    expect(managementApi.cancelWorkflowExecution).toHaveBeenCalledWith('exec-1', spaceId, request);
    expect(managedWorkflowsClient.install).not.toHaveBeenCalled();
    expect(managedWorkflowsClient.uninstall).not.toHaveBeenCalled();
  });

  it('leaves the legacy default-space document alone outside the default space', async () => {
    getWorkflow.mockResolvedValue({ enabled: false });

    await createService().ensureWorkflow({ enabled: true, request, spaceId });

    expect(getLegacyWorkflow).not.toHaveBeenCalled();
    expect(managedWorkflowsClient.uninstall).not.toHaveBeenCalled();
  });

  describe('in the default space', () => {
    const defaultSpaceId = 'default';

    it.each([
      { label: 'on', enabled: true, current: false },
      { label: 'off', enabled: false, current: true },
    ])(
      'stops and removes the legacy unsuffixed document when turned $label',
      async ({ enabled, current }) => {
        getWorkflow.mockResolvedValue({ enabled: current });
        getLegacyWorkflow.mockResolvedValue({ enabled: true });

        await createService().ensureWorkflow({ enabled, request, spaceId: defaultSpaceId });

        expect(managementApi.updateWorkflow).toHaveBeenCalledWith(
          SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
          { enabled: false },
          defaultSpaceId,
          request
        );
        expect(managementApi.cancelAllActiveWorkflowExecutions).toHaveBeenCalledWith(
          SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
          defaultSpaceId,
          request
        );
        expect(managedWorkflowsClient.uninstall).toHaveBeenCalledWith(
          SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
          { spaceId: defaultSpaceId }
        );
        expect(managementApi.updateWorkflow).toHaveBeenCalledWith(
          `${SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID}-${defaultSpaceId}`,
          { enabled },
          defaultSpaceId,
          request
        );
      }
    );

    it('skips the removal when the legacy document is already gone', async () => {
      getWorkflow.mockResolvedValue({ enabled: false });

      await createService().ensureWorkflow({ enabled: true, request, spaceId: defaultSpaceId });

      expect(managementApi.cancelAllActiveWorkflowExecutions).not.toHaveBeenCalled();
      expect(managedWorkflowsClient.uninstall).not.toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('enables the space document with a warning when the legacy removal fails', async () => {
      getWorkflow.mockResolvedValue({ enabled: false });
      getLegacyWorkflow.mockResolvedValue({ enabled: false });
      managedWorkflowsClient.uninstall.mockRejectedValue(new Error('uninstall failed'));

      await createService().ensureWorkflow({ enabled: true, request, spaceId: defaultSpaceId });

      expect(managementApi.updateWorkflow).toHaveBeenCalledWith(
        `${SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID}-${defaultSpaceId}`,
        { enabled: true },
        defaultSpaceId,
        request
      );
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('uninstall failed'));
    });
  });
});
