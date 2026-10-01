/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { NoDataPageProps } from '@kbn/shared-ux-page-no-data-types';

jest.mock('react-router-dom', () => ({ useLocation: jest.fn() }));
jest.mock('../hooks/use_async', () => ({
  ...jest.requireActual('../hooks/use_async'),
  useAsync: jest.fn(),
}));
jest.mock('../hooks/use_profiling_router');
jest.mock('./contexts/license/use_license_context');
jest.mock('./contexts/profiling_dependencies/use_profiling_dependencies');
jest.mock('./contexts/profiling_setup_status/use_profiling_setup_status');
jest.mock('./profiling_app_page_template', () => ({
  ProfilingAppPageTemplate: ({
    children,
    noDataConfig,
  }: {
    children?: React.ReactNode;
    noDataConfig?: NoDataPageProps;
  }) =>
    noDataConfig ? (
      <div data-test-subj={noDataConfig.action.elasticAgent['data-test-subj']} />
    ) : (
      <>{children}</>
    ),
}));

import { useLocation } from 'react-router-dom';
import { AsyncStatus, useAsync } from '../hooks/use_async';
import { useProfilingRouter } from '../hooks/use_profiling_router';
import { useLicenseContext } from './contexts/license/use_license_context';
import { useProfilingDependencies } from './contexts/profiling_dependencies/use_profiling_dependencies';
import { useProfilingSetupStatus } from './contexts/profiling_setup_status/use_profiling_setup_status';
import { CheckSetup } from './check_setup';

describe('CheckSetup', () => {
  const routerPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useLocation as jest.Mock).mockReturnValue({ pathname: '/stacktraces/threads' });
    (useProfilingRouter as jest.Mock).mockReturnValue({ push: routerPush });
    (useLicenseContext as jest.Mock).mockReturnValue({ hasAtLeast: () => true });
    (useProfilingSetupStatus as jest.Mock).mockReturnValue({ setProfilingSetupStatus: jest.fn() });
    (useProfilingDependencies as jest.Mock).mockReturnValue({
      start: {
        core: {
          docLinks: {},
          http: {},
          notifications: { toasts: { addError: jest.fn() } },
        },
      },
      services: { fetchHasSetup: jest.fn(), postSetupResources: jest.fn() },
    });
  });

  it('displays the setup screen when the status check fails', () => {
    (useAsync as jest.Mock).mockReturnValue({
      status: AsyncStatus.Settled,
      data: undefined,
      error: new Error('Error while checking plugin setup'),
      refresh: jest.fn(),
    });

    render(
      <CheckSetup>
        <div data-test-subj="profilingApp" />
      </CheckSetup>
    );

    expect(screen.getByTestId('profilingCheckSetupCard')).toBeInTheDocument();
    expect(screen.queryByTestId('profilingApp')).not.toBeInTheDocument();
    expect(routerPush).not.toHaveBeenCalled();
  });
});
