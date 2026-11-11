/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import type { HttpRequestGroup } from '../../../../common/types/network';
import { useKibanaServices } from '../../../hooks/use_kibana_services';
import { createUiSettingsMock } from '../../../test_utils/ui_settings_mock';
import { HttpRequestsPanel } from './http_requests_panel';

jest.mock('../../../hooks/use_kibana_services');

const REQUESTS: HttpRequestGroup[] = [
  {
    method: 'GET',
    url: 'https://api.example.com/products',
    count: 400,
    p95Ms: 250,
    failedCount: 50,
    failedRatio: 0.125,
  },
  {
    method: 'POST',
    url: 'https://api.example.com/cart',
    count: 3,
    p95Ms: null,
    failedCount: 0,
    failedRatio: null,
  },
];

const renderPanel = (requests = REQUESTS, isLoading = false) => {
  return render(<HttpRequestsPanel requests={requests} isLoading={isLoading} />, {
    wrapper: EuiProvider,
  });
};

beforeEach(() => {
  jest.mocked(useKibanaServices).mockReturnValue({
    uiSettings: createUiSettingsMock(),
  } as unknown as ReturnType<typeof useKibanaServices>);
});

describe('HttpRequestsPanel', () => {
  it('shows a row per method and URL with its count, p95 and failures', () => {
    renderPanel();

    expect(screen.getByRole('heading', { level: 2, name: 'HTTP requests' })).toBeInTheDocument();
    expect(screen.getByText('GET')).toBeInTheDocument();
    expect(screen.getByText('https://api.example.com/products')).toBeInTheDocument();
    expect(screen.getByText('400')).toBeInTheDocument();
    expect(screen.getByText('250 ms')).toBeInTheDocument();
    expect(screen.getByTestId('digitalExperienceNetworkHttpFailed')).toHaveTextContent(
      '12.5% (50)'
    );
    expect(screen.getByText('POST')).toBeInTheDocument();
  });

  it('shows a spinner while loading', () => {
    renderPanel(REQUESTS, true);

    expect(screen.getByTestId('digitalExperienceNetworkHttpRequestsLoading')).toBeInTheDocument();
  });

  it('shows the empty state without requests', () => {
    renderPanel([]);

    expect(screen.getByTestId('digitalExperienceNetworkHttpRequestsEmpty')).toBeInTheDocument();
  });
});
