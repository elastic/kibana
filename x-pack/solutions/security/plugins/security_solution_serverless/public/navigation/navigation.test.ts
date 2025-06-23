/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
mockedCreateNavigationTree.mockReturnValue(mockedNavTree);
const mockedAiNavTree = {};
mockedCreateAiNavigationTree.mockReturnValue(mockedAiNavTree);

describe('Security Side Nav', () => {
  const services = mockServices;
  const initNavigationSpy = jest.spyOn(services.serverless, 'initNavigation');

  beforeEach(() => {
    jest.clearAllMocks();
    initNavigationSpy.mockReset();
  });

  it('registers the navigation tree definition for serverless security', (done) => {
    expect(initNavigationSpy).not.toHaveBeenCalled();

    registerSolutionNavigation(services, []);

    expect(initNavigationSpy).toHaveBeenCalled();

    const [, navigationTree$] = initNavigationSpy.mock.calls[0];

    navigationTree$.subscribe({
      next: (value) => {
        expect(value).toBe(mockedNavTree);
        expect(mockedCreateNavigationTree).toHaveBeenCalledWith(services);
        expect(mockedCreateAiNavigationTree).not.toHaveBeenCalled();
      },
      error: (err) => done(err),
      complete: () => done(),
    });
  });

  it('registers the navigation tree definition for serverless security with AI SOC', (done) => {
    expect(initNavigationSpy).not.toHaveBeenCalled();

    registerSolutionNavigation(services, [
      {
        product_line: 'ai_soc' as ProductLine,
        product_tier: 'search_ai_lake' as ProductTier,
      },
    ]);

    expect(initNavigationSpy).toHaveBeenCalled();

    const [, navigationTree$] = initNavigationSpy.mock.calls[0];

    navigationTree$.subscribe({
      next: (value) => {
        expect(value).toBe(mockedAiNavTree);
        expect(mockedCreateAiNavigationTree).toHaveBeenCalled();
        expect(mockedCreateNavigationTree).not.toHaveBeenCalled();
      },
      error: (err) => done(err),
      complete: () => done(),
    });
  });
});
