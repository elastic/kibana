/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { PrivilegedAccessDetectionsPanel } from '.';
import { TestProviders } from '../../../../../common/mock';
import { useQueryToggle } from '../../../../../common/containers/query_toggle';
import { usePrivilegedAccessDetectionRoutes } from './pad_routes';
import userEvent from '@testing-library/user-event';

jest.mock('../../../../../common/containers/query_toggle', () => ({
  useQueryToggle: jest.fn(),
}));

jest.mock('./pad_routes', () => ({
  usePrivilegedAccessDetectionRoutes: jest.fn(),
}));

const mockAllRoutes = {
  getPrivilegedAccessDetectionStatus: jest.fn(),
  setupPrivilegedAccessDetectionMlModule: jest.fn(),
  installPrivilegedAccessDetectionPackage: jest.fn(),
};

const promiseThatNeverSettles = () => new Promise(() => {});

describe('PrivilegedAccessDetectionsPanel', () => {
  const mockUseQueryToggle = useQueryToggle as jest.Mock;
  const mockUsePrivilegedAccessDetectionRoutes = usePrivilegedAccessDetectionRoutes as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQueryToggle.mockReturnValue({
      toggleStatus: true,
      setToggleStatus: jest.fn(),
    });
    mockUsePrivilegedAccessDetectionRoutes.mockReturnValue({
      ...mockAllRoutes,
    });
  });

  it(`renders a loading element when we don't yet have a status`, async () => {
    mockUsePrivilegedAccessDetectionRoutes.mockReturnValue({
      ...mockAllRoutes,
      getPrivilegedAccessDetectionStatus: () => promiseThatNeverSettles(),
    });
    render(<PrivilegedAccessDetectionsPanel spaceId={'default'} />, { wrapper: TestProviders });

    await waitFor(() => expect(screen.getByTestId('pad-loading-status')).toBeInTheDocument());
  });

  it(`renders the enablement prompt if the package hasn't been installed`, async () => {
    mockUsePrivilegedAccessDetectionRoutes.mockReturnValue({
      ...mockAllRoutes,
      getPrivilegedAccessDetectionStatus: () => ({
        package_installation_status: 'incomplete',
        ml_module_setup_status: 'incomplete',
        jobs: [],
      }),
    });
    render(<PrivilegedAccessDetectionsPanel spaceId={'default'} />, { wrapper: TestProviders });

    await waitFor(() =>
      expect(screen.getByText('Enable Privileged access detection.')).toBeInTheDocument()
    );
  });

  it(`renders enablement even if only the ML module hasn't been set up`, async () => {
    mockUsePrivilegedAccessDetectionRoutes.mockReturnValue({
      ...mockAllRoutes,
      getPrivilegedAccessDetectionStatus: () => ({
        package_installation_status: 'complete',
        ml_module_setup_status: 'incomplete',
        jobs: [],
      }),
    });
    render(<PrivilegedAccessDetectionsPanel spaceId={'default'} />, { wrapper: TestProviders });

    await waitFor(() =>
      expect(screen.getByText('Enable Privileged access detection.')).toBeInTheDocument()
    );
  });

  it(`once installation is complete, ensure the header is visible`, async () => {
    mockUsePrivilegedAccessDetectionRoutes.mockReturnValue({
      ...mockAllRoutes,
      getPrivilegedAccessDetectionStatus: () => ({
        package_installation_status: 'complete',
        ml_module_setup_status: 'complete',
        jobs: [],
      }),
    });
    render(<PrivilegedAccessDetectionsPanel spaceId={'default'} />, { wrapper: TestProviders });

    await waitFor(() =>
      expect(screen.getByText('Top privileged access detection anomalies')).toBeInTheDocument()
    );
  });

  it('shows a loading state while installation is in progress', async () => {
    mockUsePrivilegedAccessDetectionRoutes.mockReturnValue({
      ...mockAllRoutes,
      getPrivilegedAccessDetectionStatus: () => ({
        package_installation_status: 'incomplete',
        ml_module_setup_status: 'incomplete',
        jobs: [],
      }),
      installPrivilegedAccessDetectionPackage: () => promiseThatNeverSettles(),
    });
    render(<PrivilegedAccessDetectionsPanel spaceId={'default'} />, { wrapper: TestProviders });

    await waitFor(() =>
      expect(screen.getByText('Enable Privileged access detection.')).toBeInTheDocument()
    );

    await userEvent.click(screen.getByTestId('privilegedUserMonitoringEnablementButton'));

    await waitFor(() =>
      expect(screen.getByText('Installing Privileged access detection package')).toBeInTheDocument()
    );
  });
});
