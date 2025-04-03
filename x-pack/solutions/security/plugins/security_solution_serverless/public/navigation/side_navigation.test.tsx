/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProductLine, ProductTier } from '../../common/product';
import { mockServices } from '../common/services/__mocks__/services.mock';
import { initSideNavigation } from './side_navigation';

describe('Security Side Nav', () => {
  const services = mockServices;
  const initNavigationSpy = jest.spyOn(services.serverless, 'initNavigation');

  afterEach(() => {
    initNavigationSpy.mockReset();
  });

  it('registers the navigation tree definition for serverless security', (done) => {
    expect(initNavigationSpy).not.toHaveBeenCalled();

    initSideNavigation(services, []);

    expect(initNavigationSpy).toHaveBeenCalled();

    const [, navigationTree$] = initNavigationSpy.mock.calls[0];

    navigationTree$.subscribe({
      next: (value) => {
        expect(value).toMatchSnapshot();
      },
      error: (err) => done(err),
      complete: () => done(),
    });
  });

  it('registers the navigation tree definition for serverless security with AI SOC', (done) => {
    expect(initNavigationSpy).not.toHaveBeenCalled();

    initSideNavigation(services, [
      {
        product_line: 'ai_soc' as ProductLine,
        product_tier: 'search_ai_lake' as ProductTier,
      },
    ]);

    expect(initNavigationSpy).toHaveBeenCalled();

    const [, navigationTree$] = initNavigationSpy.mock.calls[0];

    navigationTree$.subscribe({
      next: (value) => {
        expect(value).toMatchSnapshot();
      },
      error: (err) => done(err),
      complete: () => done(),
    });
  });
});
