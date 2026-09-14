/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import { cloudMock } from '@kbn/cloud-plugin/server/mocks';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { skills } from '@kbn/search-agent';
import { registerSearchSkills } from './register_search_skills';

const createCloudSetup = (projectType?: CloudSetup['serverless']['projectType']) => {
  const cloud = cloudMock.createSetup();
  return { ...cloud, serverless: { ...cloud.serverless, projectType } };
};

describe('registerSearchSkills', () => {
  it('registers each search skill under the search namespace in a VectorDB project', () => {
    const agentBuilder = agentBuilderMocks.createSetup();

    registerSearchSkills({
      agentBuilder,
      cloud: createCloudSetup('vectordb'),
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

  it('does not register skills in other project types, where search_getting_started owns them', () => {
    const agentBuilder = agentBuilderMocks.createSetup();

    registerSearchSkills({
      agentBuilder,
      cloud: createCloudSetup('search'),
      logger: loggingSystemMock.createLogger(),
    });

    expect(agentBuilder.skills.register).not.toHaveBeenCalled();
  });

  it('does not register skills when cloud is unavailable', () => {
    const agentBuilder = agentBuilderMocks.createSetup();

    registerSearchSkills({
      agentBuilder,
      logger: loggingSystemMock.createLogger(),
    });

    expect(agentBuilder.skills.register).not.toHaveBeenCalled();
  });
});
