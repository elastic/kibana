/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AIChatExperience } from '@kbn/ai-assistant-common';
import type { NavigationTreeDefinition } from '@kbn/core-chrome-browser';
import { AGENT_BUILDER_NAV_AT_TOP_FLAG } from '@kbn/navigation-plugin/public';
import { mockServices } from '../common/services/__mocks__/services.mock';
import type { Services } from '../common/services';
import { createNavigationTree } from './navigation_tree';

describe('createNavigationTree', () => {
  const createServices = (options?: { agentBuilderNavAtTop?: boolean }): Services => ({
    ...mockServices,
    featureFlags: {
      ...mockServices.featureFlags,
      getBooleanValue: jest.fn((flag: string, defaultValue?: boolean) => {
        if (flag === AGENT_BUILDER_NAV_AT_TOP_FLAG) {
          return options?.agentBuilderNavAtTop ?? defaultValue ?? false;
        }

        return defaultValue ?? false;
      }),
    },
    uiSettings: {
      ...mockServices.uiSettings,
      get: jest.fn(<T>(_key: string, defaultValue?: T) => defaultValue as T),
    },
  });

  it('always includes context engine below the home link in classic chat experience', async () => {
    const { body } = (await createNavigationTree(
      createServices(),
      AIChatExperience.Classic
    )) as NavigationTreeDefinition;

    const homeIndex = body.findIndex((item) => item.id === 'security_solution_home');
    const contextEngineIndex = body.findIndex((item) => item.link === 'context_engine');
    const agentBuilderNode = body.find((item) => item.link === 'agent_builder');

    expect(body[contextEngineIndex]).toMatchObject({ icon: 'sparkles', link: 'context_engine' });
    expect(contextEngineIndex).toBe(homeIndex + 1);
    expect(agentBuilderNode).toBeUndefined();
  });

  it('keeps context engine in a static position when agent builder nav is in the middle', async () => {
    const { body } = (await createNavigationTree(
      createServices({ agentBuilderNavAtTop: false }),
      AIChatExperience.Agent
    )) as NavigationTreeDefinition;

    const homeIndex = body.findIndex((item) => item.id === 'security_solution_home');
    const contextEngineIndex = body.findIndex((item) => item.link === 'context_engine');
    const agentBuilderIndex = body.findIndex((item) => item.link === 'agent_builder');

    expect(contextEngineIndex).toBe(homeIndex + 1);
    expect(agentBuilderIndex).toBeGreaterThan(contextEngineIndex);
  });

  it('keeps context engine below agent builder when agent builder nav is at the top', async () => {
    const { body } = (await createNavigationTree(
      createServices({ agentBuilderNavAtTop: true }),
      AIChatExperience.Agent
    )) as NavigationTreeDefinition;

    const homeIndex = body.findIndex((item) => item.id === 'security_solution_home');
    const agentBuilderIndex = body.findIndex((item) => item.link === 'agent_builder');
    const contextEngineIndex = body.findIndex((item) => item.link === 'context_engine');

    expect(agentBuilderIndex).toBe(homeIndex + 1);
    expect(contextEngineIndex).toBe(agentBuilderIndex + 1);
  });
});
