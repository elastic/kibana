/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { ALERTZERO_ENABLED_SETTING_ID } from '@kbn/alertzero-common';
import { createRouteContextMock } from './route_context.mock';
import { withAlertZeroEnabled } from './with_alertzero_enabled';

describe('withAlertZeroEnabled', () => {
  const invoke = async (settingEnabled: boolean) => {
    const handler = jest.fn().mockResolvedValue('handled');
    const context = createRouteContextMock({ settingEnabled });
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
});
