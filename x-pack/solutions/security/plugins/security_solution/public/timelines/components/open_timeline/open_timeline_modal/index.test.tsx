/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { mount } from 'enzyme';
import type { ReactElement } from 'react';
import React from 'react';

import { TestProviders } from '../../../../common/mock/test_providers';
import { mockOpenTimelineQueryResults } from '../../../../common/mock/timeline_results';
import { useGetAllTimeline, getAllTimeline } from '../../../containers/all';
import { useTimelineStatus } from '../use_timeline_status';
import { OpenTimelineModal } from '.';
import { useUserPrivileges } from '../../../../common/components/user_privileges';

vi.mock('../../../../common/lib/kibana', async () => {
  const actual = (await vi.importActual('../../../../common/lib/kibana'));
  return {
    ...actual,
    useNavigation: vi.fn().mockReturnValue({
      getAppUrl: vi.fn(),
      navigateTo: vi.fn(),
    }),
  };
});

vi.mock('../../../containers/all', async () => {
  const originalModule = (await vi.importActual('../../../containers/all'));
  return {
    useGetAllTimeline: vi.fn(),
    getAllTimeline: originalModule.getAllTimeline,
  };
});
vi.mock('../use_timeline_types', () => {
      const mocked = {
      useTimelineTypes: vi.fn(() => ({
        timelineType: 'default',
        timelineTabs: <div />,
        timelineFilters: <div />,
      })),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../use_timeline_status', () => {
      const mocked = {
      useTimelineStatus: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

// mock for EuiSelectable's virtualization
vi.mock(
  'react-virtualized-auto-sizer',
  () =>
    ({ children }: { children: (dimensions: { width: number; height: number }) => ReactElement }) =>
      children({ width: 100, height: 500 })
);

vi.mock('../../../../common/components/user_privileges');

describe('OpenTimelineModal', () => {
  const mockInstallPrepackagedTimelines = vi.fn();
  beforeEach(() => {
    (useGetAllTimeline as unknown as Mock).mockReturnValue({
      fetchAllTimeline: vi.fn(),
      timelines: getAllTimeline('', mockOpenTimelineQueryResults.timeline ?? []),
      loading: false,
      totalCount: mockOpenTimelineQueryResults.totalCount,
    });
    (useTimelineStatus as unknown as Mock).mockReturnValue({
      timelineStatus: null,
      templateTimelineType: null,
      templateTimelineFilter: <div />,
      installPrepackagedTimelines: mockInstallPrepackagedTimelines,
    });
    (useUserPrivileges as Mock).mockReturnValue({
      timelinePrivileges: { crud: true },
    });
  });

  afterEach(() => {
    mockInstallPrepackagedTimelines.mockClear();
  });

  test('it renders the expected modal', async () => {
    const wrapper = mount(
      <TestProviders>
        <OpenTimelineModal onClose={vi.fn()} />
      </TestProviders>
    );

    wrapper.update();

    expect(wrapper.find('div[data-test-subj="open-timeline-modal"].euiModal').length).toEqual(1);
  });

  test('it installs elastic prebuilt templates', async () => {
    const wrapper = mount(
      <TestProviders>
        <OpenTimelineModal onClose={vi.fn()} />
      </TestProviders>
    );

    wrapper.update();

    expect(mockInstallPrepackagedTimelines).toHaveBeenCalled();
  });
});
