/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';

import { MlJobLink } from './ml_job_link';
import { TestProviders } from '../../../../common/mock';

jest.mock('../../../../common/lib/kibana', () => {
  const originalModule = jest.requireActual('../../../../common/lib/kibana');
  return {
    ...originalModule,
    useKibana: jest.fn().mockReturnValue({
      services: { theme: { theme$: {} }, http: { basePath: { get: jest.fn(() => {}) } } },
    }),
  };
});

describe('MlJobLink', () => {
  it('renders job name when available', () => {
    const jobName = 'test_job_name';
    const { getByTestId } = render(<MlJobLink jobId={'test_job_id'} jobName={jobName} />, {
      wrapper: TestProviders,
    });

    expect(getByTestId('machineLearningJobLink')).toHaveTextContent(jobName);
  });

  it('renders job id when job name is unavailable', () => {
    const jobId = 'test_job_id';
    const { getByTestId } = render(<MlJobLink jobId={jobId} jobName={undefined} />, {
      wrapper: TestProviders,
    });

    expect(getByTestId('machineLearningJobLink')).toHaveTextContent(jobId);
  });
});
