/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { useApiClient } from '../../../hooks/use_api_client';
import { useEnvironment } from '../../../hooks/use_environment';
import { createFormatters, useFormatters } from '../../../hooks/use_formatters';
import { useQueryParam } from '../../../hooks/use_query_param';
import { useTimeRange } from '../../../hooks/use_time_range';
import { createUiSettingsMock } from '../../../test_utils/ui_settings_mock';
import { useMobilePanelData, type MobilePanelRequest } from './use_mobile_panel_data';

jest.mock('../../../hooks/use_api_client');
jest.mock('../../../hooks/use_environment');
jest.mock('../../../hooks/use_formatters', () => ({
  ...jest.requireActual('../../../hooks/use_formatters'),
  useFormatters: jest.fn(),
}));
jest.mock('../../../hooks/use_query_param');
jest.mock('../../../hooks/use_time_range');

const fetch = jest.fn();
const TIME_RANGE = { rangeFrom: '2021-01-18T12:00:00.000Z', rangeTo: '2021-01-18T13:00:00.000Z' };
const ENDPOINT = 'GET /internal/digital_experience/mobile_applications/{serviceName}/releases';
const request: MobilePanelRequest<unknown> = (apiClient, options) =>
  apiClient.fetch(ENDPOINT, options);
const RESPONSE = { histogram: {}, releases: [{ release: '1.0.0' }], series: [], markers: [] };

let release: string | undefined;

beforeEach(() => {
  release = undefined;
  fetch.mockReset().mockResolvedValue(RESPONSE);
  jest
    .mocked(useApiClient)
    .mockReturnValue({ fetch } as unknown as ReturnType<typeof useApiClient>);
  jest.mocked(useTimeRange).mockReturnValue({
    timeRange: TIME_RANGE,
    isTimeRangeInUrl: true,
    setTimeRange: jest.fn(),
  });
  jest
    .mocked(useEnvironment)
    .mockReturnValue({ environment: undefined, setEnvironment: jest.fn() });
  jest.mocked(useFormatters).mockReturnValue(createFormatters(createUiSettingsMock()));
  jest.mocked(useQueryParam).mockImplementation((name) => ({
    value: name === 'release' ? release : undefined,
    setValue: jest.fn(),
  }));
});

describe('useMobilePanelData', () => {
  it("asks the section's route in the user's time zone", async () => {
    const { result } = renderHook(() => useMobilePanelData(request, 'shop-mobile'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.response).toBe(RESPONSE);
    expect(fetch.mock.calls[0][0]).toBe(ENDPOINT);
    expect(fetch.mock.calls[0][1].params.query).toEqual(
      expect.objectContaining({ timeZone: 'UTC', start: TIME_RANGE.rangeFrom })
    );
  });

  it('shows no response of the last filters from the render the filters change in', async () => {
    const { result, rerender } = renderHook(() => useMobilePanelData(request, 'shop-mobile'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    release = '1.0.0';
    rerender();

    // Before the new request starts, not a frame with the old response and the new filter
    expect(result.current.isLoading).toBe(true);
    expect(result.current.response).toBeUndefined();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(fetch).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({
        params: expect.objectContaining({ query: expect.objectContaining({ release: '1.0.0' }) }),
      })
    );
  });

  it('resolves a relative range again on refresh, so it reads up to the new now', async () => {
    jest.useFakeTimers({ now: Date.parse('2021-01-18T13:00:00.000Z') });
    jest.mocked(useTimeRange).mockReturnValue({
      timeRange: { rangeFrom: 'now-1h', rangeTo: 'now' },
      isTimeRangeInUrl: true,
      setTimeRange: jest.fn(),
    });
    const { result } = renderHook(() => useMobilePanelData(request, 'shop-mobile'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    jest.setSystemTime(Date.parse('2021-01-18T13:05:00.000Z'));
    act(() => result.current.refresh());
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));

    const ends = fetch.mock.calls.map(([, { params }]) => params.query.end);
    expect(ends).toEqual(['2021-01-18T13:00:00.000Z', '2021-01-18T13:05:00.000Z']);
    jest.useRealTimers();
  });
});
