/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, of, type Observable } from 'rxjs';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import { AI_CHAT_EXPERIENCE_TYPE } from '@kbn/management-settings-ids';
import type { NavigationTreeDefinition } from '@kbn/core-chrome-browser';
import type { ProductLine, ProductTier } from '../../common/product';
import { mockServices } from '../common/services/__mocks__/services.mock';
import { registerSolutionNavigation } from './navigation';
import { createNavigationTree } from './navigation_tree';
import { createAiNavigationTree } from './ai_navigation/ai_navigation_tree';

jest.mock('./navigation_tree');
jest.mock('./ai_navigation/ai_navigation_tree');

const mockedCreateNavigationTree = createNavigationTree as jest.Mock;
const mockedCreateAiNavigationTree = createAiNavigationTree as jest.Mock;

const mockedNavTree = {};
const mockedAiNavTree = {};

describe('Security Side Nav', () => {
  let chatExperienceSubject: BehaviorSubject<AIChatExperience>;
  let services: typeof mockServices;
  let initNavigationSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    chatExperienceSubject = new BehaviorSubject<AIChatExperience>(AIChatExperience.Classic);
    services = {
      ...mockServices,
      settings: {
        ...mockServices.settings,
        client: {
          ...mockServices.settings.client,
          get$: jest.fn(<T = unknown>(key: string, defaultOverride?: T): Observable<T> => {
            if (key === AI_CHAT_EXPERIENCE_TYPE) {
              return chatExperienceSubject.asObservable() as unknown as Observable<T>;
            }
            return of(defaultOverride ?? null) as Observable<T>;
          }),
        },
      },
    };
    mockedCreateNavigationTree.mockResolvedValue(mockedNavTree);
    mockedCreateAiNavigationTree.mockReturnValue(mockedAiNavTree);
    initNavigationSpy = jest.spyOn(services.serverless, 'initNavigation');
  });

  afterEach(() => {
    chatExperienceSubject.complete();
  });

  it('registers the navigation tree definition for serverless security', async () => {
    expect(initNavigationSpy).not.toHaveBeenCalled();

    await registerSolutionNavigation(services, []);

    expect(initNavigationSpy).toHaveBeenCalled();
    expect(mockedCreateNavigationTree).toHaveBeenCalledWith(services, AIChatExperience.Classic);
    expect(mockedCreateAiNavigationTree).not.toHaveBeenCalled();

    const [, navigationTree$] = initNavigationSpy.mock.calls[0];
    const values: NavigationTreeDefinition[] = [];
    const subscription = navigationTree$.subscribe({
      next: (value: NavigationTreeDefinition) => {
        values.push(value);
      },
    });
    // Wait for async resolution
    await new Promise((resolve) => setTimeout(resolve, 10));
    subscription.unsubscribe();
    expect(values.length).toBeGreaterThan(0);
    expect(values[values.length - 1]).toBe(mockedNavTree);
  });

  it('registers the navigation tree definition for serverless security with AI SOC', async () => {
    expect(initNavigationSpy).not.toHaveBeenCalled();

    await registerSolutionNavigation(services, [
      {
        product_line: 'ai_soc' as ProductLine,
        product_tier: 'search_ai_lake' as ProductTier,
      },
    ]);

    expect(initNavigationSpy).toHaveBeenCalled();
    expect(mockedCreateAiNavigationTree).toHaveBeenCalledWith(AIChatExperience.Classic);
    expect(mockedCreateNavigationTree).not.toHaveBeenCalled();

    const [, navigationTree$] = initNavigationSpy.mock.calls[0];
    const values: NavigationTreeDefinition[] = [];
    const subscription = navigationTree$.subscribe({
      next: (value: NavigationTreeDefinition) => {
        values.push(value);
      },
    });
    // Wait for async resolution
    await new Promise((resolve) => setTimeout(resolve, 10));
    subscription.unsubscribe();
    expect(values.length).toBeGreaterThan(0);
    expect(values[values.length - 1]).toBe(mockedAiNavTree);
  });

  it('updates navigation tree reactively when chat experience changes', async () => {
    await registerSolutionNavigation(services, []);

    const [, navigationTree$] = initNavigationSpy.mock.calls[0];
    const values: NavigationTreeDefinition[] = [];
    const subscription = navigationTree$.subscribe({
      next: (value: NavigationTreeDefinition) => {
        values.push(value);
      },
    });

    // Wait for initial value
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Change chat experience
    chatExperienceSubject.next(AIChatExperience.Agent);

    // Wait for reactive update
    await new Promise((resolve) => setTimeout(resolve, 10));

    subscription.unsubscribe();
    expect(mockedCreateNavigationTree).toHaveBeenCalledWith(services, AIChatExperience.Agent);
  });

  it('passes chat experience parameter to createAiNavigationTree when using AI SOC', async () => {
    await registerSolutionNavigation(services, [
      {
        product_line: 'ai_soc' as ProductLine,
        product_tier: 'search_ai_lake' as ProductTier,
      },
    ]);

    const [, navigationTree$] = initNavigationSpy.mock.calls[0];
    const subscription = navigationTree$.subscribe({
      next: (_value: NavigationTreeDefinition) => {},
    });

    // Wait for initial value
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Change chat experience
    chatExperienceSubject.next(AIChatExperience.Agent);

    // Wait for reactive update
    await new Promise((resolve) => setTimeout(resolve, 10));

    subscription.unsubscribe();
    expect(mockedCreateAiNavigationTree).toHaveBeenCalledWith(AIChatExperience.Agent);
  });
});
