/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isAllowedBuiltinSkill } from '@kbn/agent-builder-server/allow_lists';
import { SCS_AGENT_BUILDER_TOOL_IDS } from '../../../lib/semantic_code_search_grounding/semantic_code_search_tools';
import { KI_QUERY_GENERATION_SKILL_ID } from '../../skills/ki_query_generation';
import {
  createKIQueryGenerationAgentType,
  kiQueryGenerationAgentType,
} from './ki_query_generation_agent';

describe('kiQueryGenerationAgentType', () => {
  it('keeps stable registry tools on the agent type', () => {
    expect(kiQueryGenerationAgentType.baseConfiguration.skill_ids).toEqual([
      KI_QUERY_GENERATION_SKILL_ID,
    ]);
    expect(kiQueryGenerationAgentType.baseConfiguration.tools).toEqual([]);
    expect(isAllowedBuiltinSkill(KI_QUERY_GENERATION_SKILL_ID)).toBe(true);
  });

  it('feature-gates every registered SCS tool', async () => {
    const enabledAgentType = createKIQueryGenerationAgentType({
      isSemanticCodeSearchGroundingEnabled: jest.fn().mockResolvedValue(true),
    });
    const disabledAgentType = createKIQueryGenerationAgentType({
      isSemanticCodeSearchGroundingEnabled: jest.fn().mockResolvedValue(false),
    });
    if (
      typeof enabledAgentType.baseConfiguration !== 'function' ||
      typeof disabledAgentType.baseConfiguration !== 'function'
    ) {
      throw new Error('Expected dynamic KI query generation agent configuration');
    }

    const context = {
      request: {} as never,
      spaceId: 'default',
    };

    await expect(enabledAgentType.baseConfiguration(context)).resolves.toMatchObject({
      tools: [{ tool_ids: [...SCS_AGENT_BUILDER_TOOL_IDS] }],
    });
    await expect(disabledAgentType.baseConfiguration(context)).resolves.toMatchObject({
      tools: [],
    });
  });
});
