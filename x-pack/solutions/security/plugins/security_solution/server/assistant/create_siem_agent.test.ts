/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentDefinition } from '@kbn/onechat-common';
import type { OnechatPluginStart } from '@kbn/onechat-server';
import type { SecuritySolutionPluginCoreStartDependencies } from '../plugin_contract';
import { SiemAgentCreator } from './siem_agent_creator';

describe('SiemAgentCreator', () => {
  let mockAgentClient: jest.Mocked<{
    has: jest.Mock;
    create: jest.Mock;
  }>;
  let mockOnechatPlugin: jest.Mocked<Pick<OnechatPluginStart, 'agents'>>;
  let mockCore: SecuritySolutionPluginCoreStartDependencies;
  let mockLogger: jest.Mocked<{
    info: jest.Mock;
    warn: jest.Mock;
    error: jest.Mock;
  }>;
  let siemAgentCreator: SiemAgentCreator;

  beforeEach(() => {
    mockAgentClient = {
      has: jest.fn(),
      create: jest.fn(),
    };

    mockOnechatPlugin = {
      agents: {
        getScopedClient: jest.fn().mockResolvedValue(mockAgentClient),
      },
    };

    mockCore = {};

    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    siemAgentCreator = new SiemAgentCreator({
      onechatPlugin: mockOnechatPlugin as OnechatPluginStart,
      core: mockCore,
      logger: mockLogger,
    });
  });

  it('should create SIEM agent when it does not exist', async () => {
    // Mock that agent doesn't exist
    mockAgentClient.has.mockResolvedValue(false);

    // Mock successful agent creation
    const mockCreatedAgent: AgentDefinition = {
      id: 'siem-security-analyst',
      type: 'chat',
      name: 'SIEM Security Analyst',
      description: 'AI assistant specialized in security analysis and threat detection for SIEM operations',
      labels: ['security', 'siem', 'threat-detection', 'incident-response'],
      avatar_color: '#ff6b6b',
      avatar_symbol: '🛡️',
      configuration: {
        instructions: 'test instructions',
        tools: [],
      },
    };
    mockAgentClient.create.mockResolvedValue(mockCreatedAgent);

    // Execute the method
    await siemAgentCreator.createSiemAgent();

    // Verify the agent was created with correct parameters
    expect(mockAgentClient.has).toHaveBeenCalledWith('siem-security-analyst');
    expect(mockAgentClient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'siem-security-analyst',
        name: 'SIEM Security Analyst',
        configuration: expect.objectContaining({
          tools: expect.arrayContaining([
            { tool_ids: ['.open-and-acknowledged-alerts-internal-tool'] },
            { type: 'builtin', tool_ids: ['*'] },
            { type: 'esql', tool_ids: ['*'] },
          ]),
        }),
      })
    );
    expect(mockLogger.info).toHaveBeenCalledWith('Successfully created SIEM agent', {
      agentId: 'siem-security-analyst',
      agentName: 'SIEM Security Analyst',
    });
  });

  it('should skip creation when SIEM agent already exists', async () => {
    // Mock that agent already exists
    mockAgentClient.has.mockResolvedValue(true);

    // Execute the method
    await siemAgentCreator.createSiemAgent();

    // Verify the agent existence was checked but not created
    expect(mockAgentClient.has).toHaveBeenCalledWith('siem-security-analyst');
    expect(mockAgentClient.create).not.toHaveBeenCalled();
    expect(mockLogger.info).toHaveBeenCalledWith('SIEM agent already exists, skipping creation');
  });

  it('should handle errors during agent creation', async () => {
    // Mock that agent doesn't exist
    mockAgentClient.has.mockResolvedValue(false);

    // Mock error during creation
    const creationError = new Error('Failed to create agent');
    mockAgentClient.create.mockRejectedValue(creationError);

    // Execute the method and expect it to throw
    await expect(siemAgentCreator.createSiemAgent()).rejects.toThrow('Failed to create agent');

    // Verify error was logged
    expect(mockLogger.error).toHaveBeenCalledWith('Failed to create SIEM agent', {
      error: 'Failed to create agent',
      stack: expect.any(String),
    });
  });
});
