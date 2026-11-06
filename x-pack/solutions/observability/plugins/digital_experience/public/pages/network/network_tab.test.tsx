/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { createRepositoryClient } from '@kbn/server-route-repository-client';
import type { ApplicationNetworkResponse } from '../../../common/types/network';
import { useEnvironment } from '../../hooks/use_environment';
import { useKibanaServices } from '../../hooks/use_kibana_services';
import { useTimeRange } from '../../hooks/use_time_range';
import { createUiSettingsMock } from '../../test_utils/ui_settings_mock';
import { NetworkTab } from './network_tab';

jest.mock('@kbn/server-route-repository-client');
jest.mock('../../hooks/use_kibana_services');
jest.mock('../../hooks/use_environment');
jest.mock('../../hooks/use_time_range', () => {
  return {
    ...jest.requireActual('../../hooks/use_time_range'),
    useTimeRange: jest.fn(),
  };
});

const NETWORK_ENDPOINT = 'GET /internal/digital_experience/applications/{serviceName}/network';

const RESPONSE: ApplicationNetworkResponse = {
  serviceName: 'shop',
  httpRequests: [
    {
      method: 'POST',
      url: 'https://shop.example.com/api/checkout',
      count: 1,
      p95Ms: 50,
      failedCount: 1,
      failedRatio: 1,
    },
  ],
  slowestResources: [
    {
      url: 'https://shop.example.com/static/app.js',
      initiatorType: 'script',
      renderBlocking: true,
      count: 2,
      p75Ms: 1800,
      transferSizeP75Bytes: 120000,
    },
    {
      url: 'https://shop.example.com/static/style.css',
      initiatorType: 'link',
      renderBlocking: false,
      count: 1,
      p75Ms: 900,
      transferSizeP75Bytes: 20000,
    },
    {
      url: 'https://cdn.example.net/widget.js',
      initiatorType: 'script',
      renderBlocking: false,
      count: 1,
      p75Ms: 300,
      transferSizeP75Bytes: 9000,
    },
  ],
  environments: ['production'],
};

const timeRange = { rangeFrom: '2021-01-18T12:00:00.000Z', rangeTo: '2021-01-18T13:00:00.000Z' };
const fetch = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  fetch.mockResolvedValue(RESPONSE);
  jest
    .mocked(createRepositoryClient)
    .mockReturnValue({ fetch } as unknown as ReturnType<typeof createRepositoryClient>);
  jest
    .mocked(useEnvironment)
    .mockReturnValue({ environment: undefined, setEnvironment: jest.fn() });
  jest
    .mocked(useTimeRange)
    .mockReturnValue({ timeRange, isTimeRangeInUrl: true, setTimeRange: jest.fn() });
  jest.mocked(useKibanaServices).mockReturnValue({
    http: {},
    uiSettings: createUiSettingsMock(),
    unifiedSearch: {
      ui: {
        SearchBar: () => {
          return null;
        },
      },
    },
  } as unknown as ReturnType<typeof useKibanaServices>);
});

describe('NetworkTab', () => {
  it('asks for the requests and resources of the application in the time range', async () => {
    render(<NetworkTab serviceName="shop" />, { wrapper: EuiProvider });

    await waitFor(() => {
      return expect(fetch).toHaveBeenCalledWith(
        NETWORK_ENDPOINT,
        expect.objectContaining({
          params: {
            path: { serviceName: 'shop' },
            query: { start: timeRange.rangeFrom, end: timeRange.rangeTo },
          },
        })
      );
    });
  });

  it('shows the requests and the resources, with the host of resources from other origins', async () => {
    render(<NetworkTab serviceName="shop" />, { wrapper: EuiProvider });

    expect(await screen.findByText('https://shop.example.com/api/checkout')).toBeInTheDocument();
    expect(screen.getByText('https://shop.example.com/static/app.js')).toBeInTheDocument();
    expect(screen.getByText('https://cdn.example.net/widget.js')).toBeInTheDocument();
    expect(screen.getAllByTestId('digitalExperienceNetworkRenderBlocking')).toHaveLength(1);
  });

  it('shows the error with a retry that loads the requests again', async () => {
    fetch.mockRejectedValueOnce(new Error('Could not load.'));
    render(<NetworkTab serviceName="shop" />, { wrapper: EuiProvider });

    expect(await screen.findByTestId('digitalExperienceNetworkError')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('digitalExperienceNetworkRetry'));

    expect(await screen.findByText('https://shop.example.com/static/app.js')).toBeInTheDocument();
  });
});
