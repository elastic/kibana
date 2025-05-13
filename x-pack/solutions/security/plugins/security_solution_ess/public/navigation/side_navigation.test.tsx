/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockServices } from '../common/__mocks__/services.mock';
import { initSideNavigation } from './side_navigation';

describe('ESS Security Side Nav', () => {
  const services = mockServices;

  it('registers the navigation tree definition', (done) => {
    const addSolutionNavigation = jest.spyOn(services.navigation, 'addSolutionNavigation');

    expect(addSolutionNavigation).not.toHaveBeenCalled();

    initSideNavigation(services);

    expect(addSolutionNavigation).toHaveBeenCalled();

    const [addSolutionNavigationArg] = addSolutionNavigation.mock.calls[0];
    const { navigationTree$ } = addSolutionNavigationArg;

    navigationTree$.subscribe({
      next: (value) => {
        expect(value).toMatchSnapshot();
      },
      error: (err) => done(err),
      complete: () => done(),
    });
  });
});
