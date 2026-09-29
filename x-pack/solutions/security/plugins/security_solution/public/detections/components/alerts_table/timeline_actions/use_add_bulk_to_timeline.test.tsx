/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { renderHook } from '@testing-library/react';
import { useAddBulkToTimelineAction } from './use_add_bulk_to_timeline';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { TableId } from '@kbn/securitysolution-data-table';
import { PageScope } from '../../../../data_view_manager/constants';
import { TestProviders } from '../../../../common/mock';

// Mock all dependencies
vi.mock('../../../../common/components/user_privileges');
vi.mock('../../../../data_view_manager/hooks/use_data_view', () => {
      const mocked = {
      useDataView: vi.fn().mockReturnValue({
        dataView: { getRuntimeMappings: vi.fn().mockReturnValue({}) },
      }),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../../../data_view_manager/hooks/use_browser_fields', () => {
      const mocked = {
      useBrowserFields: vi.fn().mockReturnValue({}),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../../../data_view_manager/hooks/use_selected_patterns', () => {
      const mocked = {
      useSelectedPatterns: vi.fn().mockReturnValue([]),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../../../common/hooks/use_experimental_features', () => {
      const mocked = {
      useIsExperimentalFeatureEnabled: vi.fn().mockReturnValue(false),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../../../timelines/containers', () => {
      const mocked = {
      useTimelineEventsHandler: vi.fn().mockReturnValue([null, null, vi.fn()]),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../../../common/lib/kuery', () => {
      const mocked = {
      combineQueries: vi.fn().mockReturnValue({ filterQuery: '' }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./use_send_bulk_to_timeline', () => {
      const mocked = {
      useSendBulkToTimeline: vi.fn().mockReturnValue({
        sendBulkEventsToTimelineHandler: vi.fn(),
      }),
    };
      return { ...mocked, default: mocked };
    });

const mockUseUserPrivileges = useUserPrivileges as Mock;

const defaultProps = {
  localFilters: [],
  tableId: TableId.alertsOnAlertsPage,
  from: '2020-07-07T08:20:18.966Z',
  to: '2020-07-08T08:20:18.966Z',
  scopeId: PageScope.alerts,
};

describe('useAddBulkToTimelineAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when the user has timeline read privileges', () => {
    beforeEach(() => {
      mockUseUserPrivileges.mockReturnValue({
        timelinePrivileges: { read: true },
      });
    });

    it('should return timeline action', () => {
      const { result } = renderHook(() => useAddBulkToTimelineAction(defaultProps), {
        wrapper: TestProviders,
      });

      expect(result.current).toHaveLength(1);
      expect(result.current[0]).toMatchObject({
        label: expect.any(String),
        onClick: expect.any(Function),
        key: 'add-bulk-to-timeline',
        'data-test-subj': 'investigate-bulk-in-timeline',
        icon: 'timeline',
        groupId: 'timeline',
      });
    });
  });

  describe('when the user does not have timeline read privileges', () => {
    beforeEach(() => {
      mockUseUserPrivileges.mockReturnValue({
        timelinePrivileges: { read: false },
      });
    });

    it('should return empty actions array', () => {
      const { result } = renderHook(() => useAddBulkToTimelineAction(defaultProps), {
        wrapper: TestProviders,
      });

      expect(result.current).toHaveLength(0);
      expect(result.current).toEqual([]);
    });
  });
});
