/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { GettingStartedRedirectGate } from './getting_started_redirect_gate';
import { GETTING_STARTED_SESSIONSTORAGE_KEY } from '@kbn/search-shared-ui';

jest.mock('@kbn/search-shared-ui', () => ({
  GETTING_STARTED_SESSIONSTORAGE_KEY: 'gettingStartedVisited',
}));

const mockUseKibana = jest.fn();
jest.mock('../hooks/use_kibana', () => ({
  useKibana: () => mockUseKibana(),
}));

const mockUseGetLicenseInfo = jest.fn();
jest.mock('../hooks/use_get_license_info', () => ({
  useGetLicenseInfo: () => mockUseGetLicenseInfo(),
}));

const mockUseStats = jest.fn();
jest.mock('../hooks/api/use_stats', () => ({
  useStats: () => mockUseStats(),
}));

describe('GettingStartedRedirectGate', () => {
  const navigateToApp = jest.fn();
  const coreStartMock = {
    application: {
      navigateToApp,
    },
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
    mockUseStats.mockReturnValue({
      data: { hasNoDocuments: false, size: 0 },
      isLoading: false,
      isError: false,
    });
    mockUseGetLicenseInfo.mockReturnValue({ isTrial: true });
    mockUseKibana.mockReturnValue({
      services: { cloud: undefined, isCloudEnabled: undefined },
    });
  });

  const renderGate = () =>
    render(
      <GettingStartedRedirectGate coreStart={coreStartMock}>
        <div data-test-subj="child">Child content</div>
      </GettingStartedRedirectGate>
    );

  it('renders children when already visited', () => {
    sessionStorage.setItem(GETTING_STARTED_SESSIONSTORAGE_KEY, 'true');
    const { getByTestId } = renderGate();
    expect(getByTestId('child')).toBeInTheDocument();
    expect(navigateToApp).not.toHaveBeenCalled();
  });

  it('does NOT render children and redirects when not visited', async () => {
    const { queryByTestId } = renderGate();
    expect(queryByTestId('child')).not.toBeInTheDocument();
    await waitFor(() => expect(navigateToApp).toHaveBeenCalledWith('searchGettingStarted'));
  });

  it('redirects to getting started when user is on trial and has not visited', async () => {
    // cluster has data so only trial triggers redirect
    mockUseGetLicenseInfo.mockReturnValue({ isTrial: true });
    mockUseStats.mockReturnValue({
      data: { hasNoDocuments: false, size: 100 },
      isLoading: false,
      isError: false,
    });

    const { queryByTestId } = renderGate();
    expect(queryByTestId('child')).not.toBeInTheDocument();
    await waitFor(() => expect(navigateToApp).toHaveBeenCalledWith('searchGettingStarted'));
  });

  it('redirects when user is not on trial but has 0 documents', async () => {
    mockUseGetLicenseInfo.mockReturnValue({ isTrial: false });
    mockUseStats.mockReturnValue({
      data: { hasNoDocuments: true, size: 0 },
      isLoading: false,
      isError: false,
    });

    const { queryByTestId } = renderGate();
    expect(queryByTestId('child')).not.toBeInTheDocument();
    await waitFor(() => expect(navigateToApp).toHaveBeenCalledWith('searchGettingStarted'));
  });

  it('renders home page when user is not on trial and has documents', () => {
    mockUseGetLicenseInfo.mockReturnValue({ isTrial: false });
    mockUseStats.mockReturnValue({
      data: { hasNoDocuments: false, size: 100 },
      isLoading: false,
      isError: false,
    });

    const { getByTestId } = renderGate();
    expect(getByTestId('child')).toBeInTheDocument();
    expect(navigateToApp).not.toHaveBeenCalled();
  });

  it('redirects when serverless user is on trial and has 0 documents', async () => {
    mockUseKibana.mockReturnValue({
      services: {
        cloud: { isInTrial: () => true, isCloudEnabled: true },
      },
    });
    // isTrial is ignored in serverless; empty cluster reinforces redirect
    mockUseGetLicenseInfo.mockReturnValue({ isTrial: false });
    mockUseStats.mockReturnValue({
      data: { hasNoDocuments: true, size: 0 },
      isLoading: false,
      isError: false,
    });

    const { queryByTestId } = renderGate();
    expect(queryByTestId('child')).not.toBeInTheDocument();
    await waitFor(() => expect(navigateToApp).toHaveBeenCalledWith('searchGettingStarted'));
  });

  it('does NOT render children and redirects when visited=false', async () => {
    sessionStorage.setItem(GETTING_STARTED_SESSIONSTORAGE_KEY, 'false');
    const { queryByTestId } = renderGate();
    expect(queryByTestId('child')).not.toBeInTheDocument();
    await waitFor(() => expect(navigateToApp).toHaveBeenCalledWith('searchGettingStarted'));
  });
});
