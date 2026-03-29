/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';

import { TestProviders } from '../../../common/mock';
import { useInstalledSecurityJobs } from '../../../common/components/ml/hooks/use_installed_security_jobs';
import { EaMlJobCallout } from '.';

jest.mock('../../../common/components/ml/hooks/use_installed_security_jobs');

describe('EaMlJobCallout', () => {
  it('renders when pre-EA jobs are installed', () => {
    (useInstalledSecurityJobs as jest.Mock).mockReturnValue({
      loading: false,
      jobs: [{ id: 'v3_linux_rare_metadata_process' }],
    });
    const wrapper = mount(
      <TestProviders>
        <EaMlJobCallout />
      </TestProviders>
    );
    expect(wrapper.exists('[data-test-subj="callout-ea-ml-job-callout"]')).toEqual(true);
  });

  it('does not render if only EA jobs are installed', () => {
    (useInstalledSecurityJobs as jest.Mock).mockReturnValue({
      loading: false,
      jobs: [{ id: 'v3_linux_rare_metadata_process_ea' }],
    });
    const wrapper = mount(
      <TestProviders>
        <EaMlJobCallout />
      </TestProviders>
    );
    expect(wrapper.exists('[data-test-subj="callout-ea-ml-job-callout"]')).toEqual(false);
  });

  it('does not render while jobs are loading', () => {
    (useInstalledSecurityJobs as jest.Mock).mockReturnValue({
      loading: true,
      jobs: [],
    });
    const wrapper = mount(
      <TestProviders>
        <EaMlJobCallout />
      </TestProviders>
    );
    expect(wrapper.exists('[data-test-subj="callout-ea-ml-job-callout"]')).toEqual(false);
  });
});
