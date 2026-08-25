/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { skills } from '@kbn/search-agent';
import { registerSearchSkills } from './register_search_skills';

describe('registerSearchSkills', () => {
  it('registers each search skill under the search namespace', () => {
    const agentBuilder = agentBuilderMocks.createSetup();

    registerSearchSkills({
      agentBuilder,
      logger: loggingSystemMock.createLogger(),
    });

    expect(agentBuilder.skills.register).toHaveBeenCalledTimes(skills.length);
    for (const skill of skills) {
      expect(agentBuilder.skills.register).toHaveBeenCalledWith(
        expect.objectContaining({
          id: `search.${skill.id}`,
          basePath: 'skills/search',
        })
      );
    }
  });
});
