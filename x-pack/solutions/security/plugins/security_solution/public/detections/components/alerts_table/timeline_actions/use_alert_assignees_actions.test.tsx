/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseAlertAssigneesActionsProps } from './use_alert_assignees_actions';
import { useAlertAssigneesActions } from './use_alert_assignees_actions';
import { useAlertsPrivileges } from '../../../containers/detection_engine/alerts/use_alerts_privileges';
import type { AlertTableContextMenuItem } from '../types';
import { render, renderHook } from '@testing-library/react';
import React from 'react';
import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import { EuiPopover, EuiContextMenu } from '@elastic/eui';
import { TestProviders } from '../../../../common/mock';
import { useSetAlertAssignees } from '../../../../common/components/toolbar/bulk_actions/use_set_alert_assignees';
import { useGetCurrentUserProfile } from '../../../../common/components/user_profiles/use_get_current_user_profile';
import { useBulkGetUserProfiles } from '../../../../common/components/user_profiles/use_bulk_get_user_profiles';
import { useSuggestUsers } from '../../../../common/components/user_profiles/use_suggest_users';
import { useLicense } from '../../../../common/hooks/use_license';

jest.mock('../../../containers/detection_engine/alerts/use_alerts_privileges');
jest.mock('../../../../common/components/toolbar/bulk_actions/use_set_alert_assignees');
jest.mock('../../../../common/components/user_profiles/use_get_current_user_profile');
jest.mock('../../../../common/components/user_profiles/use_bulk_get_user_profiles');
jest.mock('../../../../common/components/user_profiles/use_suggest_users');
jest.mock('../../../../common/hooks/use_license');

const mockUserProfiles = [
  { uid: 'user-id-1', enabled: true, user: { username: 'fakeUser1' }, data: {} },
  { uid: 'user-id-2', enabled: true, user: { username: 'fakeUser2' }, data: {} },
];

const defaultProps: UseAlertAssigneesActionsProps = {
  closePopover: jest.fn(),
  ecsRowData: {
    _id: '123',
    kibana: {
      alert: {
        workflow_assignee_ids: [],
      },
    },
  },
  refetch: jest.fn(),
};

const renderContextMenu = (
  items: AlertTableContextMenuItem[],
  panels: EuiContextMenuPanelDescriptor[]
) => {
  const panelsToRender = [{ id: 0, items }, ...panels];
  return render(
    <EuiPopover
      isOpen={true}
      panelPaddingSize="none"
      anchorPosition="downLeft"
      closePopover={() => {}}
      button={<></>}
    >
      <EuiContextMenu size="s" initialPanelId={2} panels={panelsToRender} />
    </EuiPopover>
  );
};

describe('useAlertAssigneesActions', () => {
  beforeEach(() => {
    (useAlertsPrivileges as jest.Mock).mockReturnValue({
      hasIndexWrite: true,
    });
    (useLicense as jest.Mock).mockReturnValue({ isPlatinumPlus: () => true });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render alert assignees actions', () => {
    const { result } = renderHook(() => useAlertAssigneesActions(defaultProps), {
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

    expect(result.current.alertAssigneesPanels[0].content).toMatchInlineSnapshot(`
      <Memo(BulkAlertAssigneesPanelComponent)
        alertItems={
          Array [
            Object {
              "_id": "123",
              "_index": "",
              "data": Array [
                Object {
                  "field": "kibana.alert.workflow_assignee_ids",
                  "value": Array [],
                },
              ],
              "ecs": Object {
                "_id": "123",
                "_index": "",
              },
            },
          ]
        }
        closePopoverMenu={[MockFunction]}
        onSubmit={[Function]}
        refresh={[Function]}
        setIsLoading={[Function]}
      />
    `);
  });

  it("should not render alert assignees actions if user doesn't have write permissions", () => {
    (useAlertsPrivileges as jest.Mock).mockReturnValue({
      hasIndexWrite: false,
    });
    const { result } = renderHook(() => useAlertAssigneesActions(defaultProps), {
      wrapper: TestProviders,
    });
    expect(result.current.alertAssigneesItems.length).toEqual(0);
  });

  it('should not render alert assignees actions within Basic license', () => {
    (useLicense as jest.Mock).mockReturnValue({ isPlatinumPlus: () => false });
    const { result } = renderHook(() => useAlertAssigneesActions(defaultProps), {
      wrapper: TestProviders,
    });
    expect(result.current.alertAssigneesItems.length).toEqual(0);
  });

  it('should still render if workflow_assignee_ids field does not exist', () => {
    const newProps = {
      ...defaultProps,
      ecsRowData: {
        _id: '123',
      },
    };
    const { result } = renderHook(() => useAlertAssigneesActions(newProps), {
      wrapper: TestProviders,
    });
    expect(result.current.alertAssigneesItems.length).toEqual(2);
    expect(result.current.alertAssigneesPanels.length).toEqual(1);
    expect(result.current.alertAssigneesPanels[0].content).toMatchInlineSnapshot(`
      <Memo(BulkAlertAssigneesPanelComponent)
        alertItems={
          Array [
            Object {
              "_id": "123",
              "_index": "",
              "data": Array [
                Object {
                  "field": "kibana.alert.workflow_assignee_ids",
                  "value": Array [],
                },
              ],
              "ecs": Object {
                "_id": "123",
                "_index": "",
              },
            },
          ]
        }
        closePopoverMenu={[MockFunction]}
        onSubmit={[Function]}
        refresh={[Function]}
        setIsLoading={[Function]}
      />
    `);
  });

  it('should render the nested panel', async () => {
    (useSetAlertAssignees as jest.Mock).mockReturnValue(jest.fn());
    (useGetCurrentUserProfile as jest.Mock).mockReturnValue({
      isLoading: false,
      data: mockUserProfiles[0],
    });
    (useBulkGetUserProfiles as jest.Mock).mockReturnValue({
      isLoading: false,
      data: mockUserProfiles,
    });
    (useSuggestUsers as jest.Mock).mockReturnValue({
      isLoading: false,
      data: mockUserProfiles,
    });

    const { result } = renderHook(() => useAlertAssigneesActions(defaultProps), {
      wrapper: TestProviders,
    });
    const alertAssigneesItems = result.current.alertAssigneesItems;
    const alertAssigneesPanels = result.current.alertAssigneesPanels;
    const { getByTestId } = renderContextMenu(alertAssigneesItems, alertAssigneesPanels);

    expect(getByTestId('alert-assignees-selectable-menu')).toBeInTheDocument();
  });
});
