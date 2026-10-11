/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NIGHTSHIFT_API_PRIVILEGES } from '@kbn/nightshift-shared';
import { internalSlackAppRoutes } from './route';

const { read, manage, configure } = NIGHTSHIFT_API_PRIVILEGES;

describe('Slack app route privileges', () => {
  it.each([
    'POST /internal/significant_events/apps/slack/connect',
    'POST /internal/significant_events/apps/slack/disconnect',
    'POST /internal/significant_events/apps/slack/bindings/{channelId}/bind',
    'POST /internal/significant_events/apps/slack/bindings/{channelId}/unbind',
  ] as const)('%s requires manage and configure', (endpoint) => {
    expect(internalSlackAppRoutes[endpoint].security.authz).toEqual({
      requiredPrivileges: [manage, configure],
    });
  });

  it.each([
    'GET /internal/significant_events/apps/slack/status',
    'GET /internal/significant_events/apps/slack/bindings',
  ] as const)('%s requires read only', (endpoint) => {
    expect(internalSlackAppRoutes[endpoint].security.authz).toEqual({
      requiredPrivileges: [read],
    });
  });
});
