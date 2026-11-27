/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useMobilePanelData } from '../use_mobile_panel_data';
import { useMobileAppStarts } from './use_mobile_app_starts';

jest.mock('../use_mobile_panel_data');

describe('useMobileAppStarts', () => {
  it('reads the app_starts route, the response as `appStarts`', () => {
    const response = { histogram: {} };
    const refresh = jest.fn();
    jest
      .mocked(useMobilePanelData)
      .mockReturnValue({ response, isLoading: false, error: undefined, refresh } as never);

    const { result } = renderHook(() => useMobileAppStarts('shop-mobile'));

    const [[request, serviceName]] = jest.mocked(useMobilePanelData).mock.calls;
    expect(serviceName).toBe('shop-mobile');
    const fetch = jest.fn().mockResolvedValue(response);
    const options = { signal: new AbortController().signal, params: {} };
    request({ fetch } as never, options as never);
    expect(fetch).toHaveBeenCalledWith(
      'GET /internal/digital_experience/mobile_applications/{serviceName}/app_starts',
      options
    );
    expect(result.current).toEqual({
      appStarts: response,
      isLoading: false,
      error: undefined,
      refresh,
    });
  });
});
