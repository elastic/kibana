/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import { isAllowedBuiltinSkill } from '@kbn/agent-builder-server/allow_lists';

import { alertRetrievalBuilderSkill } from './alert_retrieval_builder';
import { ATTACK_DISCOVERY_GENERATOR_SKILL_ID } from './attack_discovery_generator';
import { registerSkills } from './register_skills';
import type { WorkflowExecutionLookup } from './tools/get_attack_discovery_status_tool';
import type { WorkflowFetcher } from './tools/get_workflow_health_check_tool';

describe('registerSkills', () => {
  const mockLogger = loggerMock.create();
  const mockAgentBuilder = agentBuilderMocks.createSetup();

  const mockGetEventLogIndex = async () => 'event-log-*';
  const mockExecutionLookup: WorkflowExecutionLookup = {
    getWorkflowExecution: jest.fn(),
  };

  const baseOptions = {
    getEventLogIndex: mockGetEventLogIndex,
    workflowExecutionLookup: mockExecutionLookup,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('completes without error when agentBuilder is available', async () => {
    await expect(
      registerSkills(mockAgentBuilder, mockLogger, baseOptions)
    ).resolves.toBeUndefined();
  });

  it('registers the alert retrieval builder skill', async () => {
    await registerSkills(mockAgentBuilder, mockLogger, baseOptions);

    expect(mockAgentBuilder.skills.register).toHaveBeenCalledWith(alertRetrievalBuilderSkill);
  });

  it('registers the attack discovery generator skill when status-tool deps are provided', async () => {
    await registerSkills(mockAgentBuilder, mockLogger, baseOptions);

    expect(mockAgentBuilder.skills.register).toHaveBeenCalledWith(
      expect.objectContaining({
        id: ATTACK_DISCOVERY_GENERATOR_SKILL_ID,
      })
    );
  });

  it('does not register the attack discovery generator skill when getEventLogIndex is missing', async () => {
    await registerSkills(mockAgentBuilder, mockLogger, {
      workflowExecutionLookup: mockExecutionLookup,
    });

    expect(mockAgentBuilder.skills.register).not.toHaveBeenCalledWith(
      expect.objectContaining({
        id: ATTACK_DISCOVERY_GENERATOR_SKILL_ID,
      })
    );
  });

  it('does not register the attack discovery generator skill when workflowExecutionLookup is missing', async () => {
    await registerSkills(mockAgentBuilder, mockLogger, {
      getEventLogIndex: mockGetEventLogIndex,
    });

    expect(mockAgentBuilder.skills.register).not.toHaveBeenCalledWith(
      expect.objectContaining({
        id: ATTACK_DISCOVERY_GENERATOR_SKILL_ID,
      })
    );
  });

  it('logs a debug message on completion', async () => {
    await registerSkills(mockAgentBuilder, mockLogger, baseOptions);

    expect(mockLogger.debug).toHaveBeenCalledWith(expect.any(Function));
  });

  // Guards against drift between the skills this plugin registers and the
  // Agent Builder team's manually maintained allow-list
  // (`AGENT_BUILDER_BUILTIN_SKILLS`). A registered skill whose id is not on the
  // allow-list would be silently rejected at runtime, so every id we register
  // must be a member of the allow-list.
  it('registers only skills whose ids are in the agent-builder allow-list', async () => {
    const mockLookup: WorkflowExecutionLookup = { getWorkflowExecution: jest.fn() };
    const mockFetcher: WorkflowFetcher = {
      getWorkflow: jest.fn(),
      getWorkflowExecution: jest.fn(),
    };

    await registerSkills(mockAgentBuilder, mockLogger, {
      getEventLogIndex: jest.fn(async () => '.kibana-event-log'),
      workflowExecutionLookup: mockLookup,
      workflowFetcher: mockFetcher,
    });

    const registeredIds = mockAgentBuilder.skills.register.mock.calls.map(([skill]) => skill.id);

    expect(registeredIds).toEqual([
      'attack-discovery-alert-retrieval-builder',
      'attack-discovery-generator',
      'attack-discovery-workflow-troubleshooting',
    ]);
    registeredIds.forEach((id) => {
      expect(isAllowedBuiltinSkill(id)).toBe(true);
    });
  });

  describe('workflow troubleshooting skill', () => {
    const mockFetcher: WorkflowFetcher = {
      getWorkflow: jest.fn(),
      getWorkflowExecution: jest.fn(),
    };

    it('registers the workflow troubleshooting skill when workflowFetcher is provided', async () => {
      await registerSkills(mockAgentBuilder, mockLogger, {
        ...baseOptions,
        workflowFetcher: mockFetcher,
      });

      expect(mockAgentBuilder.skills.register).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'attack-discovery-workflow-troubleshooting',
        })
      );
    });

    it('does not register the workflow troubleshooting skill when workflowFetcher is undefined', async () => {
      await registerSkills(mockAgentBuilder, mockLogger, {
        ...baseOptions,
        workflowFetcher: undefined,
      });

      expect(mockAgentBuilder.skills.register).not.toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'attack-discovery-workflow-troubleshooting',
        })
      );
    });
  });
});
