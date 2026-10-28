/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import type { NavigationTreeDefinition } from '@kbn/core-chrome-browser';
import { mockServices } from '../common/__mocks__/services.mock';
import type { Services } from '../common/services';
import { registerSolutionNavigation } from './solution_navigation';

const getSolutionTree = async (alertZeroVisible: boolean): Promise<NavigationTreeDefinition> => {
  const addSolutionNavigation = jest.fn();
  const services = {
    ...mockServices,
    settings: {
      globalClient: { get: jest.fn(<T>(_key: string, defaultValue?: T) => defaultValue as T) },
      client: {
        get: jest.fn(<T>(_key: string, defaultValue?: T) => defaultValue as T),
        get$: jest.fn(() => of(AIChatExperience.Agent)),
      },
    },
    application: {
      applications$: of(
        new Map(alertZeroVisible ? [['alertzero', { visibleIn: ['projectSideNav'] }]] : [])
      ),
    },
    navigation: {
      ...mockServices.navigation,
      isSolutionNavEnabled$: of(true),
      addSolutionNavigation,
    },
  } as unknown as Services;

  await registerSolutionNavigation(services);

  const { navigationTree$ } = addSolutionNavigation.mock.calls[0][0];
  return new Promise((resolve) => navigationTree$.subscribe(resolve));
};

describe('registerSolutionNavigation', () => {
  it('keeps the original order when the AlertZero app is not visible', async () => {
    const { body } = await getSolutionTree(false);
    const links = body.map((item) => item.link);

    expect(links.slice(0, 2)).toEqual(['inbox', 'discover']);
    expect(links.indexOf('agent_builder')).toBeGreaterThan(links.indexOf('discover'));
  });

  it('puts Agents first when the AlertZero app is visible', async () => {
    const { body } = await getSolutionTree(true);
    const links = body.map((item) => item.link);

    expect(links.indexOf('agent_builder')).toBeLessThan(links.indexOf('discover'));
  });
});
