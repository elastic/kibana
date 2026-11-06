/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import { isAllowedBuiltinSkill } from '@kbn/agent-builder-server/allow_lists';
import { KI_QUERY_GENERATION_SKILL_ID } from '../../skills/ki_query_generation';
import { registerSignificantEventsKIQueryGenerationAgentTypes } from '.';
import { kiQueryGenerationAgentType } from './ki_query_generation_agent';

describe('kiQueryGenerationAgentType', () => {
  it('keeps stable registry tools on the agent type', () => {
    expect(kiQueryGenerationAgentType.baseConfiguration.skill_ids).toEqual([
      KI_QUERY_GENERATION_SKILL_ID,
    ]);
    expect(kiQueryGenerationAgentType.baseConfiguration.tools).toEqual([]);
    expect(isAllowedBuiltinSkill(KI_QUERY_GENERATION_SKILL_ID)).toBe(true);
  });

  it('registers the static agent type', () => {
    const agentBuilder = agentBuilderMocks.createSetup();

    registerSignificantEventsKIQueryGenerationAgentTypes({ agentBuilder });

    expect(agentBuilder.agents.registerType).toHaveBeenCalledTimes(1);
    expect(agentBuilder.agents.registerType).toHaveBeenCalledWith(kiQueryGenerationAgentType);
  });
});
