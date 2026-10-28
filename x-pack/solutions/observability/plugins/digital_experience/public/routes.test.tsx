/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { digitalExperienceRouter } from './routes';

const locationOf = (pathname: string) => ({ pathname, search: '', hash: '', state: undefined });

describe('digitalExperienceRouter', () => {
  it('matches / to the Applications list', () => {
    const matches = digitalExperienceRouter.matchRoutes(locationOf('/'));

    expect(matches.map(({ route }) => route.path)).toEqual(['/', '/']);
  });

  it('matches /{serviceName} to the Application view with the path param', () => {
    const location = locationOf('/my-app');

    const matches = digitalExperienceRouter.matchRoutes(location);

    expect(matches.map(({ route }) => route.path)).toEqual(['/', '/{serviceName}']);
    expect(digitalExperienceRouter.getParams('/{serviceName}', location)).toEqual({
      path: { serviceName: 'my-app' },
      query: {},
    });
  });

  it('links to an application', () => {
    expect(
      digitalExperienceRouter.link('/{serviceName}', { path: { serviceName: 'my-app' } })
    ).toBe('/my-app');
  });
});
