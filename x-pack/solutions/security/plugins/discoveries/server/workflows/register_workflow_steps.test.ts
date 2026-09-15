/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import type { IRuleDataClient } from '@kbn/rule-registry-plugin/server';
import { registerWorkflowSteps } from './register_workflow_steps';

describe('registerWorkflowSteps', () => {
  const mockLogger = loggerMock.create();
  const mockRegisterStepDefinition = jest.fn();
  const mockWorkflowsExtensions = {
    registerStepDefinition: mockRegisterStepDefinition,
  } as unknown as WorkflowsExtensionsServerPluginSetup;
  const mockAdhocAttackDiscoveryDataClient = {} as IRuleDataClient;
  const mockGetBooleanValue = jest.fn();
  const mockGetStartServices = jest.fn();
  const mockGetEventLogger = jest.fn();
  const mockGetEventLogIndex = jest.fn().mockResolvedValue('.kibana-event-log-*');
  const defaultArgs = {
    adhocAttackDiscoveryDataClient: mockAdhocAttackDiscoveryDataClient,
    connectorTimeout: 60000,
    getEventLogIndex: mockGetEventLogIndex,
    getEventLogger: mockGetEventLogger,
    getStartServices: mockGetStartServices,
    logger: mockLogger,
  } as const;

  // Steps are registered as feature-flag-gated loaders. This resolves every
  // captured loader and returns the ids of the definitions that were actually
  // registered (loaders resolving to `undefined` are skipped).
  const resolveRegisteredStepIds = async (): Promise<string[]> => {
    const loaders = mockRegisterStepDefinition.mock.calls.map(
      ([loader]) => loader as () => Promise<{ id: string } | undefined>
    );
    const definitions = await Promise.all(loaders.map((loader) => loader()));
    return definitions
      .filter((definition): definition is { id: string } => definition != null)
      .map((definition) => definition.id);
  };

  beforeEach(() => {
    jest.resetAllMocks();
    mockGetEventLogIndex.mockResolvedValue('.kibana-event-log-*');
    mockGetBooleanValue.mockResolvedValue(true);
    mockGetStartServices.mockResolvedValue({
      coreStart: { featureFlags: { getBooleanValue: mockGetBooleanValue } },
      pluginsStart: {},
    });
  });

  it('registers default alert retrieval step definition when the feature flag is on', async () => {
    registerWorkflowSteps(mockWorkflowsExtensions, defaultArgs);

    expect(await resolveRegisteredStepIds()).toContain(
      'security.attack-discovery.defaultAlertRetrieval'
    );
  });

  it('registers default validation step definition when the feature flag is on', async () => {
    registerWorkflowSteps(mockWorkflowsExtensions, defaultArgs);

    expect(await resolveRegisteredStepIds()).toContain(
      'security.attack-discovery.defaultValidation'
    );
  });

  it('registers generate step definition when the feature flag is on', async () => {
    registerWorkflowSteps(mockWorkflowsExtensions, defaultArgs);

    expect(await resolveRegisteredStepIds()).toContain('security.attack-discovery.generate');
  });

  it('registers persist discoveries step definition when the feature flag is on', async () => {
    registerWorkflowSteps(mockWorkflowsExtensions, defaultArgs);

    expect(await resolveRegisteredStepIds()).toContain(
      'security.attack-discovery.persistDiscoveries'
    );
  });

  it('registers all five step definitions', () => {
    registerWorkflowSteps(mockWorkflowsExtensions, defaultArgs);

    expect(mockRegisterStepDefinition).toHaveBeenCalledTimes(5);
  });

  it('registers loaders (functions), not definitions, with workflowsExtensions', () => {
    registerWorkflowSteps(mockWorkflowsExtensions, defaultArgs);

    expect(mockRegisterStepDefinition).toHaveBeenCalledWith(expect.any(Function));
  });

  it('skips registration of every step when the feature flag is off', async () => {
    mockGetBooleanValue.mockResolvedValue(false);

    registerWorkflowSteps(mockWorkflowsExtensions, defaultArgs);

    expect(await resolveRegisteredStepIds()).toHaveLength(0);
  });

  it('returns StepRegistrationResult with all registeredSteps and no failedSteps when all succeed', () => {
    const result = registerWorkflowSteps(mockWorkflowsExtensions, defaultArgs);

    expect(result.registeredSteps).toHaveLength(5);
    expect(result.failedSteps).toHaveLength(0);
  });

  it('continues registering remaining steps when one step fails', () => {
    let callCount = 0;
    mockRegisterStepDefinition.mockImplementation(() => {
      callCount += 1;
      if (callCount === 1) {
        throw new Error('simulated registration failure');
      }
    });

    const result = registerWorkflowSteps(mockWorkflowsExtensions, defaultArgs);

    expect(mockRegisterStepDefinition).toHaveBeenCalledTimes(5);
    expect(result.registeredSteps).toHaveLength(4);
    expect(result.failedSteps).toHaveLength(1);
  });

  it('includes the error message and step id in failedSteps when a step fails', () => {
    mockRegisterStepDefinition.mockImplementationOnce(() => {
      throw new Error('registration error');
    });

    const result = registerWorkflowSteps(mockWorkflowsExtensions, defaultArgs);

    expect(result.failedSteps[0]).toMatchObject({
      error: 'registration error',
      id: expect.any(String),
    });
  });

  it('logs ERROR for each failed step', () => {
    mockRegisterStepDefinition.mockImplementationOnce(() => {
      throw new Error('registration error');
    });

    registerWorkflowSteps(mockWorkflowsExtensions, defaultArgs);

    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('registration error'));
  });

  it('returns all failedSteps and no registeredSteps when all steps fail', () => {
    mockRegisterStepDefinition.mockImplementation(() => {
      throw new Error('all steps failed');
    });

    const result = registerWorkflowSteps(mockWorkflowsExtensions, defaultArgs);

    expect(result.registeredSteps).toHaveLength(0);
    expect(result.failedSteps).toHaveLength(5);
  });

  it('logs debug messages for each registered step', () => {
    registerWorkflowSteps(mockWorkflowsExtensions, defaultArgs);

    expect(mockLogger.debug).toHaveBeenCalledWith(expect.any(Function));
  });

  it('logs info when all steps succeed', () => {
    registerWorkflowSteps(mockWorkflowsExtensions, defaultArgs);

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('All workflow steps registered successfully')
    );
  });

  it('logs warn instead of info when some steps fail', () => {
    mockRegisterStepDefinition.mockImplementationOnce(() => {
      throw new Error('step failure');
    });

    registerWorkflowSteps(mockWorkflowsExtensions, defaultArgs);

    expect(mockLogger.info).not.toHaveBeenCalledWith(
      expect.stringContaining('All workflow steps registered successfully')
    );
    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('failure'));
  });

  it('passes connectorTimeout to generate step definition', async () => {
    const connectorTimeout = 120000;

    registerWorkflowSteps(mockWorkflowsExtensions, { ...defaultArgs, connectorTimeout });

    expect(await resolveRegisteredStepIds()).toContain('security.attack-discovery.generate');
  });

  it('passes langSmithApiKey to generate step definition', async () => {
    const langSmithApiKey = 'test-api-key';

    registerWorkflowSteps(mockWorkflowsExtensions, { ...defaultArgs, langSmithApiKey });

    expect(await resolveRegisteredStepIds()).toContain('security.attack-discovery.generate');
  });

  it('passes langSmithProject to generate step definition', async () => {
    const langSmithProject = 'test-project';

    registerWorkflowSteps(mockWorkflowsExtensions, { ...defaultArgs, langSmithProject });

    expect(await resolveRegisteredStepIds()).toContain('security.attack-discovery.generate');
  });
});
