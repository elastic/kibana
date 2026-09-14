/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient, KibanaResponseFactory } from '@kbn/core/server';
import { ENABLE_SIEM_READINESS_SETTING } from '../../../common/constants';
import { assertSiemReadinessEnabled } from './assert_siem_readiness_enabled';

describe('assertSiemReadinessEnabled', () => {
  const createUiSettingsClient = (enabled: boolean) =>
    ({
      get: jest.fn().mockResolvedValue(enabled),
    } as unknown as IUiSettingsClient);

  const createResponse = () => {
    const forbidden = jest.fn().mockReturnValue({ status: 403 });
    return {
      response: { forbidden } as unknown as KibanaResponseFactory,
      forbidden,
    };
  };

  it('returns undefined when the Advanced Setting is enabled', async () => {
    const uiSettingsClient = createUiSettingsClient(true);
    const { response, forbidden } = createResponse();

    const result = await assertSiemReadinessEnabled(uiSettingsClient, response);

    expect(result).toBeUndefined();
    expect(forbidden).not.toHaveBeenCalled();
    expect(uiSettingsClient.get).toHaveBeenCalledWith(ENABLE_SIEM_READINESS_SETTING);
  });

  it('returns a 403 response when the Advanced Setting is disabled', async () => {
    const uiSettingsClient = createUiSettingsClient(false);
    const { response, forbidden } = createResponse();

    const result = await assertSiemReadinessEnabled(uiSettingsClient, response);

    expect(result).toEqual({ status: 403 });
    expect(forbidden).toHaveBeenCalledWith({
      body: `${ENABLE_SIEM_READINESS_SETTING} feature must be activated first`,
    });
  });
});
