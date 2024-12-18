/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import noop from 'lodash/noop';
import { TestProviders } from '../../../../../common/mock';
import { useEnableDataFeed } from '../../../../../common/components/ml_popover/hooks/use_enable_data_feed';
import type { SecurityJob } from '../../../../../common/components/ml_popover/types';

import { MlAdminJobDescription } from './ml_admin_job_description';

jest.mock('../../../../../common/lib/kibana');
jest.mock('../../../../../common/components/ml_popover/hooks/use_enable_data_feed', () => ({
  useEnableDataFeed: jest.fn(),
}));

import { mockSecurityJobs } from '../../../../../common/components/ml_popover/api.mock';

const securityJobNotStarted: SecurityJob = {
  ...mockSecurityJobs[0],
  jobState: 'closed',
  datafeedState: 'stopped',
  auditMessage: {
    text: 'Test warning',
  },
};

const useEnableDataFeedMock = (useEnableDataFeed as jest.Mock).mockReturnValue({
  isLoading: false,
});

describe('MlAdminJobDescription', () => {
  it('should enable datafeed and call refreshJob when enabling job', async () => {
    const refreshJobSpy = jest.fn();
    const enableDatafeedSpy = jest.fn();
    useEnableDataFeedMock.mockReturnValueOnce({
      enableDatafeed: enableDatafeedSpy,
    });

    render(
      <MlAdminJobDescription
        job={securityJobNotStarted}
        refreshJob={refreshJobSpy}
        loading={false}
      />,
      {
        wrapper: TestProviders,
      }
    );

    await userEvent.click(screen.getByTestId('job-switch'));
    expect(enableDatafeedSpy).toHaveBeenCalledWith(
      securityJobNotStarted,
      securityJobNotStarted.latestTimestampMs
    );

    await waitFor(() => {
      expect(refreshJobSpy).toHaveBeenCalledWith(securityJobNotStarted);
    });
  });

  it('should render loading spinner when job start is in progress', async () => {
    useEnableDataFeedMock.mockReturnValueOnce({
      isLoading: true,
    });

    render(
      <MlAdminJobDescription job={securityJobNotStarted} refreshJob={noop} loading={false} />,
      {
        wrapper: TestProviders,
      }
    );

    expect(screen.getByTestId('job-switch-loader')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByTestId('job-switch')).toBeNull();
    });
  });

  it('should render loading spinner when loading property passed', async () => {
    render(<MlAdminJobDescription job={securityJobNotStarted} refreshJob={noop} loading />, {
      wrapper: TestProviders,
    });

    expect(screen.getByTestId('job-switch-loader')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByTestId('job-switch')).toBeNull();
    });
  });

  it('should render job details correctly', async () => {
    render(<MlAdminJobDescription job={securityJobNotStarted} refreshJob={noop} loading />, {
      wrapper: TestProviders,
    });

    // link to job
    const linkElement = screen.getByTestId('machineLearningJobLink');

    expect(linkElement).toHaveAttribute('href', expect.any(String));
    expect(linkElement).toHaveTextContent(
      securityJobNotStarted.customSettings?.security_app_display_name!
    );

    // audit icon
    expect(screen.getByTestId('mlJobAuditIcon')).toBeInTheDocument();

    // job status
    expect(screen.getByTestId('machineLearningJobStatus')).toHaveTextContent('Stopped');

    // job action label
    await waitFor(() => {
      expect(screen.getByTestId('mlJobActionLabel')).toHaveTextContent('Run job');
    });
  });
});
