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

  it('matches /{serviceName} to the Overview of the Application view with the path param', () => {
    const location = locationOf('/my-app');

    const matches = digitalExperienceRouter.matchRoutes(location);

    // The application route, then its Overview tab.
    expect(matches.map(({ route }) => route.path)).toEqual([
      '/',
      '/{serviceName}',
      '/{serviceName}',
    ]);
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

  it('matches the Sessions tab and a session, below the application', () => {
    expect(
      digitalExperienceRouter
        .matchRoutes(locationOf('/my-app/sessions'))
        .map(({ route }) => route.path)
    ).toEqual(['/', '/{serviceName}', '/{serviceName}/sessions']);

    const location = { ...locationOf('/my-app/sessions/abc'), search: '?source=otel&os=Linux' };
    expect(digitalExperienceRouter.matchRoutes(location).map(({ route }) => route.path)).toEqual([
      '/',
      '/{serviceName}',
      '/{serviceName}/sessions/{sessionId}',
    ]);
    expect(
      digitalExperienceRouter.getParams('/{serviceName}/sessions/{sessionId}', location)
    ).toEqual({
      path: { serviceName: 'my-app', sessionId: 'abc' },
      query: { source: 'otel', os: 'Linux' },
    });
  });

  it('removes invalid sessions list params', () => {
    const location = {
      ...locationOf('/my-app/sessions'),
      search: `?source=otel&hasErrors=true&duration=forever&sortField=user&page=1001&perPage=30&os=&country=${'X'.repeat(
        17
      )}&browser=Chrome`,
    };

    expect(() => digitalExperienceRouter.matchRoutes(location)).toThrow(
      expect.objectContaining({
        patched: expect.objectContaining({
          query: { source: 'otel', hasErrors: 'true', browser: 'Chrome' },
        }),
      })
    );
  });

  it('reads the sessions list params as their types', () => {
    const location = {
      ...locationOf('/my-app/sessions'),
      search: '?source=otel&hasErrors=true&page=2&perPage=50&browser=Chrome',
    };

    expect(digitalExperienceRouter.getParams('/{serviceName}/sessions', location)).toEqual({
      path: { serviceName: 'my-app' },
      query: { source: 'otel', hasErrors: true, page: 2, perPage: 50, browser: 'Chrome' },
    });
  });

  it('links a session with the sessions list state', () => {
    expect(
      digitalExperienceRouter.link('/{serviceName}/sessions/{sessionId}', {
        path: { serviceName: 'my-app', sessionId: 'abc' },
        query: { source: 'otel', hasErrors: true, perPage: 50 },
      })
    ).toBe('/my-app/sessions/abc?hasErrors=true&perPage=50&source=otel');
  });
});
