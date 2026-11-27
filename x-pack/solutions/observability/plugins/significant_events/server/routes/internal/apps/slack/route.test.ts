/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RelayRequestError } from '@kbn/actions-plugin/server';
import { NIGHTSHIFT_API_PRIVILEGES } from '@kbn/nightshift-shared';
import { SlackAppService } from '../../../../lib/slack_app/service';
import { internalSlackAppRoutes } from './route';

jest.mock('../../../../lib/slack_app/service');

const { read, manage, configure } = NIGHTSHIFT_API_PRIVILEGES;

describe('Slack app route privileges', () => {
  it.each([
    'POST /internal/significant_events/apps/slack/connect',
    'POST /internal/significant_events/apps/slack/confirm',
    'POST /internal/significant_events/apps/slack/disconnect',
    'GET /internal/significant_events/apps/slack/available_channels',
    'POST /internal/significant_events/apps/slack/bindings/{channelId}/bind',
    'POST /internal/significant_events/apps/slack/bindings/{channelId}/unbind',
  ] as const)('%s requires manage and configure', (endpoint) => {
    expect(internalSlackAppRoutes[endpoint].security.authz).toEqual({
      requiredPrivileges: [manage, configure],
    });
  });

  it('GET /internal/significant_events/apps/slack/bindings requires read only', () => {
    expect(
      internalSlackAppRoutes['GET /internal/significant_events/apps/slack/bindings'].security.authz
    ).toEqual({
      requiredPrivileges: [read],
    });
  });

  it('GET /internal/significant_events/apps/slack/status requires read and checks manage and configure', () => {
    expect(
      internalSlackAppRoutes['GET /internal/significant_events/apps/slack/status'].security.authz
    ).toEqual({
      requiredPrivileges: [read],
      extendedPrivileges: [manage, configure],
    });
  });
});

describe('Slack app disconnect route body', () => {
  const { body } =
    internalSlackAppRoutes['POST /internal/significant_events/apps/slack/disconnect'].params.shape;

  it.each([null, undefined, {}, { tenantKey: 'T0123ABC' }])('accepts %p', (value) => {
    expect(body.safeParse(value).success).toBe(true);
  });
});

describe('Slack app available channels route', () => {
  const route =
    internalSlackAppRoutes['GET /internal/significant_events/apps/slack/available_channels'];
  const callHandler = () =>
    route.handler({ request: {}, server: {} } as unknown as Parameters<typeof route.handler>[0]);

  it('keeps a Relay throttle a 429 instead of a 502', async () => {
    jest
      .mocked(SlackAppService.prototype.listAvailableChannels)
      .mockRejectedValue(new RelayRequestError('/channels', 429, 'Slack is busy'));

    await expect(callHandler()).rejects.toMatchObject({ output: { statusCode: 429 } });
  });
});
