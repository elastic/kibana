/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RunEmulationCommandInputSchema } from './run_emulation_command_input';
import { MAX_ENDPOINT_FANOUT } from './constants';
import {
  RESPONSE_ACTION_AGENT_TYPE,
  RESPONSE_ACTION_API_COMMANDS_NAMES,
} from '../../endpoint/service/response_actions/constants';

describe('RunEmulationCommandInputSchema', () => {
  it('validates a valid `execute` command with required parameters', () => {
    const validInput = {
      emulationId: 'test-emulation-123',
      agentType: 'endpoint' as const,
      endpointIds: ['endpoint-id-1', 'endpoint-id-2'],
      command: 'execute' as const,
      parameters: { command: 'whoami' },
    };

    const result = RunEmulationCommandInputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('validates a valid `kill-process` command with `pid` parameter', () => {
    const validInput = {
      emulationId: 'test-emulation-123',
      agentType: 'sentinel_one' as const,
      endpointIds: ['endpoint-id-1'],
      command: 'kill-process' as const,
      parameters: { pid: 12345 },
    };

    const result = RunEmulationCommandInputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('validates a valid `kill-process` command with `entity_id` parameter', () => {
    const validInput = {
      emulationId: 'test-emulation-123',
      agentType: 'endpoint' as const,
      endpointIds: ['endpoint-id-1'],
      command: 'kill-process' as const,
      parameters: { entity_id: 'abc-123' },
    };

    const result = RunEmulationCommandInputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('validates `isolate` with no parameters', () => {
    const result = RunEmulationCommandInputSchema.safeParse({
      emulationId: 'emu',
      agentType: 'endpoint',
      endpointIds: ['ep-1'],
      command: 'isolate',
    });
    expect(result.success).toBe(true);
  });

  it('validates every supported command with its minimal required parameters', () => {
    const cases: Array<{ command: string; parameters?: Record<string, unknown> }> = [
      { command: 'isolate' },
      { command: 'unisolate' },
      { command: 'running-processes' },
      { command: 'cancel', parameters: { id: 'action-abc' } },
      { command: 'kill-process', parameters: { pid: 1 } },
      { command: 'suspend-process', parameters: { pid: 1 } },
      { command: 'memory-dump', parameters: { type: 'process', pid: 1 } },
      { command: 'memory-dump', parameters: { type: 'process', entity_id: 'abc' } },
      { command: 'memory-dump', parameters: { type: 'kernel' } },
      { command: 'get-file', parameters: { path: '/tmp/file' } },
      { command: 'scan', parameters: { path: '/tmp/scan' } },
      { command: 'execute', parameters: { command: 'whoami' } },
      { command: 'runscript', parameters: { scriptId: 'script-1' } },
      { command: 'upload', parameters: { file: {}, overwrite: true } },
    ];

    cases.forEach(({ command, parameters }) => {
      const result = RunEmulationCommandInputSchema.safeParse({
        emulationId: 'test-emulation-123',
        agentType: 'endpoint',
        endpointIds: ['endpoint-id-1'],
        command,
        ...(parameters !== undefined ? { parameters } : {}),
      });
      expect({ command, success: result.success }).toEqual({ command, success: true });
    });
  });

  it('accepts an optional `comment` on every supported command (audit-trail invariant)', () => {
    // Locks the contract that the per-family agent-builder tools' docstrings
    // make to the LLM ("every command also accepts an optional `comment:
    // string` recorded against the response-action audit trail"). If anyone
    // adds a new `command` variant without `comment`, or drops `comment`
    // from an existing variant, this test fails — the docstrings would
    // then be lying to the LLM and the LLM would silently omit operator
    // attribution from dispatched actions. See `optionalCommentParams` /
    // `cancelParams` / `processRefParams` / etc. in
    // `run_emulation_command_input.ts`.
    const cases: Array<{ command: string; parameters: Record<string, unknown> }> = [
      { command: 'isolate', parameters: { comment: 'audit' } },
      { command: 'unisolate', parameters: { comment: 'audit' } },
      { command: 'running-processes', parameters: { comment: 'audit' } },
      { command: 'cancel', parameters: { id: 'action-abc', comment: 'audit' } },
      { command: 'kill-process', parameters: { pid: 1, comment: 'audit' } },
      { command: 'suspend-process', parameters: { pid: 1, comment: 'audit' } },
      { command: 'memory-dump', parameters: { type: 'process', pid: 1, comment: 'audit' } },
      { command: 'memory-dump', parameters: { type: 'kernel', comment: 'audit' } },
      { command: 'get-file', parameters: { path: '/tmp/file', comment: 'audit' } },
      { command: 'scan', parameters: { path: '/tmp/scan', comment: 'audit' } },
      { command: 'execute', parameters: { command: 'whoami', comment: 'audit' } },
      { command: 'runscript', parameters: { scriptId: 'script-1', comment: 'audit' } },
      { command: 'upload', parameters: { file: {}, overwrite: true, comment: 'audit' } },
    ];

    // Sanity: this test must cover every command in the discriminated union.
    // Dedupe `cases` because a single command (e.g. `memory-dump`) can have
    // multiple parameter shapes worth exercising, while the discriminated
    // union has exactly one variant per command literal. Drift here means a
    // new command landed without an audit-comment test case — exactly the
    // regression we're guarding against.
    const variantCommands = RunEmulationCommandInputSchema.options.map(
      (variant) => variant.shape.command.value
    );
    const coveredCommands = [...new Set(cases.map((c) => c.command))];
    expect(coveredCommands.sort()).toEqual(variantCommands.sort());

    cases.forEach(({ command, parameters }) => {
      const result = RunEmulationCommandInputSchema.safeParse({
        emulationId: 'test-emulation-123',
        agentType: 'endpoint',
        endpointIds: ['endpoint-id-1'],
        command,
        parameters,
      });
      expect({
        command,
        success: result.success,
        errors: result.success ? null : result.error.issues,
      }).toEqual({
        command,
        success: true,
        errors: null,
      });
    });
  });

  it('rejects `memory-dump` with type=process but no pid or entity_id', () => {
    const result = RunEmulationCommandInputSchema.safeParse({
      emulationId: 'e',
      agentType: 'endpoint',
      endpointIds: ['ep-1'],
      command: 'memory-dump',
      parameters: { type: 'process' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects `cancel` without an `id`', () => {
    const result = RunEmulationCommandInputSchema.safeParse({
      emulationId: 'e',
      agentType: 'endpoint',
      endpointIds: ['ep-1'],
      command: 'cancel',
      parameters: {},
    });
    expect(result.success).toBe(false);
  });

  it('rejects `runscript` without a `scriptId`', () => {
    const result = RunEmulationCommandInputSchema.safeParse({
      emulationId: 'e',
      agentType: 'endpoint',
      endpointIds: ['ep-1'],
      command: 'runscript',
      parameters: { scriptInput: 'whoami' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid agent type', () => {
    const result = RunEmulationCommandInputSchema.safeParse({
      emulationId: 'test-emulation-123',
      agentType: 'invalid-agent-type',
      endpointIds: ['endpoint-id-1'],
      command: 'execute',
      parameters: { command: 'whoami' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid command', () => {
    const result = RunEmulationCommandInputSchema.safeParse({
      emulationId: 'test-emulation-123',
      agentType: 'endpoint',
      endpointIds: ['endpoint-id-1'],
      command: 'invalid-command',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty endpointIds array', () => {
    const result = RunEmulationCommandInputSchema.safeParse({
      emulationId: 'test-emulation-123',
      agentType: 'endpoint',
      endpointIds: [],
      command: 'isolate',
    });
    expect(result.success).toBe(false);
  });

  // ─── PROD-3: endpoint fanout cap ───────────────────────────────────────────
  describe('endpoint fanout cap (PROD-3)', () => {
    const generateAgentIds = (count: number): string[] =>
      Array.from({ length: count }, (_, i) => `endpoint-${i + 1}`);

    it('accepts exactly MAX_ENDPOINT_FANOUT endpointIds', () => {
      const result = RunEmulationCommandInputSchema.safeParse({
        emulationId: 'em-1',
        agentType: 'endpoint',
        endpointIds: generateAgentIds(MAX_ENDPOINT_FANOUT),
        command: 'isolate',
      });
      expect(result.success).toBe(true);
    });

    it('rejects MAX_ENDPOINT_FANOUT + 1 endpointIds with a message naming the constant', () => {
      const result = RunEmulationCommandInputSchema.safeParse({
        emulationId: 'em-1',
        agentType: 'endpoint',
        endpointIds: generateAgentIds(MAX_ENDPOINT_FANOUT + 1),
        command: 'isolate',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('MAX_ENDPOINT_FANOUT');
        expect(result.error.message).toContain(String(MAX_ENDPOINT_FANOUT));
      }
    });
  });

  it('rejects missing required common fields', () => {
    const cases = [
      { agentType: 'endpoint', endpointIds: ['ep-1'], command: 'isolate' }, // no emulationId
      { emulationId: 'e', endpointIds: ['ep-1'], command: 'isolate' }, // no agentType
      { emulationId: 'e', agentType: 'endpoint', command: 'isolate' }, // no endpointIds
      { emulationId: 'e', agentType: 'endpoint', endpointIds: ['ep-1'] }, // no command
    ];

    cases.forEach((input) => {
      const result = RunEmulationCommandInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  it('rejects `kill-process` without pid or entity_id (closes the I6 silent-passthrough hole)', () => {
    const result = RunEmulationCommandInputSchema.safeParse({
      emulationId: 'e',
      agentType: 'endpoint',
      endpointIds: ['ep-1'],
      command: 'kill-process',
      parameters: { comment: 'hi' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects `get-file` without `path`', () => {
    const result = RunEmulationCommandInputSchema.safeParse({
      emulationId: 'e',
      agentType: 'endpoint',
      endpointIds: ['ep-1'],
      command: 'get-file',
      parameters: {},
    });
    expect(result.success).toBe(false);
  });

  it('rejects `execute` without `command`', () => {
    const result = RunEmulationCommandInputSchema.safeParse({
      emulationId: 'e',
      agentType: 'endpoint',
      endpointIds: ['ep-1'],
      command: 'execute',
      parameters: { timeout: 30 },
    });
    expect(result.success).toBe(false);
  });

  it('rejects unknown parameter keys (strict objects close typo holes like `entityId` for `entity_id`)', () => {
    const result = RunEmulationCommandInputSchema.safeParse({
      emulationId: 'e',
      agentType: 'endpoint',
      endpointIds: ['ep-1'],
      command: 'kill-process',
      parameters: { entityId: 'abc-123' }, // wrong: should be entity_id
    });
    expect(result.success).toBe(false);
  });
});

// ─── agentType contract: validation against RESPONSE_ACTION_AGENT_TYPE ────────

describe('RunEmulationCommandInputSchema — agentType contract', () => {
  it('every variant of the discriminated union accepts every value in RESPONSE_ACTION_AGENT_TYPE', () => {
    // Pull the agentType enum from one of the variants to make sure it
    // exists as an enum (not a free-form string). This catches a refactor
    // that would silently accept any string.
    const firstOption = RunEmulationCommandInputSchema.options[0];
    expect([...firstOption.shape.agentType.options]).toEqual([...RESPONSE_ACTION_AGENT_TYPE]);
  });

  it.each(RESPONSE_ACTION_AGENT_TYPE)(
    'accepts agentType "%s" with command `isolate`',
    (agentType) => {
      const result = RunEmulationCommandInputSchema.safeParse({
        emulationId: 'emu-contract-test',
        agentType,
        endpointIds: ['ep-1'],
        command: 'isolate',
      });
      expect(result.success).toBe(true);
    }
  );

  it('rejects an agentType that is not in RESPONSE_ACTION_AGENT_TYPE', () => {
    const result = RunEmulationCommandInputSchema.safeParse({
      emulationId: 'emu-contract-test',
      agentType: 'unknown_edr_vendor',
      endpointIds: ['ep-1'],
      command: 'isolate',
    });
    expect(result.success).toBe(false);
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
      const result = RunEmulationCommandInputSchema.safeParse({
        emulationId: 'emu-contract-test',
        agentType,
        endpointIds: ['ep-1'],
        command: 'isolate',
      });
      expect(result.success).toBe(false);
    });
  });

  it('every command in RESPONSE_ACTION_API_COMMANDS_NAMES has exactly one variant in the schema', () => {
    const variantCommands = RunEmulationCommandInputSchema.options.map(
      (variant) => variant.shape.command.value
    );
    expect(variantCommands.sort()).toEqual([...RESPONSE_ACTION_API_COMMANDS_NAMES].sort());
  });
});
