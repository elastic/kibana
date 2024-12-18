/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import type { MlSummaryJob } from '@kbn/ml-plugin/public';

import { MlUserJobsDescription } from './ml_user_jobs_description';

import { useInstalledSecurityJobs } from '../../../../../common/components/ml/hooks/use_installed_security_jobs';

jest.mock(
  './ml_user_job_description',
  () =>
    ({
      MlUserJobDescription: (props) => {
        return <div data-test-subj="userMock">{props.job.id}</div>;
      },
    } as Record<string, React.FC<{ job: MlSummaryJob }>>)
);

jest.mock('../../../../../common/components/ml/hooks/use_installed_security_jobs');

const useInstalledSecurityJobsMock = useInstalledSecurityJobs as jest.Mock;

describe('MlUsersJobDescription', () => {
  it('should render null if user permissions absent', () => {
    useInstalledSecurityJobsMock.mockReturnValueOnce({ jobs: [], isMlUser: false });
    const { container } = render(<MlUserJobsDescription jobIds={['mock-1']} />);

    expect(container.firstChild).toBeNull();
  });

  it('should render only jobs with job ids passed as props', () => {
    useInstalledSecurityJobsMock.mockReturnValueOnce({
      jobs: [{ id: 'mock-1' }, { id: 'mock-2' }, { id: 'mock-3' }],
      isMlUser: true,
    });
    render(<MlUserJobsDescription jobIds={['mock-1', 'mock-2', 'mock-4']} />);

    const expectedJobs = screen.getAllByTestId('userMock');
    expect(expectedJobs).toHaveLength(2);
    expect(expectedJobs[0]).toHaveTextContent('mock-1');
    expect(expectedJobs[1]).toHaveTextContent('mock-2');
  });
});
