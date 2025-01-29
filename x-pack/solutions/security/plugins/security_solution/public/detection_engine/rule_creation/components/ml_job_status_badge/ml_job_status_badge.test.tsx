/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

import { isJobStarted } from '../../../../../common/machine_learning/helpers';
import { mockOpenedJob } from '../../../../common/components/ml_popover/api.mock';

import { MlJobStatusBadge } from './ml_job_status_badge';

jest.mock('../../../../../common/machine_learning/helpers');

const isJobStartedMock = isJobStarted as jest.Mock;

describe('MlJobStatusBadge', () => {
  it('should call isJobStarted helper', () => {
    render(<MlJobStatusBadge job={mockOpenedJob} />);

    expect(isJobStarted).toHaveBeenCalledWith(mockOpenedJob.jobState, mockOpenedJob.datafeedState);
  });

  it('should render started if isJobStarted return true', () => {
    isJobStartedMock.mockReturnValueOnce(true);
    render(<MlJobStatusBadge job={mockOpenedJob} />);

    expect(screen.getByTestId('machineLearningJobStatus')).toHaveTextContent('Started');
  });

  it('should render stopped if isJobStarted return false', () => {
    isJobStartedMock.mockReturnValueOnce(false);
    render(<MlJobStatusBadge job={mockOpenedJob} />);

    expect(screen.getByTestId('machineLearningJobStatus')).toHaveTextContent('Stopped');
  });
});
