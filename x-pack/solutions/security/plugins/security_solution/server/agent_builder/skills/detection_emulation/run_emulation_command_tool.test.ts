/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRunEmulationCommandTool } from './run_emulation_command_tool';
import { ToolType } from '@kbn/agent-builder-common/tools';
import type { RunEmulationCommandToolDeps } from './run_emulation_command_tool';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../plugin_contract';
import type { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import type { ConfigType } from '../../../config';
import { loggingSystemMock } from '@kbn/core/server/mocks';

const createMockDeps = (): RunEmulationCommandToolDeps => {
  const logger = loggingSystemMock.createLogger();
  return {
    core: {
      getStartServices: jest.fn().mockResolvedValue([
        {
          plugins: { cases: undefined },
          security: { authc: { getCurrentUser: jest.fn().mockReturnValue(null) } },
        },
        { securitySolution: { createRequestContext: jest.fn() } },
      ]),
    } as unknown as SecuritySolutionPluginCoreSetupDependencies,
    endpointService: {} as unknown as EndpointAppContextService,
    config: {
      experimentalFeatures: {
        detectionEmulationRealExecution: true,
      },
    } as unknown as ConfigType,
    logger,
  };
};

describe('createRunEmulationCommandTool', () => {
  it('should create a tool with correct id and type', () => {
    const tool = createRunEmulationCommandTool(createMockDeps());

    expect(tool.id).toBe('security.detection-emulation.run-command');
    expect(tool.type).toBe(ToolType.builtin);
  });

  it('should have a schema that validates agentType', () => {
    const tool = createRunEmulationCommandTool(createMockDeps());

    // Valid agent types should parse
    const validInput = {
      emulationId: 'test-emulation-123',
      agentType: 'endpoint' as const,
      endpointIds: ['agent-1', 'agent-2'],
      command: 'execute' as const,
      parameters: { command: 'whoami' },
    };

    const result = tool.schema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('should validate all supported EDR agent types', () => {
    const tool = createRunEmulationCommandTool(createMockDeps());

    const agentTypes = ['endpoint', 'sentinel_one', 'crowdstrike', 'microsoft_defender_endpoint'];

    agentTypes.forEach((agentType) => {
      const input = {
        emulationId: 'test-emulation-123',
        agentType,
        endpointIds: ['agent-1'],
        command: 'execute',
      };

      const result = tool.schema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  it('should reject invalid agent types', () => {
    const tool = createRunEmulationCommandTool(createMockDeps());

    const input = {
      emulationId: 'test-emulation-123',
      agentType: 'invalid-type',
      endpointIds: ['agent-1'],
      command: 'execute',
    };

    const result = tool.schema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should validate all supported commands', () => {
    const tool = createRunEmulationCommandTool(createMockDeps());

    const commands = [
      'isolate',
      'unisolate',
      'kill-process',
      'suspend-process',
      'running-processes',
      'get-file',
      'execute',
      'upload',
      'scan',
      'runscript',
      'cancel',
      'memory-dump',
    ];

    commands.forEach((command) => {
      const input = {
        emulationId: 'test-emulation-123',
        agentType: 'endpoint',
        endpointIds: ['agent-1'],
        command,
      };

      const result = tool.schema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  it('should require at least one endpoint ID', () => {
    const tool = createRunEmulationCommandTool(createMockDeps());

    const input = {
      emulationId: 'test-emulation-123',
      agentType: 'endpoint',
      endpointIds: [],
      command: 'execute',
    };

    const result = tool.schema.safeParse(input);
    expect(result.success).toBe(false);
  });
});
