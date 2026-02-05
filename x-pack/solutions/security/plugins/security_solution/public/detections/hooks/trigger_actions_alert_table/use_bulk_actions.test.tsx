/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';

import { useBulkActionsByTableType } from './use_bulk_actions';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import * as useBulkAlertAssigneesItemsModule from '../../../common/components/toolbar/bulk_actions/use_bulk_alert_assignees_items';
import * as useBulkAlertTagsItemsModule from '../../../common/components/toolbar/bulk_actions/use_bulk_alert_tags_items';
import * as useAddBulkToTimelineActionModule from '../../components/alerts_table/timeline_actions/use_add_bulk_to_timeline';
import * as useBulkAlertActionItemsModule from './use_alert_actions';
import type { TableId } from '@kbn/securitysolution-data-table';
import { PageScope } from '../../../data_view_manager/constants';
import { useUserPrivileges } from '../../../common/components/user_privileges';

jest.mock('../../../common/containers/use_global_time');
jest.mock('../../../common/hooks/use_selector');
jest.mock('../../../common/components/user_privileges');
jest.mock('../../../common/components/toolbar/bulk_actions/use_bulk_alert_assignees_items');
jest.mock('../../../common/components/toolbar/bulk_actions/use_bulk_alert_tags_items');
jest.mock('../../components/alerts_table/timeline_actions/use_add_bulk_to_timeline');
jest.mock('./use_alert_actions');

describe('useBulkActionsByTableType', () => {
  const mockRefresh = jest.fn();
  const mockTableId = 'test-table' as TableId;
  const mockQuery = { bool: { must: [{ match_all: {} }] } };

  beforeEach(() => {
    jest.clearAllMocks();

    (useUserPrivileges as jest.Mock).mockReturnValue({
      timelinePrivileges: { read: true },
    });

    (useGlobalTime as jest.Mock).mockReturnValue({
      from: '2020-07-07T08:20:18.966Z',
      to: '2020-07-08T08:20:18.966Z',
    });

    (useDeepEqualSelector as jest.Mock).mockImplementation(() => []);

    (useBulkAlertAssigneesItemsModule.useBulkAlertAssigneesItems as jest.Mock).mockReturnValue({
      alertAssigneesItems: [{ id: 'assignee' }],
      alertAssigneesPanels: [{ id: 'assigneePanel' }],
    });

    (useBulkAlertTagsItemsModule.useBulkAlertTagsItems as jest.Mock).mockReturnValue({
      alertTagsItems: [{ id: 'tag' }],
      alertTagsPanels: [{ id: 'tagPanel' }],
    });

    (useAddBulkToTimelineActionModule.useAddBulkToTimelineAction as jest.Mock).mockReturnValue({
      key: 'add-bulk-to-timeline',
    });

    (useBulkAlertActionItemsModule.useBulkAlertActionItems as jest.Mock).mockReturnValue({
      items: [{ id: 'action1' }, { id: 'action2' }],
      panels: [],
    });
  });

  it('correctly combines bulk actions and panels from hooks', () => {
    const { result } = renderHook(() =>
      useBulkActionsByTableType(mockTableId, mockQuery, mockRefresh)
    );

    expect(result.current).toEqual([
      {
        id: 0,
        items: [
          { id: 'action1' },
          { id: 'action2' },
          { key: 'add-bulk-to-timeline' },
          { id: 'tag' },
          { id: 'assignee' },
        ],
      },
      { id: 'tagPanel' },
      { id: 'assigneePanel' },
    ]);
  });

  it('does not include timeline action if user does not have timeline read access', () => {
    (useUserPrivileges as jest.Mock).mockReturnValue({
      timelinePrivileges: { read: false },
    });

    const { result } = renderHook(() =>
      useBulkActionsByTableType(mockTableId, mockQuery, mockRefresh)
    );

    const [bulkActionsGroup] = result.current;
    const timelineAction = bulkActionsGroup.items.find(
      (item) => item.key === 'add-bulk-to-timeline'
    );

    expect(timelineAction).toBeUndefined();
  });

  it('passes correct parameters to dependent hooks', () => {
    renderHook(() => useBulkActionsByTableType(mockTableId, mockQuery, mockRefresh));

    expect(useBulkAlertActionItemsModule.useBulkAlertActionItems).toHaveBeenCalledWith({
      scopeId: PageScope.alerts,
      filters: [],
      from: '2020-07-07T08:20:18.966Z',
      to: '2020-07-08T08:20:18.966Z',
      tableId: mockTableId,
      refetch: expect.any(Function),
    });

    expect(useAddBulkToTimelineActionModule.useAddBulkToTimelineAction).toHaveBeenCalledWith({
      localFilters: [],
      from: '2020-07-07T08:20:18.966Z',
      to: '2020-07-08T08:20:18.966Z',
      scopeId: PageScope.alerts,
      tableId: mockTableId,
    });
  });
});
