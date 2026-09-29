/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { ALERT_WORKFLOW_ASSIGNEE_IDS } from '@kbn/rule-data-utils';
import type { BulkActionsConfig } from '@kbn/response-ops-alerts-table/types';
import { act, fireEvent, render, renderHook } from '@testing-library/react';

import { TestProviders } from '../../../mock';
import type {
  UseBulkAlertAssigneesItemsProps,
  UseBulkAlertAssigneesPanel,
} from './use_bulk_alert_assignees_items';
import { useBulkAlertAssigneesItems } from './use_bulk_alert_assignees_items';
import { useSetAlertAssignees } from './use_set_alert_assignees';
import { useGetCurrentUserProfile } from '../../user_profiles/use_get_current_user_profile';
import { useBulkGetUserProfiles } from '../../user_profiles/use_bulk_get_user_profiles';
import { useSuggestUsers } from '../../user_profiles/use_suggest_users';
import { ASSIGNEES_APPLY_BUTTON_TEST_ID } from '../../assignees/test_ids';
import { useAlertsPrivileges } from '../../../../detections/containers/detection_engine/alerts/use_alerts_privileges';
import { useLicense } from '../../../hooks/use_license';
import type { TimelineItem } from '@kbn/timelines-plugin/common';

vi.mock('./use_set_alert_assignees');
vi.mock('../../user_profiles/use_get_current_user_profile');
vi.mock('../../user_profiles/use_bulk_get_user_profiles');
vi.mock('../../user_profiles/use_suggest_users');
vi.mock('../../../../detections/containers/detection_engine/alerts/use_alerts_privileges');
vi.mock('../../../hooks/use_license');

const mockUserProfiles = [
  { uid: 'user-id-1', enabled: true, user: { username: 'fakeUser1' }, data: {} },
  { uid: 'user-id-2', enabled: true, user: { username: 'fakeUser2' }, data: {} },
];

const defaultProps: UseBulkAlertAssigneesItemsProps = {
  onAssigneesUpdate: () => {},
  alertAssignments: [],
};

const mockAssigneeItems = [
  {
    _id: 'test-id',
    data: [{ field: ALERT_WORKFLOW_ASSIGNEE_IDS, value: ['user-id-1', 'user-id-2'] }],
    ecs: { _id: 'test-id', _index: 'test-index' },
  },
];

const renderPanel = (panel: UseBulkAlertAssigneesPanel) => {
  const content = panel.renderContent({
    closePopoverMenu: vi.fn(),
    setIsBulkActionsLoading: vi.fn(),
    alertItems: mockAssigneeItems,
  });
  return render(content);
};

