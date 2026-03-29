/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';

import { TestProviders } from '../../../common/mock';
import { useInstalledSecurityJobs } from '../../../common/components/ml/hooks/use_installed_security_jobs';
import { EaMlJobCallout } from '.';

jest.mock('../../../common/components/ml/hooks/use_installed_security_jobs');
jest.mock('../../../common/components/callouts/use_callout_storage', () => ({
  useCallOutStorage: () => ({
    isVisible: () => true,
    dismiss: jest.fn(),
  }),
}));

const mockUseInstalledSecurityJobs = jest.mocked(useInstalledSecurityJobs);

describe('EaMlJobCallout', () => {
  it('renders when pre-EA jobs are installed', () => {
    mockUseInstalledSecurityJobs.mockReturnValue({
      loading: false,
      jobs: [{ id: 'v3_linux_rare_metadata_process' }],
    });
    const { getByTestId, getByText } = render(
      <TestProviders>
        <EaMlJobCallout />
      </TestProviders>
    );
    expect(getByTestId('callout-ea-ml-job-callout')).toBeInTheDocument();
    expect(getByText('9.4')).toBeInTheDocument();
    expect(getByText('_ea')).toBeInTheDocument();
  });

  it('does not render if only EA jobs are installed', () => {
    mockUseInstalledSecurityJobs.mockReturnValue({
      loading: false,
      jobs: [{ id: 'v3_linux_rare_metadata_process_ea' }],
    });
    const { queryByTestId } = render(
      <TestProviders>
        <EaMlJobCallout />
      </TestProviders>
    );
    expect(queryByTestId('callout-ea-ml-job-callout')).not.toBeInTheDocument();
  });

  it('does not render while jobs are loading', () => {
    mockUseInstalledSecurityJobs.mockReturnValue({
      loading: true,
      jobs: [],
    });
    const { queryByTestId } = render(
      <TestProviders>
        <EaMlJobCallout />
      </TestProviders>
    );
    expect(queryByTestId('callout-ea-ml-job-callout')).not.toBeInTheDocument();
  });
});
