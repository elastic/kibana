/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { loggerMock } from '@kbn/logging-mocks';
import { installInvestigationAgent } from '../lib/install_investigation_agent';
import { NIGHTSHIFT_INVESTIGATION_AGENT_ID } from '../agents/investigation';
import { installDecisionTreeReinforcementAgent } from '../lib/install_decision_tree_reinforcement_agent';
import { NIGHTSHIFT_DECISION_TREE_REINFORCEMENT_AGENT_ID } from '../agents/decision_tree_reinforcement';
import { ensureInvestigationAgentStepDefinition } from './ensure_investigation_agent';

vi.mock('../lib/install_investigation_agent', () => {
      const mocked = {
      installInvestigationAgent: vi.fn().mockResolvedValue(undefined),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../lib/install_decision_tree_reinforcement_agent', () => {
      const mocked = {
      installDecisionTreeReinforcementAgent: vi.fn().mockResolvedValue(undefined),
    };
      return { ...mocked, default: mocked };
    });
describe('ensureInvestigationAgentStepDefinition', () => {
  const callKibanaApi = vi.fn().mockResolvedValue(undefined);
  const agentBuilder = { agents: { ensure: vi.fn() } } as never;

  beforeEach(() => {
    vi.clearAllMocks();
    callKibanaApi.mockResolvedValue(undefined);
  });

  const createContext = (input: Record<string, unknown>) =>
    ({
      input,
      rawInput: input,
      contextManager: {
        getContext: vi.fn().mockReturnValue({ workflow: { spaceId: 'space-1' } }),
        getFakeRequest: vi.fn(),
        getScopedEsClient: vi.fn(),
        renderInputTemplate: vi.fn((val) => val),
        callKibanaApi,
      },
      logger: loggerMock.create(),
      abortSignal: new AbortController().signal,
      stepId: 'ensure_investigation_agent',
      stepType: 'nightshift.ensureInvestigationAgent',
    } as never);

  const availability = { cacheMode: 'space' as const, handler: vi.fn() };

  const run = (input: Record<string, unknown>) =>
    ensureInvestigationAgentStepDefinition({
      getAgentBuilder: () => agentBuilder,
      getAgentAvailability: () => availability,
    }).handler(createContext(input));

  // A step that omits `with` never reaches the input schema, so the default has to hold for `{}`.
  it('installs the Nightshift investigator when no agent is requested', async () => {
    const result = await run({});

    expect(installInvestigationAgent).toHaveBeenCalledWith({
      agentBuilder,
      spaceId: 'space-1',
      availability,
    });
    expect(callKibanaApi).toHaveBeenCalledWith({
      method: 'GET',
      path: `/api/agent_builder/agents/${NIGHTSHIFT_INVESTIGATION_AGENT_ID}`,
    });
    expect(result).toEqual({
      output: { space_id: 'space-1', agent_id: NIGHTSHIFT_INVESTIGATION_AGENT_ID },
    });
  });

  it('installs the Nightshift investigator when it is requested', async () => {
    const result = await run({ agent_id: NIGHTSHIFT_INVESTIGATION_AGENT_ID });

    expect(installInvestigationAgent).toHaveBeenCalledWith({
      agentBuilder,
      spaceId: 'space-1',
      availability,
    });
    expect(callKibanaApi).toHaveBeenCalledWith({
      method: 'GET',
      path: `/api/agent_builder/agents/${NIGHTSHIFT_INVESTIGATION_AGENT_ID}`,
    });
    expect(result).toEqual({
      output: { space_id: 'space-1', agent_id: NIGHTSHIFT_INVESTIGATION_AGENT_ID },
    });
  });

  it('installs the decision-tree reinforcement agent when it is requested', async () => {
    const result = await run({ agent_id: NIGHTSHIFT_DECISION_TREE_REINFORCEMENT_AGENT_ID });

    expect(installDecisionTreeReinforcementAgent).toHaveBeenCalledWith({
      agentBuilder,
      spaceId: 'space-1',
      availability,
    });
    expect(installInvestigationAgent).not.toHaveBeenCalled();
    expect(callKibanaApi).toHaveBeenCalledWith({
      method: 'GET',
      path: `/api/agent_builder/agents/${NIGHTSHIFT_DECISION_TREE_REINFORCEMENT_AGENT_ID}`,
    });
    expect(result).toEqual({
      output: { space_id: 'space-1', agent_id: NIGHTSHIFT_DECISION_TREE_REINFORCEMENT_AGENT_ID },
    });
  });
});