describe('useBulkAlertAssigneesItems', () => {
  beforeEach(() => {
    (useSetAlertAssignees as Mock).mockReturnValue(vi.fn());
    (useGetCurrentUserProfile as Mock).mockReturnValue({
      isLoading: false,
      data: mockUserProfiles[0],
    });
    (useBulkGetUserProfiles as Mock).mockReturnValue({
      isLoading: false,
      data: mockUserProfiles,
    });
    (useSuggestUsers as Mock).mockReturnValue({
      isLoading: false,
      data: mockUserProfiles,
    });
    (useAlertsPrivileges as Mock).mockReturnValue({ hasAlertsUpdate: true });
    (useLicense as Mock).mockReturnValue({ isPlatinumPlus: () => true });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return two alert assignees action items and one panel', () => {
    const { result } = renderHook(() => useBulkAlertAssigneesItems(defaultProps), {
      wrapper: TestProviders,
    });

    expect(result.current.alertAssigneesItems.length).toEqual(2);
    expect(result.current.alertAssigneesPanels.length).toEqual(1);

    expect(result.current.alertAssigneesItems[0]['data-test-subj']).toEqual(
      'alert-assignees-context-menu-item'
    );
    expect(result.current.alertAssigneesItems[1]['data-test-subj']).toEqual(
      'remove-alert-assignees-menu-item'
    );
    expect(result.current.alertAssigneesItems[0]).toMatchObject({
      icon: 'users',
      groupId: 'assignees',
    });
    expect(result.current.alertAssigneesItems[1]).toMatchObject({
      icon: 'users',
      groupId: 'assignees',
    });
    expect(result.current.alertAssigneesPanels[0]['data-test-subj']).toEqual(
      'alert-assignees-context-menu-panel'
    );
  });

  it('should still render alert assignees panel when useSetAlertAssignees is null', () => {
    (useSetAlertAssignees as Mock).mockReturnValue(null);
    const { result } = renderHook(() => useBulkAlertAssigneesItems(defaultProps), {
      wrapper: TestProviders,
    });

    expect(result.current.alertAssigneesPanels[0]['data-test-subj']).toEqual(
      'alert-assignees-context-menu-panel'
    );
    const wrapper = renderPanel(result.current.alertAssigneesPanels[0]);
    expect(wrapper.getByTestId('alert-assignees-selectable-menu')).toBeInTheDocument();
  });

  it('should call setAlertAssignees on submit', () => {
    const mockSetAlertAssignees = vi.fn();
    (useSetAlertAssignees as Mock).mockReturnValue(mockSetAlertAssignees);
    const { result } = renderHook(() => useBulkAlertAssigneesItems(defaultProps), {
      wrapper: TestProviders,
    });

    const wrapper = renderPanel(result.current.alertAssigneesPanels[0]);
    expect(wrapper.getByTestId('alert-assignees-selectable-menu')).toBeInTheDocument();
    act(() => {
      fireEvent.click(wrapper.getByText('fakeUser2')); // Won't fire unless component assignees selection has been changed
    });
    act(() => {
      fireEvent.click(wrapper.getByTestId(ASSIGNEES_APPLY_BUTTON_TEST_ID));
    });
    expect(mockSetAlertAssignees).toHaveBeenCalled();
  });

  it('should call setAlertAssignees with the correct parameters on `Unassign alert` button click', () => {
    const mockSetAlertAssignees = vi.fn();
    (useSetAlertAssignees as Mock).mockReturnValue(mockSetAlertAssignees);
    const { result } = renderHook(() => useBulkAlertAssigneesItems(defaultProps), {
      wrapper: TestProviders,
    });

    const items: TimelineItem[] = [
      {
        _id: 'alert1',
        data: [{ field: ALERT_WORKFLOW_ASSIGNEE_IDS, value: ['user1', 'user2'] }],
        ecs: { _id: 'alert1', _index: 'index1' },
      },
      {
        _id: 'alert2',
        data: [{ field: ALERT_WORKFLOW_ASSIGNEE_IDS, value: ['user1', 'user3'] }],
        ecs: { _id: 'alert2', _index: 'index1' },
      },
      {
        _id: 'alert3',
        data: [],
        ecs: { _id: 'alert3', _index: 'index1' },
      },
    ];

    const setAlertLoadingMock = vi.fn();
    (
      result.current.alertAssigneesItems[1] as unknown as { onClick: BulkActionsConfig['onClick'] }
    ).onClick?.(items, true, setAlertLoadingMock, vi.fn(), vi.fn());

    expect(mockSetAlertAssignees).toHaveBeenCalled();
    expect(mockSetAlertAssignees).toHaveBeenCalledWith(
      { add: [], remove: ['user1', 'user2', 'user3'] },
      ['alert1', 'alert2', 'alert3'],
      expect.any(Function),
      setAlertLoadingMock
    );
  });

  it('should set unnasign alert action to disabled if no assignees exist', () => {
    const mockSetAlertAssignees = vi.fn();
    (useSetAlertAssignees as Mock).mockReturnValue(mockSetAlertAssignees);
    const { result } = renderHook(
      () =>
        useBulkAlertAssigneesItems({
          onAssigneesUpdate: () => {},
          alertAssignments: [],
        }),
      {
        wrapper: TestProviders,
      }
    );

    expect(
      (
        result.current.alertAssigneesItems[0] as unknown as {
          disable: boolean;
        }
      ).disable
    ).toBeFalsy();
    expect(
      (
        result.current.alertAssigneesItems[1] as unknown as {
          disable: boolean;
        }
      ).disable
    ).toBeTruthy();
  });

  it('should set unnasign alert action to enabled if assignees exist', () => {
    const mockSetAlertAssignees = vi.fn();
    (useSetAlertAssignees as Mock).mockReturnValue(mockSetAlertAssignees);
    const { result } = renderHook(
      () =>
        useBulkAlertAssigneesItems({
          onAssigneesUpdate: () => {},
          alertAssignments: ['user1'],
        }),
      {
        wrapper: TestProviders,
      }
    );

    expect(
      (
        result.current.alertAssigneesItems[0] as unknown as {
          disable: boolean;
        }
      ).disable
    ).toBeFalsy();
    expect(
      (
        result.current.alertAssigneesItems[1] as unknown as {
          disable: boolean;
        }
      ).disable
    ).toBeFalsy();
  });

  it('should return 0 items for the VIEWER role', () => {
    (useAlertsPrivileges as Mock).mockReturnValue({ hasAlertsUpdate: false });

    const { result } = renderHook(() => useBulkAlertAssigneesItems(defaultProps), {
      wrapper: TestProviders,
    });
    expect(result.current.alertAssigneesItems.length).toEqual(0);
    expect(result.current.alertAssigneesPanels.length).toEqual(0);
  });

  it('should return 0 items for the Basic license', () => {
    (useLicense as Mock).mockReturnValue({ isPlatinumPlus: () => false });

    const { result } = renderHook(() => useBulkAlertAssigneesItems(defaultProps), {
      wrapper: TestProviders,
    });
    expect(result.current.alertAssigneesItems.length).toEqual(0);
    expect(result.current.alertAssigneesPanels.length).toEqual(0);
  });
});
