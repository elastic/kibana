/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InvalidRouteParamsException } from '@kbn/typed-react-router-config';
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
      // Links without a source open the Classic Overview.
      query: { source: 'classic' },
    });
  });

  it('heals an unknown source to the Classic one', () => {
    const location = { ...locationOf('/my-app'), search: '?source=mobile' };

    expect(() => digitalExperienceRouter.matchRoutes(location)).toThrow(
      expect.objectContaining({
        constructor: InvalidRouteParamsException,
        patched: expect.objectContaining({ query: { source: 'classic' } }),
      })
    );
  });

  it('removes an unknown source filter from the list', () => {
    const location = { ...locationOf('/'), search: '?rangeFrom=now-15m&sourceFilter=mobile' };

    expect(() => digitalExperienceRouter.matchRoutes(location)).toThrow(
      expect.objectContaining({
        patched: expect.objectContaining({ query: { rangeFrom: 'now-15m' } }),
      })
    );
  });

  it('links an application with its source', () => {
    expect(
      digitalExperienceRouter.link('/{serviceName}', {
        path: { serviceName: 'my-app' },
        query: { source: 'otel' },
      })
    ).toBe('/my-app?source=otel');
  });

  it('reads the source from the query', () => {
    const location = { ...locationOf('/my-app'), search: '?source=otel' };

    expect(digitalExperienceRouter.getParams('/{serviceName}', location)).toEqual({
      path: { serviceName: 'my-app' },
      query: { source: 'otel' },
    });
  });
});
