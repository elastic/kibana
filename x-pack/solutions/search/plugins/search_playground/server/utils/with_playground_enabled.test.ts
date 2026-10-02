/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandlerContext } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core/server/mocks';
import { PLAYGROUND_ENABLED_SETTING_ID } from '../../common';
import { withPlaygroundEnabled } from './with_playground_enabled';

describe('withPlaygroundEnabled', () => {
  const uiSettingsGet = jest.fn();
  const handler = jest.fn();
  const request = httpServerMock.createKibanaRequest();
  const response = httpServerMock.createResponseFactory();
  const context = {
    core: Promise.resolve({ uiSettings: { client: { get: uiSettingsGet } } }),
  } as unknown as RequestHandlerContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls the wrapped handler when the setting is on', async () => {
    uiSettingsGet.mockResolvedValue(true);
    handler.mockResolvedValue('handled');

    const result = await withPlaygroundEnabled(handler)(context, request, response);

    expect(uiSettingsGet).toHaveBeenCalledWith(PLAYGROUND_ENABLED_SETTING_ID);
    expect(handler).toHaveBeenCalledWith(context, request, response);
    expect(result).toBe('handled');
  });

  it('responds with 404 and skips the handler when the setting is off', async () => {
    uiSettingsGet.mockResolvedValue(false);

    await withPlaygroundEnabled(handler)(context, request, response);

    expect(response.notFound).toHaveBeenCalled();
    expect(handler).not.toHaveBeenCalled();
  });
});
