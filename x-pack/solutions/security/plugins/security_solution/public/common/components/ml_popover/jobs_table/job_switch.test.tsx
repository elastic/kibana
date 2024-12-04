/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow, mount } from 'enzyme';
import React from 'react';

import { waitFor } from '@testing-library/react';
import { JobSwitchComponent } from './job_switch';
import { cloneDeep } from 'lodash/fp';
import { mockSecurityJobs } from '../api.mock';
import type { SecurityJob } from '../types';

describe('JobSwitch', () => {
  let securityJobs: SecurityJob[];
  let onJobStateChangeMock = jest.fn();
  beforeEach(() => {
    securityJobs = cloneDeep(mockSecurityJobs);
    onJobStateChangeMock = jest.fn();
  });

  test('renders correctly against snapshot', () => {
    const wrapper = shallow(
      <JobSwitchComponent
        job={securityJobs[0]}
        isSecurityJobsLoading={false}
        onJobStateChange={onJobStateChangeMock}
      />
    );
    expect(wrapper).toMatchSnapshot();
  });

  test('should call onJobStateChange when the switch is clicked to be true/open', async () => {
    const wrapper = mount(
      <JobSwitchComponent
        job={securityJobs[0]}
        isSecurityJobsLoading={false}
        onJobStateChange={onJobStateChangeMock}
      />
    );

    wrapper
      .find('button[data-test-subj="job-switch"]')
      .first()
      .simulate('click', {
        target: { checked: true },
      });
    await waitFor(() => {
      expect(onJobStateChangeMock.mock.calls[0][0].id).toEqual(
        'linux_anomalous_network_activity_ecs'
      );
      expect(onJobStateChangeMock.mock.calls[0][1]).toEqual(1571022859393);
      expect(onJobStateChangeMock.mock.calls[0][2]).toEqual(true);
    });
  });

  test('should have a switch when it is not in the loading state', () => {
    const wrapper = mount(
      <JobSwitchComponent
        isSecurityJobsLoading={false}
        job={securityJobs[0]}
        onJobStateChange={onJobStateChangeMock}
      />
    );
    expect(wrapper.find('[data-test-subj="job-switch"]').exists()).toBe(true);
  });

  test('should not have a switch when it is in the loading state', () => {
    const wrapper = mount(
      <JobSwitchComponent
        isSecurityJobsLoading={true}
        job={securityJobs[0]}
        onJobStateChange={onJobStateChangeMock}
      />
    );
    expect(wrapper.find('[data-test-subj="job-switch"]').exists()).toBe(false);
  });
});
