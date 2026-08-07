/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';
import { JobsTableFiltersComponent } from './jobs_table_filters';
import type { SecurityJob } from '../../types';
import { cloneDeep } from 'lodash/fp';
import { mockSecurityJobs } from '../../api.mock';

describe('JobsTableFilters', () => {
  let securityJobs: SecurityJob[];

  beforeEach(() => {
    securityJobs = cloneDeep(mockSecurityJobs);
  });

  test('defaults to Elastic jobs filter selected', () => {
    const onFilterChanged = jest.fn();
    const wrapper = mount(
      <JobsTableFiltersComponent securityJobs={securityJobs} onFilterChanged={onFilterChanged} />
    );

    expect(
      wrapper.find('[data-test-subj="prebuilt-jobs-filter-button-group"]').first().prop('idSelected')
    ).toEqual('elastic');
  });

  test('when you select Custom jobs, filter selection changes', () => {
    const onFilterChanged = jest.fn();
    const wrapper = mount(
      <JobsTableFiltersComponent securityJobs={securityJobs} onFilterChanged={onFilterChanged} />
    );

    wrapper
      .find('button[data-test-subj="show-custom-jobs-filter-button"]')
      .first()
      .simulate('click');
    wrapper.update();

    expect(
      wrapper.find('[data-test-subj="prebuilt-jobs-filter-button-group"]').first().prop('idSelected')
    ).toEqual('custom');
  });
});
