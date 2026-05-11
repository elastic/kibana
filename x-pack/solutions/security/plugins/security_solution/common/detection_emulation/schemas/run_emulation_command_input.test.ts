/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RunEmulationCommandInputSchema } from './run_emulation_command_input';
import { RESPONSE_ACTION_AGENT_TYPE } from '../../endpoint/service/response_actions/constants';

describe('RunEmulationCommandInputSchema', () => {
  it('validates a valid input with all required fields', () => {
    const validInput = {
      emulationId: 'test-emulation-123',
      agentType: 'endpoint' as const,
      endpointIds: ['endpoint-id-1', 'endpoint-id-2'],
      command: 'execute' as const,
    };

    const result = RunEmulationCommandInputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('validates a valid input with optional parameters', () => {
    const validInput = {
      emulationId: 'test-emulation-123',
      agentType: 'sentinel_one' as const,
      endpointIds: ['endpoint-id-1'],
      command: 'kill-process' as const,
      parameters: {
        pid: '12345',
        entityId: 'abc-123',
      },
    };

    const result = RunEmulationCommandInputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('validates all supported agent types', () => {
    const agentTypes = ['endpoint', 'sentinel_one', 'crowdstrike', 'microsoft_defender_endpoint'];

    agentTypes.forEach((agentType) => {
      const input = {
        emulationId: 'test-emulation-123',
        agentType,
        endpointIds: ['endpoint-id-1'],
        command: 'execute' as const,
      };

      const result = RunEmulationCommandInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  it('validates all supported commands', () => {
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
        agentType: 'endpoint' as const,
        endpointIds: ['endpoint-id-1'],
        command,
      };

      const result = RunEmulationCommandInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  it('rejects invalid agent type', () => {
    const invalidInput = {
      emulationId: 'test-emulation-123',
      agentType: 'invalid-agent-type',
      endpointIds: ['endpoint-id-1'],
      command: 'execute' as const,
    };

    const result = RunEmulationCommandInputSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });

  it('rejects invalid command', () => {
    const invalidInput = {
      emulationId: 'test-emulation-123',
      agentType: 'endpoint' as const,
      endpointIds: ['endpoint-id-1'],
      command: 'invalid-command',
    };

    const result = RunEmulationCommandInputSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });

  it('rejects empty endpointIds array', () => {
    const invalidInput = {
      emulationId: 'test-emulation-123',
      agentType: 'endpoint' as const,
      endpointIds: [],
      command: 'execute' as const,
    };

    const result = RunEmulationCommandInputSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });

  it('rejects missing required fields', () => {
    const invalidInputs = [
      {
        agentType: 'endpoint' as const,
        endpointIds: ['endpoint-id-1'],
        command: 'execute' as const,
      },
      {
        emulationId: 'test-emulation-123',
        endpointIds: ['endpoint-id-1'],
        command: 'execute' as const,
      },
      {
        emulationId: 'test-emulation-123',
        agentType: 'endpoint' as const,
        command: 'execute' as const,
      },
      {
        emulationId: 'test-emulation-123',
        agentType: 'endpoint' as const,
        endpointIds: ['endpoint-id-1'],
      },
    ];

    invalidInputs.forEach((input) => {
      const result = RunEmulationCommandInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});

// ─── agentType contract: validation against RESPONSE_ACTION_AGENT_TYPE ────────

describe('RunEmulationCommandInputSchema — agentType contract', () => {
  const BASE_INPUT = {
    emulationId: 'emu-contract-test',
    endpointIds: ['ep-1'],
    command: 'isolate',
  } as const;

  it('schema agentType enum is identical to RESPONSE_ACTION_AGENT_TYPE', () => {
    // Introspect the Zod enum's internal .options array and compare it to the
    // authoritative constant.  This fails immediately if the two diverge — even
    // before any request is parsed — making it the strongest form of contract test.
    const schemaAllowedValues = RunEmulationCommandInputSchema.shape.agentType.options;
    expect([...schemaAllowedValues]).toEqual([...RESPONSE_ACTION_AGENT_TYPE]);
  });

  it.each(RESPONSE_ACTION_AGENT_TYPE)(
    'accepts agentType "%s" (every value in RESPONSE_ACTION_AGENT_TYPE)',
    (agentType) => {
      const result = RunEmulationCommandInputSchema.safeParse({ ...BASE_INPUT, agentType });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.agentType).toBe(agentType);
      }
    }
  );

  it('rejects an agentType that is not in RESPONSE_ACTION_AGENT_TYPE', () => {
    const result = RunEmulationCommandInputSchema.safeParse({
      ...BASE_INPUT,
      agentType: 'unknown_edr_vendor',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const agentTypeIssue = result.error.issues.find((issue) => issue.path[0] === 'agentType');
      expect(agentTypeIssue).toBeDefined();
    }
  });

  it('rejects every near-miss variant that differs from a valid agentType by case or whitespace', () => {
    const nearMisses = [
      'Endpoint',
      'ENDPOINT',
      'Sentinel_One',
      'SENTINEL_ONE',
      'Crowdstrike',
      'CROWDSTRIKE',
      'Microsoft_Defender_Endpoint',
      ' endpoint',
      'endpoint ',
    ];

    nearMisses.forEach((agentType) => {
      const result = RunEmulationCommandInputSchema.safeParse({ ...BASE_INPUT, agentType });
      expect(result.success).toBe(false);
    });
  });
});
