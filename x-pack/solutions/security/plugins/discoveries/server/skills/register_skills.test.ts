/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';

import { alertRetrievalBuilderSkill } from './alert_retrieval_builder_skill';
import { registerSkills } from './register_skills';
import type { WorkflowFetcher } from './tools/get_workflow_health_check_tool';

describe('registerSkills', () => {
  const mockLogger = loggerMock.create();
  const mockAgentBuilder = agentBuilderMocks.createSetup();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('completes without error when agentBuilder is available', async () => {
    await expect(registerSkills(mockAgentBuilder, mockLogger)).resolves.toBeUndefined();
  });

  it('registers the alert retrieval builder skill', async () => {
    await registerSkills(mockAgentBuilder, mockLogger);

    expect(mockAgentBuilder.skills.register).toHaveBeenCalledWith(alertRetrievalBuilderSkill);
  });

  it('logs a debug message on completion', async () => {
    await registerSkills(mockAgentBuilder, mockLogger);

    expect(mockLogger.debug).toHaveBeenCalledWith(expect.any(Function));
  });

  describe('workflow troubleshooting skill', () => {
    const mockFetcher: WorkflowFetcher = {
      getWorkflow: jest.fn(),
      getWorkflowExecution: jest.fn(),
    };

    it('registers the workflow troubleshooting skill when workflowFetcher is provided', async () => {
      await registerSkills(mockAgentBuilder, mockLogger, {
        workflowFetcher: mockFetcher,
      });

      expect(mockAgentBuilder.skills.register).toHaveBeenCalledTimes(2);
      expect(mockAgentBuilder.skills.register).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'attack-discovery-workflow-troubleshooting',
        })
      );
    });

    it('does not register the workflow troubleshooting skill when workflowFetcher is not provided', async () => {
      await registerSkills(mockAgentBuilder, mockLogger);

      expect(mockAgentBuilder.skills.register).toHaveBeenCalledTimes(1);
      expect(mockAgentBuilder.skills.register).not.toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'attack-discovery-workflow-troubleshooting',
        })
      );
    });

    it('does not register the workflow troubleshooting skill when options is undefined', async () => {
      await registerSkills(mockAgentBuilder, mockLogger, undefined);

      expect(mockAgentBuilder.skills.register).toHaveBeenCalledTimes(1);
    });

    it('does not register the workflow troubleshooting skill when workflowFetcher is undefined', async () => {
      await registerSkills(mockAgentBuilder, mockLogger, {
        workflowFetcher: undefined,
      });

      expect(mockAgentBuilder.skills.register).toHaveBeenCalledTimes(1);
    });
  });
});
