/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ProfilingStatus } from '@kbn/profiling-utils';

jest.mock('react-router-dom', () => ({ useLocation: jest.fn() }));
jest.mock('../hooks/use_profiling_router');
jest.mock('./contexts/license/use_license_context');
jest.mock('./contexts/profiling_dependencies/use_profiling_dependencies');
jest.mock('./contexts/profiling_status/use_profiling_status');
jest.mock('./license_prompt', () => ({
  LicensePrompt: () => <div data-test-subj="profilingLicensePrompt" />,
}));
jest.mock('./profiling_app_page_template', () => ({
  ProfilingAppPageTemplate: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

import { useLocation } from 'react-router-dom';
import { AsyncStatus } from '../hooks/use_async';
import { useProfilingRouter } from '../hooks/use_profiling_router';
import { AddDataTabs } from '../views/add_data_view/types';
import { useLicenseContext } from './contexts/license/use_license_context';
import { useProfilingDependencies } from './contexts/profiling_dependencies/use_profiling_dependencies';
import { useProfilingStatus } from './contexts/profiling_status/use_profiling_status';
import { CheckStatus } from './check_status';

// Minimal error shape recognized by `isHttpFetchError`.
const createHttpFetchError = (status: number, body?: object) =>
  Object.assign(new Error('Internal Server Error'), {
    name: 'HttpFetchError',
    request: {},
    response: { status },
    body,
  });

const makeStatus = ({
  isEnabled = true,
  otel = {},
  universalProfiling = {},
}: {
  isEnabled?: boolean;
  otel?: Partial<ProfilingStatus['otel']>;
  universalProfiling?: Partial<ProfilingStatus['universalProfiling']>;
} = {}): ProfilingStatus => ({
  isEnabled,
  otel: { isAvailable: true, hasData: false, ...otel },
  universalProfiling: {
    isAvailable: true,
    hasSetup: true,
    hasData: false,
    hasLegacyData: false,
    canSetup: true,
    ...universalProfiling,
  },
});

describe('CheckStatus', () => {
  const routerPush = jest.fn();
  const refresh = jest.fn();
  const showErrorDialog = jest.fn();

  const mockStatus = (state: { status?: AsyncStatus; data?: ProfilingStatus; error?: Error }) => {
    (useProfilingStatus as jest.Mock).mockReturnValue({
      status: AsyncStatus.Settled,
      refresh,
      ...state,
    });
  };

  const renderCheckStatus = (pathname = '/stacktraces/threads') => {
    (useLocation as jest.Mock).mockReturnValue({ pathname });
    render(
      <CheckStatus>
        <div data-test-subj="profilingApp" />
      </CheckStatus>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useProfilingRouter as jest.Mock).mockReturnValue({ push: routerPush });
    (useLicenseContext as jest.Mock).mockReturnValue({ hasAtLeast: () => true });
    (useProfilingDependencies as jest.Mock).mockReturnValue({
      start: { core: { notifications: { showErrorDialog } } },
    });
  });

  it('displays the license prompt without an enterprise license', () => {
    (useLicenseContext as jest.Mock).mockReturnValue({ hasAtLeast: () => false });
    mockStatus({ data: makeStatus({ otel: { hasData: true } }) });

    renderCheckStatus();

    expect(screen.getByTestId('profilingLicensePrompt')).toBeInTheDocument();
    expect(screen.queryByTestId('profilingApp')).not.toBeInTheDocument();
  });

  it.each([AsyncStatus.Init, AsyncStatus.Loading])(
    'displays the loading screen while the status is %s',
    (status) => {
      mockStatus({ status });

      renderCheckStatus();

      expect(screen.getByText('Loading data sources')).toBeInTheDocument();
      expect(screen.queryByTestId('profilingApp')).not.toBeInTheDocument();
      expect(routerPush).not.toHaveBeenCalled();
    }
  );

  describe('when the status cannot be determined', () => {
    const serverError = createHttpFetchError(500, {
      message: 'Error while checking the profiling status',
      attributes: { cause: 'search_phase_execution_exception' },
    });

    it('displays a generic error prompt without the server cause', () => {
      mockStatus({ error: serverError });

      renderCheckStatus();

      expect(screen.getByTestId('profilingStatusErrorPrompt')).toBeInTheDocument();
      expect(screen.queryByText(/search_phase_execution_exception/)).not.toBeInTheDocument();
      expect(screen.queryByTestId('profilingApp')).not.toBeInTheDocument();
      expect(routerPush).not.toHaveBeenCalled();
    });

    it('fetches the status again when retrying', () => {
      mockStatus({ error: serverError });

      renderCheckStatus();
      fireEvent.click(screen.getByTestId('profilingStatusErrorRetryButton'));

      expect(refresh).toHaveBeenCalledTimes(1);
    });

    it('shows the server cause in the error details dialog', () => {
      mockStatus({ error: serverError });

      renderCheckStatus();
      fireEvent.click(screen.getByTestId('profilingStatusErrorDetailsButton'));

      expect(showErrorDialog).toHaveBeenCalledWith({
        title: 'Unable to load the profiling status',
        error: expect.objectContaining({ message: 'search_phase_execution_exception' }),
      });
    });

    it('falls back to the response message when there is no cause', () => {
      mockStatus({ error: createHttpFetchError(500, { message: 'Request timed out' }) });

      renderCheckStatus();
      fireEvent.click(screen.getByTestId('profilingStatusErrorDetailsButton'));

      expect(showErrorDialog).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ message: 'Request timed out' }),
        })
      );
    });

    it('passes non-HTTP errors to the details dialog unchanged', () => {
      const error = new Error('unexpected');
      mockStatus({ error });

      renderCheckStatus();
      fireEvent.click(screen.getByTestId('profilingStatusErrorDetailsButton'));

      expect(showErrorDialog).toHaveBeenCalledWith(expect.objectContaining({ error }));
    });
  });

  it('redirects to the not enabled page when profiling is disabled in Elasticsearch', () => {
    mockStatus({ data: makeStatus({ isEnabled: false }) });

    renderCheckStatus();

    expect(routerPush).toHaveBeenCalledWith('/profiling-not-enabled', { path: {}, query: {} });
    expect(screen.queryByTestId('profilingApp')).not.toBeInTheDocument();
  });

  it('redirects to the deletion instructions when data from before 8.9.1 exists', () => {
    mockStatus({
      data: makeStatus({ universalProfiling: { hasData: true, hasLegacyData: true } }),
    });

    renderCheckStatus();

    expect(routerPush).toHaveBeenCalledWith('/delete_data_instructions', {
      path: {},
      query: {},
    });
    expect(screen.queryByTestId('profilingApp')).not.toBeInTheDocument();
  });

  it.each([
    ['Universal Profiling data', makeStatus({ universalProfiling: { hasData: true } })],
    ['OTel data', makeStatus({ otel: { hasData: true } })],
    [
      'data in both schemas',
      makeStatus({ otel: { hasData: true }, universalProfiling: { hasData: true } }),
    ],
  ])('displays the app when there is %s', (_name, data) => {
    mockStatus({ data });

    renderCheckStatus();

    expect(screen.getByTestId('profilingApp')).toBeInTheDocument();
    expect(routerPush).not.toHaveBeenCalled();
  });

  it.each([
    [
      'Universal Profiling is available but not set up',
      makeStatus({ universalProfiling: { hasSetup: false } }),
    ],
    ['Universal Profiling is set up but has no data', makeStatus()],
    [
      'Universal Profiling is not available',
      makeStatus({
        universalProfiling: { isAvailable: false, hasSetup: false, canSetup: false },
      }),
    ],
  ])('redirects to the add data page when %s and there is no data', (_name, data) => {
    mockStatus({ data });

    renderCheckStatus();

    expect(routerPush).toHaveBeenCalledWith('/add-data-instructions', {
      path: {},
      query: { selectedTab: AddDataTabs.Kubernetes },
    });
    expect(screen.queryByTestId('profilingApp')).not.toBeInTheDocument();
  });

  it.each(['/add-data-instructions', '/delete_data_instructions', '/profiling-not-enabled'])(
    'displays %s without redirecting when there is no data',
    (pathname) => {
      mockStatus({ data: makeStatus({ universalProfiling: { hasSetup: false } }) });

      renderCheckStatus(pathname);

      expect(screen.getByTestId('profilingApp')).toBeInTheDocument();
      expect(routerPush).not.toHaveBeenCalled();
    }
  );
});
