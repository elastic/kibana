/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { coreMock } from '@kbn/core/server/mocks';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import { isAllowedBuiltinSkill } from '@kbn/agent-builder-server/allow_lists';

import { allowedExperimentalValues } from '../../../common/experimental_features';
import { createMockEndpointAppContext } from '../../endpoint/mocks';
import { registerSkills } from './register_skills';

const ENDPOINT_RESPONSE_ACTIONS_SKILL_ID = 'endpoint-response-actions';

/**
 * `agentBuilderMocks.createSetup()` returns a bare `jest.fn()` for
 * `skills.register`, which accepts any id. Production goes through
 * `SkillServiceImpl.registerSkill`, which throws when the id is missing from
 * `AGENT_BUILDER_BUILTIN_SKILLS`. Re-applying that guard here is what makes the
 * test bite: without it, an unlisted skill registers cleanly and the test
 * passes under the very regression it exists to catch.
 */
const createAllowListEnforcingAgentBuilder = () => {
  const agentBuilder = agentBuilderMocks.createSetup();

  agentBuilder.skills.register.mockImplementation((skill) => {
    if (!isAllowedBuiltinSkill(skill.id)) {
      throw new Error(
        `Built-in skill with id "${skill.id}" is not in the list of allowed built-in skills.`
      );
    }
  });

  return agentBuilder;
};

const registeredSkillIds = (
  agentBuilder: ReturnType<typeof createAllowListEnforcingAgentBuilder>
) => agentBuilder.skills.register.mock.calls.map(([skill]) => skill.id);

describe('registerSkills - endpoint response actions', () => {
  const buildOpts = (agentBuilder: ReturnType<typeof createAllowListEnforcingAgentBuilder>) => ({
    agentBuilder,
    experimentalFeatures: {
      ...allowedExperimentalValues,
      endpointResponseActionsSkill: true,
    },
    getStartServices: coreMock.createSetup().getStartServices,
    kibanaVersion: '9.0.0',
    logger: loggerMock.create(),
    ml: undefined,
    options: { endpointAppContextService: createMockEndpointAppContext().service },
  });

  it('registers the endpoint-response-actions skill without throwing when the flag is enabled', async () => {
    const agentBuilder = createAllowListEnforcingAgentBuilder();

    await expect(registerSkills(buildOpts(agentBuilder))).resolves.toBeUndefined();

    expect(registeredSkillIds(agentBuilder)).toContain(ENDPOINT_RESPONSE_ACTIONS_SKILL_ID);
  });

  it('uses a skill id that is on the agent-builder built-in allow-list', () => {
    // Guards against drift between the id this plugin registers and the Agent
    // Builder team's manually maintained `AGENT_BUILDER_BUILTIN_SKILLS`. An
    // unlisted id throws at registration; `registerSkills` is invoked without
    // `await` in `plugin.ts`, so the rejection is swallowed by a `.catch()`
    // that only logs — the skill goes silently missing at runtime.
    expect(isAllowedBuiltinSkill(ENDPOINT_RESPONSE_ACTIONS_SKILL_ID)).toBe(true);
  });
});
