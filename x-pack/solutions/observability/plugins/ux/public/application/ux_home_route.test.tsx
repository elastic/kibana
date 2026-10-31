/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import * as t from 'io-ts';
import { createMemoryHistory } from 'history';
import { createRouter } from '@kbn/typed-react-router-config';
import { matchUxHomeRoute } from './ux_home_route';

describe('matchUxHomeRoute', () => {
  it('maps the inventory path', () => {
    expect(matchUxHomeRoute('/')).toEqual({ tab: 'overview' });
  });

  it('maps in-app tab paths', () => {
    expect(matchUxHomeRoute('/weather-demo-app')).toEqual({
      tab: 'overview',
      serviceName: 'weather-demo-app',
    });
    expect(matchUxHomeRoute('/weather-demo-app/pages')).toEqual({
      tab: 'pages',
      serviceName: 'weather-demo-app',
    });
    expect(matchUxHomeRoute('/weather-demo-app/session-replay')).toEqual({
      tab: 'session-replay',
      serviceName: 'weather-demo-app',
    });
    expect(matchUxHomeRoute('/weather-demo-app/journeys')).toEqual({
      tab: 'journeys',
      serviceName: 'weather-demo-app',
    });
    expect(matchUxHomeRoute('/weather-demo-app/funnels')).toEqual({
      tab: 'funnels',
      serviceName: 'weather-demo-app',
    });
    expect(matchUxHomeRoute('/weather-demo-app/patterns')).toEqual({
      tab: 'journeys',
      serviceName: 'weather-demo-app',
    });
  });

  it('maps a report template under an app', () => {
    expect(matchUxHomeRoute('/weather-demo-app/reports/scorecard')).toEqual({
      tab: 'reports',
      templateId: 'scorecard',
      serviceName: 'weather-demo-app',
    });
  });

  it('treats legacy tab paths as home chrome without an app', () => {
    expect(matchUxHomeRoute('/pages')).toEqual({ tab: 'pages' });
    expect(matchUxHomeRoute('/errors')).toEqual({ tab: 'errors' });
    expect(matchUxHomeRoute('/session-replay')).toEqual({ tab: 'session-replay' });
  });

  it('does not treat session subpages as home chrome', () => {
    expect(matchUxHomeRoute('/session-replay/settings')).toBeNull();
    expect(matchUxHomeRoute('/session-replay/abc')).toBeNull();
    expect(matchUxHomeRoute('/weather-demo-app/session-replay/abc')).toBeNull();
    expect(matchUxHomeRoute('/weather-demo-app/session-replay/abc/replay')).toBeNull();
    expect(matchUxHomeRoute('/weather-demo-app/session-replay/settings')).toBeNull();
    expect(matchUxHomeRoute('/settings')).toBeNull();
    expect(matchUxHomeRoute('/weather-demo-app/settings')).toBeNull();
    expect(matchUxHomeRoute('/weather-demo-app/settings/capture')).toBeNull();
  });
});

describe('nested ux home routes', () => {
  const empty = <></>;
  const serviceNameParams = t.type({
    path: t.type({
      serviceName: t.string,
    }),
  });
  const router = createRouter({
    '/': {
      element: empty,
      children: {
        '/': { element: empty },
        '/pages': { element: empty },
        '/{serviceName}': { params: serviceNameParams, element: empty },
        '/{serviceName}/pages': { params: serviceNameParams, element: empty },
        '/{serviceName}/session-replay/{sessionId}': {
          params: t.type({
            path: t.type({
              serviceName: t.string,
              sessionId: t.string,
            }),
          }),
          element: empty,
        },
      },
    },
  });

  it('matches an app overview, tab, and session detail path', () => {
    const history = createMemoryHistory();
    history.push('/weather-demo-app/pages');
    expect(router.getParams('/{serviceName}/pages', history.location).path).toEqual({
      serviceName: 'weather-demo-app',
    });

    history.push('/weather-demo-app/session-replay/abc-123');
    expect(
      router.getParams('/{serviceName}/session-replay/{sessionId}', history.location).path
    ).toEqual({
      serviceName: 'weather-demo-app',
      sessionId: 'abc-123',
    });
  });
});
