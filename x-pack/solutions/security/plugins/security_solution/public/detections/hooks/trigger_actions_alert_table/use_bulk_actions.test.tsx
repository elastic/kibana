/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';

import { useBulkActionsByTableType } from './use_bulk_actions';
import { SourcererScopeName } from '../../../sourcerer/store/model';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import * as useBulkAlertAssigneesItemsModule from '../../../common/components/toolbar/bulk_actions/use_bulk_alert_assignees_items';
import * as useBulkAlertTagsItemsModule from '../../../common/components/toolbar/bulk_actions/use_bulk_alert_tags_items';
import * as useAddBulkToTimelineActionModule from '../../components/alerts_table/timeline_actions/use_add_bulk_to_timeline';
import * as useBulkAlertActionItemsModule from './use_alert_actions';
import type { TableId } from '@kbn/securitysolution-data-table';

jest.mock('../../../common/containers/use_global_time');
jest.mock('../../../common/hooks/use_selector');
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
      id: 'timelineAction',
    });

    (useBulkAlertActionItemsModule.useBulkAlertActionItems as jest.Mock).mockReturnValue([
      { id: 'action1' },
      { id: 'action2' },
    ]);
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
          { id: 'timelineAction' },
          { id: 'tag' },
          { id: 'assignee' },
        ],
      },
      { id: 'tagPanel' },
      { id: 'assigneePanel' },
    ]);
  });

  it('passes correct parameters to dependent hooks', () => {
    renderHook(() => useBulkActionsByTableType(mockTableId, mockQuery, mockRefresh));

    expect(useBulkAlertActionItemsModule.useBulkAlertActionItems).toHaveBeenCalledWith({
      scopeId: SourcererScopeName.detections,
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
      scopeId: SourcererScopeName.detections,
      tableId: mockTableId,
    });
  });
});
