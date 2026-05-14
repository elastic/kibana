/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common/tools';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { ConfigType } from '../../../config';
import type { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../plugin_contract';
import { MAX_ENDPOINT_FANOUT } from '../../../../common/detection_emulation/schemas/constants';
import { createDetectionEmulationGuardrails } from '../../../lib/detection_emulation/execution/shared_guardrails';
import { createRunProcessCommandTool } from './run_process_command_tool';
import { createRunFileCommandTool } from './run_file_command_tool';
import { createRunNetworkCommandTool } from './run_network_command_tool';
import { createRunExecutionCommandTool } from './run_execution_command_tool';

const createMockDeps = () => {
  const logger = loggingSystemMock.createLogger();
  const config = {
    experimentalFeatures: {
      detectionEmulationRealExecution: true,
    },
  } as unknown as ConfigType;
  return {
    core: {} as unknown as SecuritySolutionPluginCoreSetupDependencies,
    endpointService: {} as unknown as EndpointAppContextService,
    config,
    logger,
    // Real guardrail bundle constructed from the same factory the
    // production wiring uses, so the per-family tool factories can
    // destructure `allowlist`/`rateLimiter` without a hand-rolled stub.
    // The schema-shape tests below never reach the dispatch path, so the
    // guardrails' default-deny behaviour is irrelevant here.
    guardrails: createDetectionEmulationGuardrails(config, logger),
  };
};

const baseInput = (command: string, parameters?: Record<string, unknown>) => ({
  emulationId: 'em-1',
  agentType: 'endpoint' as const,
  endpointIds: ['agent-1'],
  command,
  parameters,
});

describe('per-family runEmulationCommand tools', () => {
  describe('runProcessCommand', () => {
    const tool = createRunProcessCommandTool(createMockDeps());

    it('exposes the canonical id + builtin type', () => {
      expect(tool.id).toBe('security.detection-emulation.run-process-command');
      expect(tool.type).toBe(ToolType.builtin);
    });

    it.each(['kill-process', 'suspend-process', 'running-processes', 'memory-dump'])(
      'accepts process-family command [%s] at the boundary',
      (command) => {
        // The boundary only checks the `command` enum; parameters are
        // re-validated strictly inside the handler.
        expect(tool.schema.safeParse(baseInput(command, {})).success).toBe(true);
      }
    );

    it.each(['isolate', 'unisolate', 'execute', 'runscript', 'get-file', 'scan'])(
      'rejects non-process command [%s] at the boundary',
      (command) => {
        expect(tool.schema.safeParse(baseInput(command, {})).success).toBe(false);
      }
    );
  });

  describe('runFileCommand', () => {
    const tool = createRunFileCommandTool(createMockDeps());

    it('exposes the canonical id + builtin type', () => {
      expect(tool.id).toBe('security.detection-emulation.run-file-command');
      expect(tool.type).toBe(ToolType.builtin);
    });

    it.each(['get-file', 'scan', 'upload'])(
      'accepts file-family command [%s] at the boundary',
      (command) => {
        expect(tool.schema.safeParse(baseInput(command, {})).success).toBe(true);
      }
    );

    it.each(['isolate', 'kill-process', 'execute', 'cancel'])(
      'rejects non-file command [%s] at the boundary',
      (command) => {
        expect(tool.schema.safeParse(baseInput(command, {})).success).toBe(false);
      }
    );
  });

  describe('runNetworkCommand', () => {
    const tool = createRunNetworkCommandTool(createMockDeps());

    it('exposes the canonical id + builtin type', () => {
      expect(tool.id).toBe('security.detection-emulation.run-network-command');
      expect(tool.type).toBe(ToolType.builtin);
    });

    it.each(['isolate', 'unisolate'])(
      'accepts network-family command [%s] at the boundary',
      (command) => {
        expect(tool.schema.safeParse(baseInput(command, {})).success).toBe(true);
      }
    );

    it.each(['get-file', 'kill-process', 'execute', 'cancel'])(
      'rejects non-network command [%s] at the boundary',
      (command) => {
        expect(tool.schema.safeParse(baseInput(command, {})).success).toBe(false);
      }
    );
  });

  describe('runExecutionCommand', () => {
    const tool = createRunExecutionCommandTool(createMockDeps());

    it('exposes the canonical id + builtin type', () => {
      expect(tool.id).toBe('security.detection-emulation.run-execution-command');
      expect(tool.type).toBe(ToolType.builtin);
    });

    it.each(['execute', 'runscript', 'cancel'])(
      'accepts execution-family command [%s] at the boundary',
      (command) => {
        expect(tool.schema.safeParse(baseInput(command, {})).success).toBe(true);
      }
    );

    it.each(['isolate', 'kill-process', 'get-file', 'scan'])(
      'rejects non-execution command [%s] at the boundary',
      (command) => {
        expect(tool.schema.safeParse(baseInput(command, {})).success).toBe(false);
      }
    );
  });

  describe('shared schema rules (cross-family)', () => {
    const tool = createRunProcessCommandTool(createMockDeps());

    it('rejects empty endpointIds', () => {
      expect(
        tool.schema.safeParse({
          emulationId: 'em-1',
          agentType: 'endpoint',
          endpointIds: [],
          command: 'kill-process',
          parameters: { pid: 1 },
        }).success
      ).toBe(false);
    });

    it('rejects unknown agentType', () => {
      expect(
        tool.schema.safeParse({
          emulationId: 'em-1',
          agentType: 'unknown-edr',
          endpointIds: ['agent-1'],
          command: 'kill-process',
          parameters: { pid: 1 },
        }).success
      ).toBe(false);
    });

    it('rejects empty emulationId', () => {
      expect(
        tool.schema.safeParse({
          emulationId: '',
          agentType: 'endpoint',
          endpointIds: ['agent-1'],
          command: 'kill-process',
          parameters: { pid: 1 },
        }).success
      ).toBe(false);
    });

    // P1 (AGENT-NATIVE-DEAD-END): the boundary schema is intentionally
    // narrowed to `'endpoint'` so the JSON Schema the LLM sees never
    // surfaces `sentinel_one`, `crowdstrike`, or `microsoft_defender_endpoint`
    // as selectable options. The runner rejects those agent types
    // downstream anyway; surfacing them in the boundary just gave eval
    // traces real dead-end paths.
    it('accepts only the wired agent type (endpoint) at the boundary', () => {
      expect(
        tool.schema.safeParse({
          emulationId: 'em-1',
          agentType: 'endpoint',
          endpointIds: ['agent-1'],
          command: 'kill-process',
          parameters: { pid: 1 },
        }).success
      ).toBe(true);
    });

    it.each(['sentinel_one', 'crowdstrike', 'microsoft_defender_endpoint'])(
      'rejects non-endpoint agent type [%s] at the boundary',
      (agentType) => {
        expect(
          tool.schema.safeParse({
            emulationId: 'em-1',
            agentType,
            endpointIds: ['agent-1'],
            command: 'kill-process',
            parameters: { pid: 1 },
          }).success
        ).toBe(false);
      }
    );

    it('defaults agentType to "endpoint" when omitted at the boundary', () => {
      const result = tool.schema.safeParse({
        emulationId: 'em-1',
        endpointIds: ['agent-1'],
        command: 'kill-process',
        parameters: { pid: 1 },
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.agentType).toBe('endpoint');
      }
    });
  });

  // ─── PROD-3: endpoint fanout cap ───────────────────────────────────────────
  //
  // The four per-family tools share `endpointIds` shape via their boundary
  // schemas; the cap is enforced from `MAX_ENDPOINT_FANOUT` so all four
  // surfaces stay in lockstep with the central route schema.
  describe('PROD-3 endpoint fanout cap', () => {
    const generateAgentIds = (count: number): string[] =>
      Array.from({ length: count }, (_, i) => `agent-${i + 1}`);

    const tools = [
      {
        name: 'runProcessCommand',
        schema: createRunProcessCommandTool(createMockDeps()).schema,
        command: 'kill-process',
        parameters: { pid: 1 },
      },
      {
        name: 'runFileCommand',
        schema: createRunFileCommandTool(createMockDeps()).schema,
        command: 'get-file',
        parameters: { path: '/tmp/x' },
      },
      {
        name: 'runNetworkCommand',
        schema: createRunNetworkCommandTool(createMockDeps()).schema,
        command: 'isolate',
        parameters: undefined,
      },
      {
        name: 'runExecutionCommand',
        schema: createRunExecutionCommandTool(createMockDeps()).schema,
        command: 'execute',
        parameters: { command: 'whoami' } as Record<string, unknown> | undefined,
      },
    ];

    it.each(tools)(
      '$name accepts exactly MAX_ENDPOINT_FANOUT endpointIds',
      ({ schema, command, parameters }) => {
        const result = schema.safeParse({
          emulationId: 'em-1',
          agentType: 'endpoint',
          endpointIds: generateAgentIds(MAX_ENDPOINT_FANOUT),
          command,
          parameters,
        });
        expect(result.success).toBe(true);
      }
    );

    it.each(tools)(
      '$name rejects MAX_ENDPOINT_FANOUT + 1 endpointIds with a message naming the constant',
      ({ schema, command, parameters }) => {
        const result = schema.safeParse({
          emulationId: 'em-1',
          agentType: 'endpoint',
          endpointIds: generateAgentIds(MAX_ENDPOINT_FANOUT + 1),
          command,
          parameters,
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.message).toContain('MAX_ENDPOINT_FANOUT');
          expect(result.error.message).toContain(String(MAX_ENDPOINT_FANOUT));
        }
      }
    );

    it.each(tools)('$name rejects empty endpointIds', ({ schema, command, parameters }) => {
      const result = schema.safeParse({
        emulationId: 'em-1',
        agentType: 'endpoint',
        endpointIds: [],
        command,
        parameters,
      });
      expect(result.success).toBe(false);
    });
  });

  // ─── HITL: declarative confirmation policy ─────────────────────────────────
  //
  // Smoke-tests the framework integration on each per-family tool: the
  // `confirmation` block must use `askUser: 'once'` so a single accept covers
  // the whole conversation, and the `getConfirmation` callback must produce a
  // non-empty title/message + a colour that escalates to 'danger' for
  // destructive commands. Keeps the helper output reachable from CI without
  // round-tripping the real prompt manager.
  describe('HITL declarative confirmation policy', () => {
    const cases = [
      {
        name: 'runProcessCommand',
        tool: createRunProcessCommandTool(createMockDeps()),
        destructiveCommand: 'kill-process',
        nonDestructiveCommand: 'running-processes',
      },
      {
        name: 'runFileCommand',
        tool: createRunFileCommandTool(createMockDeps()),
        destructiveCommand: 'upload',
        nonDestructiveCommand: 'get-file',
      },
      {
        name: 'runNetworkCommand',
        tool: createRunNetworkCommandTool(createMockDeps()),
        destructiveCommand: 'isolate',
        nonDestructiveCommand: 'unisolate',
      },
      {
        name: 'runExecutionCommand',
        tool: createRunExecutionCommandTool(createMockDeps()),
        destructiveCommand: 'execute',
        nonDestructiveCommand: 'cancel',
      },
    ];

    it.each(cases)(
      '$name registers `confirmation: { askUser: "once" }` with a getConfirmation callback',
      ({ tool }) => {
        expect(tool.confirmation?.askUser).toBe('once');
        expect(typeof tool.confirmation?.getConfirmation).toBe('function');
      }
    );

    // The four per-family tools each have a discriminated `command` literal
    // union, so `tool.confirmation.getConfirmation` is typed per-family. When
    // `it.each` iterates the heterogenous `cases` union, TS intersects the
    // four signatures and `toolParams` collapses to `never`. Cast the callback
    // through `unknown` to a single shape that accepts any toolParams object;
    // the runtime contract is identical (all four implementations accept the
    // same property set, only the `command` enum differs per-family).
    type GetConfirmationFn = (args: {
      toolParams: Record<string, unknown>;
    }) => Promise<{ color: string; title: string; message: string }>;

    it.each(cases)(
      '$name renders a destructive-coloured confirmation for [$destructiveCommand]',
      async ({ tool, destructiveCommand }) => {
        const getConfirmation = tool.confirmation!.getConfirmation as unknown as GetConfirmationFn;
        const result = await getConfirmation({
          toolParams: {
            emulationId: 'em-42',
            agentType: 'endpoint',
            endpointIds: ['host-a'],
            command: destructiveCommand,
            parameters: {},
          },
        });
        expect(result.color).toBe('danger');
        expect(result.title).toContain(destructiveCommand);
        expect(result.message).toContain('host-a');
        expect(result.message).toContain('em-42');
      }
    );

    it.each(cases)(
      '$name renders a warning-coloured confirmation for the non-destructive [$nonDestructiveCommand]',
      async ({ tool, nonDestructiveCommand }) => {
        const getConfirmation = tool.confirmation!.getConfirmation as unknown as GetConfirmationFn;
        const result = await getConfirmation({
          toolParams: {
            emulationId: 'em-42',
            agentType: 'endpoint',
            endpointIds: ['host-a', 'host-b'],
            command: nonDestructiveCommand,
            parameters: {},
          },
        });
        expect(result.color).toBe('warning');
        expect(result.title).toContain(nonDestructiveCommand);
        expect(result.message).toContain('2');
      }
    );
  });
});
