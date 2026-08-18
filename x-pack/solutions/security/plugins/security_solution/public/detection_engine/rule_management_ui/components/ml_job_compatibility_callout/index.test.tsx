/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';

import { TestProviders } from '../../../../common/mock';
import { useInstalledSecurityJobs } from '../../../../common/components/ml/hooks/use_installed_security_jobs';
import { MlJobCompatibilityCallout } from '.';
import { MAX_VISIBLE_AFFECTED_JOBS } from './callout_body';

jest.mock('../../../../common/components/ml/hooks/use_installed_security_jobs');

const mockUseInstalledSecurityJobs = useInstalledSecurityJobs as jest.Mock;

const CALLOUT = '[data-test-subj="callout-ml-job-compatibility"]';
const DISMISS_BUTTON = '[data-test-subj="callout-dismiss-btn"]';
const VIEW_ALL_LINK = '[data-test-subj="mlJobCompatibilityViewAllAffectedJobs"]';
const AFFECTED_JOBS_MODAL = '[data-test-subj="mlJobCompatibilityAffectedJobsModal"]';

const renderCallout = () =>
  mount(
    <TestProviders>
      <MlJobCompatibilityCallout />
    </TestProviders>
  );

describe('MlJobCompatibilityCallout', () => {
  afterEach(() => {
    // The timed dismissal persists to localStorage, so reset it between tests.
    localStorage.clear();
  });

  it('renders when new affected jobs are installed', () => {
    mockUseInstalledSecurityJobs.mockReturnValue({
      loading: false,
      jobs: [{ id: 'v2_linux_rare_metadata_process' }],
    });
    const wrapper = renderCallout();
    expect(wrapper.exists(CALLOUT)).toEqual(true);
  });

  it('renders when old affected jobs are installed', () => {
    mockUseInstalledSecurityJobs.mockReturnValue({
      loading: false,
      jobs: [{ id: 'linux_rare_metadata_process' }],
    });
    const wrapper = renderCallout();
    expect(wrapper.exists(CALLOUT)).toEqual(true);
  });

  it('lists only the affected installed job IDs', () => {
    mockUseInstalledSecurityJobs.mockReturnValue({
      loading: false,
      jobs: [
        { id: 'v2_linux_rare_metadata_process' },
        { id: 'high_count_network_denies' }, // not in the affected allowlist
        { id: 'linux_rare_metadata_process' },
      ],
    });
    const wrapper = renderCallout();
    const affectedJobs = wrapper
      .find('[data-test-subj="mlJobCompatibilityCalloutAffectedJobs"] li')
      .hostNodes();
    // Sorted alphabetically; the unaffected job is excluded.
    expect(affectedJobs.map((item) => item.text())).toEqual([
      'linux_rare_metadata_process',
      'v2_linux_rare_metadata_process',
    ]);
  });

  it('does not show the "view all" link when the affected jobs fit inline', () => {
    mockUseInstalledSecurityJobs.mockReturnValue({
      loading: false,
      jobs: [{ id: 'v2_linux_rare_metadata_process' }, { id: 'linux_rare_metadata_process' }],
    });
    const wrapper = renderCallout();
    expect(wrapper.exists(VIEW_ALL_LINK)).toEqual(false);
  });

  it('caps the inline list and reveals the full list via a modal when there are too many jobs', () => {
    // 6 affected jobs (> MAX_VISIBLE_AFFECTED_JOBS = 5).
    const affectedJobIds = [
      'linux_rare_metadata_process',
      'linux_rare_metadata_user',
      'rare_process_by_host_linux_ecs',
      'v2_linux_rare_metadata_process',
      'v2_linux_rare_metadata_user',
      'v2_rare_process_by_host_linux_ecs',
    ];
    mockUseInstalledSecurityJobs.mockReturnValue({
      loading: false,
      jobs: affectedJobIds.map((id) => ({ id })),
    });
    const wrapper = renderCallout();

    // Only the first MAX_VISIBLE_AFFECTED_JOBS are shown inline.
    const inlineJobs = wrapper
      .find('[data-test-subj="mlJobCompatibilityCalloutAffectedJobs"] li')
      .hostNodes();
    expect(inlineJobs).toHaveLength(MAX_VISIBLE_AFFECTED_JOBS);
    expect(wrapper.exists(VIEW_ALL_LINK)).toEqual(true);
    expect(wrapper.exists(AFFECTED_JOBS_MODAL)).toEqual(false);

    // Clicking "view all" opens a modal listing every affected job.
    wrapper.find(VIEW_ALL_LINK).hostNodes().simulate('click');
    wrapper.update();

    expect(wrapper.exists(AFFECTED_JOBS_MODAL)).toEqual(true);
    const modalJobs = wrapper
      .find('[data-test-subj="mlJobCompatibilityAffectedJobsModalList"] li')
      .hostNodes();
    expect(modalJobs.map((item) => item.text())).toEqual(affectedJobIds);
  });

  it('does not render if no affected jobs are installed', () => {
    mockUseInstalledSecurityJobs.mockReturnValue({
      loading: false,
      jobs: [{ id: 'high_count_network_denies' }],
    });
    const wrapper = renderCallout();
    expect(wrapper.exists(CALLOUT)).toEqual(false);
  });

  it('does not render while jobs are loading', () => {
    mockUseInstalledSecurityJobs.mockReturnValue({
      loading: true,
      jobs: [],
    });
    const wrapper = renderCallout();
    expect(wrapper.exists(CALLOUT)).toEqual(false);
  });

  it('hides the callout after it is dismissed', () => {
    mockUseInstalledSecurityJobs.mockReturnValue({
      loading: false,
      jobs: [{ id: 'v2_linux_rare_metadata_process' }],
    });
    const wrapper = renderCallout();
    expect(wrapper.exists(CALLOUT)).toEqual(true);

    wrapper.find(DISMISS_BUTTON).hostNodes().simulate('click');
    wrapper.update();

    expect(wrapper.exists(CALLOUT)).toEqual(false);
  });

  it('keeps the callout hidden within the dismissal window for the same set of jobs', () => {
    mockUseInstalledSecurityJobs.mockReturnValue({
      loading: false,
      jobs: [{ id: 'v2_linux_rare_metadata_process' }],
    });
    const first = renderCallout();
    first.find(DISMISS_BUTTON).hostNodes().simulate('click');
    first.unmount();

    const second = renderCallout();
    expect(second.exists(CALLOUT)).toEqual(false);
  });

  it('re-surfaces the callout when the set of affected jobs changes', () => {
    mockUseInstalledSecurityJobs.mockReturnValue({
      loading: false,
      jobs: [{ id: 'v2_linux_rare_metadata_process' }],
    });
    const first = renderCallout();
    first.find(DISMISS_BUTTON).hostNodes().simulate('click');
    first.unmount();

    mockUseInstalledSecurityJobs.mockReturnValue({
      loading: false,
      jobs: [{ id: 'linux_rare_metadata_process' }],
    });
    const second = renderCallout();
    expect(second.exists(CALLOUT)).toEqual(true);
  });
});
