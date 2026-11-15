/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { ALERTZERO_ENABLED_SETTING_ID } from '@kbn/alertzero-common';
import type { SubscriptionAvailability } from '../../common/availability';
import { createRouteContextMock } from './route_context.mock';
import { withAlertZeroEnabled } from './with_alertzero_enabled';

describe('withAlertZeroEnabled', () => {
  const invoke = async (
    settingEnabled: boolean,
    subscription: SubscriptionAvailability = 'available'
  ) => {
    const handler = jest.fn().mockResolvedValue('handled');
    const context = createRouteContextMock({ settingEnabled, subscription });
    const request = httpServerMock.createKibanaRequest();
    const response = httpServerMock.createResponseFactory();

    await withAlertZeroEnabled(handler)(context, request, response);

    return { handler, request, response };
  };

  it('delegates to the handler when the setting is on', async () => {
    const { handler, request, response } = await invoke(true);

    expect(handler).toHaveBeenCalledWith(expect.anything(), request, response);
    expect(response.notFound).not.toHaveBeenCalled();
  });

  it('responds 404 without calling the handler when the setting is off', async () => {
    const { handler, response } = await invoke(false);

    expect(handler).not.toHaveBeenCalled();
    expect(response.notFound).toHaveBeenCalled();
  });

  it('reads the per-space AlertZero setting', async () => {
    const context = createRouteContextMock({ settingEnabled: true });

    await withAlertZeroEnabled(jest.fn())(
      context,
      httpServerMock.createKibanaRequest(),
      httpServerMock.createResponseFactory()
    );

    expect((await context.core).uiSettings.client.get).toHaveBeenCalledWith(
      ALERTZERO_ENABLED_SETTING_ID
    );
  });
  it.each(['license', 'serverless_tier', 'loading'] as const)(
    'rejects %s before invoking feature services',
    async (subscription) => {
      const { handler, response } = await invoke(true, subscription);
      expect(handler).not.toHaveBeenCalled();
      expect(response.forbidden).toHaveBeenCalled();
    }
  );

  it('keeps the setting-off 404 even when the subscription is insufficient', async () => {
    const { handler, response } = await invoke(false, 'license');
    expect(handler).not.toHaveBeenCalled();
    expect(response.notFound).toHaveBeenCalled();
    expect(response.forbidden).not.toHaveBeenCalled();
  });
  it('returns 503 without running feature work if a runtime dependency is absent', async () => {
    const handler = jest.fn();
    const response = httpServerMock.createResponseFactory();
    await withAlertZeroEnabled(handler)(
      createRouteContextMock({ hasRequiredDependencies: false }),
      httpServerMock.createKibanaRequest(),
      response
    );
    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 503 }));
    expect(handler).not.toHaveBeenCalled();
  });
});
