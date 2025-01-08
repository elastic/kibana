/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TestProviders } from '../../../../../common/mock';

import { MlUserJobDescription } from './ml_user_job_description';

jest.mock('../../../../../common/lib/kibana');

import { mockOpenedJob } from '../../../../../common/components/ml_popover/api.mock';

describe('MlUserJobDescription', () => {
  it('should render switch component disabled', async () => {
    render(<MlUserJobDescription job={mockOpenedJob} />, { wrapper: TestProviders });
    await waitFor(() => {
      expect(screen.getByTestId('mlUserJobSwitch')).toBeDisabled();
    });
  });

  it('should render toast that shows admin permissions required', async () => {
    render(<MlUserJobDescription job={mockOpenedJob} />, { wrapper: TestProviders });

    await userEvent.hover(screen.getByTestId('mlUserJobSwitch').parentNode as Element);

    await waitFor(() => {
      expect(
        screen.getByText('ML Admin Permissions required to perform this action')
      ).toBeInTheDocument();
    });
  });

  it('should render job details correctly', async () => {
    render(<MlUserJobDescription job={mockOpenedJob} />, {
      wrapper: TestProviders,
    });

    // link to job
    const linkElement = screen.getByTestId('machineLearningJobLink');

    expect(linkElement).toHaveAttribute('href', expect.any(String));
    expect(linkElement).toHaveTextContent(mockOpenedJob.id);

    // audit icon is not present as auditMessage empty
    expect(screen.queryByTestId('mlJobAuditIcon')).toBeNull();

    // job status
    expect(screen.getByTestId('machineLearningJobStatus')).toHaveTextContent('Started');

    // job action label
    await waitFor(() => {
      expect(screen.getByTestId('mlJobActionLabel')).toHaveTextContent('Stop job');
    });
  });
});
