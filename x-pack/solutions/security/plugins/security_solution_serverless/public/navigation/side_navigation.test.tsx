/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockServices } from '../common/services/__mocks__/services.mock';
import { initSideNavigation } from './side_navigation';

describe('ESS Security Side Nav', () => {
  const services = mockServices;

  it('registers the navigation tree definition', (done) => {
    const initNavigation = jest.spyOn(services.serverless, 'initNavigation');

    expect(initNavigation).not.toHaveBeenCalled();

    initSideNavigation(services);

    expect(initNavigation).toHaveBeenCalled();

    const [, navigationTree$] = initNavigation.mock.calls[0];

    navigationTree$.subscribe({
      next: (value) => {
        expect(value).toMatchSnapshot();
      },
      error: (err) => done(err),
      complete: () => done(),
    });
  });
});
