/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { coreMock } from '@kbn/core/server/mocks';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import {
  SIEM_READINESS_CONTINUITY_TOOL_ID,
  SIEM_READINESS_COVERAGE_TOOL_ID,
  SIEM_READINESS_QUALITY_TOOL_ID,
  SIEM_READINESS_RETENTION_TOOL_ID,
} from './siem_readiness';

import { allowedExperimentalValues } from '../../../common/experimental_features';
import { registerTools } from './register_tools';

const SIEM_READINESS_TOOL_IDS = [
  SIEM_READINESS_COVERAGE_TOOL_ID,
  SIEM_READINESS_QUALITY_TOOL_ID,
  SIEM_READINESS_CONTINUITY_TOOL_ID,
  SIEM_READINESS_RETENTION_TOOL_ID,
];

/**
 * `registerTools` only ever calls `agentBuilder.tools.register`; a recording
 * stub is enough and keeps the tool factories (which take `core` at build time)
 * out of the mock framework.
 */
const createAgentBuilderMock = () => {
  const tools = { register: jest.fn() };
  return { tools, agentBuilder: { tools } as unknown as AgentBuilderPluginSetup };
};

type AgentBuilderMock = ReturnType<typeof createAgentBuilderMock>;

const registeredToolIds = ({ tools }: AgentBuilderMock): string[] =>
  tools.register.mock.calls.map(([tool]) => tool.id);

const buildArgs = (
  { agentBuilder }: AgentBuilderMock,
  siemReadinessAgentBuilder: boolean
): Parameters<typeof registerTools> => [
  agentBuilder,
  coreMock.createSetup(),
  loggerMock.create(),
  {
    ...allowedExperimentalValues,
    siemReadinessAgentBuilder,
  },
  // The remaining arguments are only read by tools that are disabled here.
  {} as never,
  undefined as never,
  {} as never,
  false,
  '9.0.0',
  true,
];

/**
 * The SIEM Readiness eval suite's per-example criteria assert the four
 * `security.siem_readiness.get_coverage|get_quality|get_continuity|get_retention`
 * tool calls. Those tools are only reachable if the measured tree registers
 * them, so this test pins that precondition for every one of the four ids.
 */
describe('registerTools - siem-readiness gating', () => {
  it('registers all four siem_readiness tools the eval criteria assert when the flag is enabled', () => {
    const agentBuilderMock = createAgentBuilderMock();

    registerTools(...buildArgs(agentBuilderMock, true));

    expect(registeredToolIds(agentBuilderMock)).toEqual(
      expect.arrayContaining(SIEM_READINESS_TOOL_IDS)
    );
  });

  it('registers none of the siem_readiness tools when the flag is disabled', () => {
    const agentBuilderMock = createAgentBuilderMock();

    registerTools(...buildArgs(agentBuilderMock, false));

    const registered = registeredToolIds(agentBuilderMock);
    for (const toolId of SIEM_READINESS_TOOL_IDS) {
      expect(registered).not.toContain(toolId);
    }
  });
});
