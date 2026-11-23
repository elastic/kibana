/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import { OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED } from '@kbn/management-settings-ids';
import { installDiscoveryAgents } from '../../agent_builder/agents/discovery';
import type {
  SignificantEventsScheduledWorkflowsConfig,
  SignificantEventsScheduledWorkflowsService,
} from '../workflows/significant_events_scheduled_workflows';
import { setScheduledDiscoveryEnabled } from './set_scheduled_discovery_enabled';

jest.mock('../../agent_builder/agents/discovery', () => ({
  installDiscoveryAgents: jest.fn().mockResolvedValue(undefined),
}));

const installDiscoveryAgentsMock = installDiscoveryAgents as jest.MockedFunction<
  typeof installDiscoveryAgents
>;

const request = { spaceId: 'default' } as KibanaRequest;
const agentBuilder = { agents: { ensure: jest.fn() } } as unknown as AgentBuilderPluginStart;
const config: SignificantEventsScheduledWorkflowsConfig = {
  detectionIntervalMinutes: 10,
  detectionBucketIntervalMinutes: 1,
  detectionLookbackMinutes: 40,
  targetCoverageMinutes: 30,
  reviewIntervalMinutes: 10,
  discoveryBatchSize: 3,
  maxReviewPasses: 3,
  flakyRuleDetectionThreshold: 10,
  flakyRuleProbeAfterMinutes: 360,
  flakyRuleExemptSeverityScore: 80,
};

const setup = (previousEnabled: boolean) => {
  const calls: string[] = [];
  const uiSettingsClient = {
    get: jest.fn().mockResolvedValue(previousEnabled),
    set: jest.fn(async () => {
      calls.push('set');
    }),
  } as unknown as jest.Mocked<IUiSettingsClient>;
  const workflowService = {
    ensureWorkflow: jest.fn(async () => {
      calls.push('ensureWorkflow');
    }),
  } as unknown as jest.Mocked<SignificantEventsScheduledWorkflowsService>;
  const logger = { warn: jest.fn() } as unknown as jest.Mocked<Logger>;

  const run = (
    enabled: boolean,
    overrides: Partial<Parameters<typeof setScheduledDiscoveryEnabled>[0]> = {}
  ) =>
    setScheduledDiscoveryEnabled({
      uiSettingsClient,
      workflowService,
      agentBuilder,
      request,
      spaceId: request.spaceId,
      enabled,
      config,
      logger,
      ...overrides,
    });

  return { calls, logger, run, uiSettingsClient, workflowService };
};

describe('setScheduledDiscoveryEnabled', () => {
  beforeEach(() => {
    installDiscoveryAgentsMock.mockClear();
    installDiscoveryAgentsMock.mockImplementation(async () => {
      // recorded via the mock itself
    });
  });

  it('does nothing when the setting already has the target value', async () => {
    const { run, uiSettingsClient, workflowService } = setup(true);

    await run(true);

    expect(uiSettingsClient.set).not.toHaveBeenCalled();
    expect(installDiscoveryAgentsMock).not.toHaveBeenCalled();
    expect(workflowService.ensureWorkflow).not.toHaveBeenCalled();
  });

  it('writes the toggle, installs discovery agents, then reconciles workflows when enabling', async () => {
    const { calls, run, uiSettingsClient, workflowService } = setup(false);
    installDiscoveryAgentsMock.mockImplementation(async () => {
      calls.push('installDiscoveryAgents');
    });

    await run(true);

    expect(calls).toEqual(['set', 'installDiscoveryAgents', 'ensureWorkflow']);
    expect(uiSettingsClient.set).toHaveBeenCalledWith(
      OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED,
      true
    );
    expect(installDiscoveryAgentsMock).toHaveBeenCalledWith({
      agentBuilder,
      spaceId: request.spaceId,
    });
    expect(workflowService.ensureWorkflow).toHaveBeenCalledWith({
      enabled: true,
      request,
      spaceId: request.spaceId,
      config,
    });
  });

  it('refreshes workflows without rewriting an unchanged toggle', async () => {
    const { run, uiSettingsClient, workflowService } = setup(true);

    await run(true, { reconcileWhenUnchanged: true });

    expect(uiSettingsClient.set).not.toHaveBeenCalled();
    expect(installDiscoveryAgentsMock).toHaveBeenCalledWith({
      agentBuilder,
      spaceId: request.spaceId,
    });
    expect(workflowService.ensureWorkflow).toHaveBeenCalledWith({
      enabled: true,
      request,
      spaceId: request.spaceId,
      config,
    });
  });

  it('disables workflows without installing agents or draining when asked to skip the drain', async () => {
    const { run, workflowService } = setup(true);

    await run(false, { skipExecutionDrain: true });

    expect(installDiscoveryAgentsMock).not.toHaveBeenCalled();
    expect(workflowService.ensureWorkflow).toHaveBeenCalledWith({
      enabled: false,
      request,
      spaceId: request.spaceId,
      config,
      skipExecutionDrain: true,
    });
  });

  it('restores the toggle when workflow reconciliation fails', async () => {
    const { run, uiSettingsClient, workflowService } = setup(false);
    const error = new Error('workflow unavailable');
    workflowService.ensureWorkflow.mockRejectedValue(error);

    await expect(run(true)).rejects.toBe(error);

    expect(uiSettingsClient.set).toHaveBeenNthCalledWith(
      1,
      OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED,
      true
    );
    expect(uiSettingsClient.set).toHaveBeenNthCalledWith(
      2,
      OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED,
      false
    );
  });

  it('restores the toggle when Agent Builder is unavailable', async () => {
    const { logger, run, uiSettingsClient } = setup(false);
    const error = new Error(
      'Agent Builder is required to enable significant events scheduled discovery'
    );

    await expect(run(true, { agentBuilder: undefined })).rejects.toThrow(error.message);

    expect(installDiscoveryAgentsMock).not.toHaveBeenCalled();
    expect(uiSettingsClient.set).toHaveBeenNthCalledWith(
      2,
      OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED,
      false
    );
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('leaves an unchanged toggle in place when a config refresh fails', async () => {
    const { run, uiSettingsClient, workflowService } = setup(true);
    workflowService.ensureWorkflow.mockRejectedValue(new Error('workflow unavailable'));

    await expect(run(true, { reconcileWhenUnchanged: true })).rejects.toThrow(
      'workflow unavailable'
    );

    expect(uiSettingsClient.set).not.toHaveBeenCalled();
  });
});
