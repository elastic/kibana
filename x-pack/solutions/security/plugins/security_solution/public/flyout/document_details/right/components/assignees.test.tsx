/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';

import {
  ASSIGNEES_ADD_BUTTON_TEST_ID,
  ASSIGNEES_EMPTY_TEST_ID,
  ASSIGNEES_TITLE_TEST_ID,
} from './test_ids';
import { Assignees } from './assignees';

import { useGetCurrentUserProfile } from '../../../../common/components/user_profiles/use_get_current_user_profile';
import { useBulkGetUserProfiles } from '../../../../common/components/user_profiles/use_bulk_get_user_profiles';
import { useSuggestUsers } from '../../../../common/components/user_profiles/use_suggest_users';
import type { SetAlertAssigneesFunc } from '../../../../common/components/toolbar/bulk_actions/use_set_alert_assignees';
import { useSetAlertAssignees } from '../../../../common/components/toolbar/bulk_actions/use_set_alert_assignees';
import { TestProviders } from '../../../../common/mock';
import { ASSIGNEES_APPLY_BUTTON_TEST_ID } from '../../../../common/components/assignees/test_ids';
import { useLicense } from '../../../../common/hooks/use_license';
import { useUpsellingMessage } from '../../../../common/hooks/use_upselling';
import {
  USERS_AVATARS_COUNT_BADGE_TEST_ID,
  USERS_AVATARS_PANEL_TEST_ID,
  USER_AVATAR_ITEM_TEST_ID,
} from '../../../../common/components/user_profiles/test_ids';
import { useAlertsPrivileges } from '../../../../detections/containers/detection_engine/alerts/use_alerts_privileges';

jest.mock('../../../../common/components/user_profiles/use_get_current_user_profile');
jest.mock('../../../../common/components/user_profiles/use_bulk_get_user_profiles');
jest.mock('../../../../common/components/user_profiles/use_suggest_users');
jest.mock('../../../../common/components/toolbar/bulk_actions/use_set_alert_assignees');
jest.mock('../../../../common/hooks/use_license');
jest.mock('../../../../common/hooks/use_upselling');
jest.mock('../../../../detections/containers/detection_engine/alerts/use_alerts_privileges');

const mockUserProfiles = [
  { uid: 'user-id-1', enabled: true, user: { username: 'user1', full_name: 'User 1' }, data: {} },
  { uid: 'user-id-2', enabled: true, user: { username: 'user2', full_name: 'User 2' }, data: {} },
  { uid: 'user-id-3', enabled: true, user: { username: 'user3', full_name: 'User 3' }, data: {} },
];

const renderAssignees = (
  eventId = 'event-1',
  alertAssignees = ['user-id-1'],
  onAssigneesUpdated = jest.fn(),
  isPreview = false
) => {
  const assignedProfiles = mockUserProfiles.filter((user) => alertAssignees.includes(user.uid));
  (useBulkGetUserProfiles as jest.Mock).mockReturnValue({
    isLoading: false,
    data: assignedProfiles,
  });
  return render(
    <TestProviders>
      <Assignees
        eventId={eventId}
        assignedUserIds={alertAssignees}
        onAssigneesUpdated={onAssigneesUpdated}
        isPreview={isPreview}
      />
    </TestProviders>
  );
};

describe('<Assignees />', () => {
  let setAlertAssigneesMock: jest.Mocked<SetAlertAssigneesFunc>;

  beforeEach(() => {
    jest.clearAllMocks();
    (useGetCurrentUserProfile as jest.Mock).mockReturnValue({
      isLoading: false,
      data: mockUserProfiles[0],
    });
    (useSuggestUsers as jest.Mock).mockReturnValue({
      isLoading: false,
      data: mockUserProfiles,
    });
    (useAlertsPrivileges as jest.Mock).mockReturnValue({ hasIndexWrite: true });
    (useLicense as jest.Mock).mockReturnValue({ isPlatinumPlus: () => true });
    (useUpsellingMessage as jest.Mock).mockReturnValue('Go for Platinum!');

    setAlertAssigneesMock = jest.fn().mockReturnValue(Promise.resolve());
    (useSetAlertAssignees as jest.Mock).mockReturnValue(setAlertAssigneesMock);
  });

  it('should render component', () => {
    const { getByTestId } = renderAssignees();

    expect(getByTestId(ASSIGNEES_TITLE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(USERS_AVATARS_PANEL_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(ASSIGNEES_ADD_BUTTON_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(ASSIGNEES_ADD_BUTTON_TEST_ID)).not.toBeDisabled();
  });

  it('should render assignees avatars', () => {
    const assignees = ['user-id-1', 'user-id-2'];
    const { getByTestId, queryByTestId } = renderAssignees('test-event', assignees);

    expect(getByTestId(USER_AVATAR_ITEM_TEST_ID('user1'))).toBeInTheDocument();
    expect(getByTestId(USER_AVATAR_ITEM_TEST_ID('user2'))).toBeInTheDocument();

    expect(queryByTestId(USERS_AVATARS_COUNT_BADGE_TEST_ID)).not.toBeInTheDocument();
  });

  it('should render badge with assignees count in case there are more than two users assigned to an alert', () => {
    const assignees = ['user-id-1', 'user-id-2', 'user-id-3'];
    const { getByTestId, queryByTestId } = renderAssignees('test-event', assignees);

    const assigneesCountBadge = getByTestId(USERS_AVATARS_COUNT_BADGE_TEST_ID);
    expect(assigneesCountBadge).toBeInTheDocument();
    expect(assigneesCountBadge).toHaveTextContent(`${assignees.length}`);

    expect(queryByTestId(USER_AVATAR_ITEM_TEST_ID('user1'))).not.toBeInTheDocument();
    expect(queryByTestId(USER_AVATAR_ITEM_TEST_ID('user2'))).not.toBeInTheDocument();
    expect(queryByTestId(USER_AVATAR_ITEM_TEST_ID('user3'))).not.toBeInTheDocument();
  });

  it('should call assignees update functionality with the right arguments', () => {
    const assignedProfiles = [mockUserProfiles[0], mockUserProfiles[1]];
    (useBulkGetUserProfiles as jest.Mock).mockReturnValue({
      isLoading: false,
      data: assignedProfiles,
    });

    const assignees = assignedProfiles.map((assignee) => assignee.uid);
    const { getByTestId, getByText } = renderAssignees('test-event', assignees);

    // Update assignees
    getByTestId(ASSIGNEES_ADD_BUTTON_TEST_ID).click();
    getByText('User 1').click();
    getByText('User 3').click();

    // Apply assignees
    getByTestId(ASSIGNEES_APPLY_BUTTON_TEST_ID).click();

    expect(setAlertAssigneesMock).toHaveBeenCalledWith(
      {
        add: ['user-id-3'],
        remove: ['user-id-1'],
      },
      ['test-event'],
      expect.anything(),
      expect.anything()
    );
  });

  it('should render add assignees button as disabled if user has readonly priviliges', () => {
    (useAlertsPrivileges as jest.Mock).mockReturnValue({ hasIndexWrite: false });

    const assignees = ['user-id-1', 'user-id-2'];
    const { getByTestId } = renderAssignees('test-event', assignees);

    expect(getByTestId(ASSIGNEES_ADD_BUTTON_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(ASSIGNEES_ADD_BUTTON_TEST_ID)).toBeDisabled();
  });

  it('should render add assignees button as disabled within Basic license', () => {
    (useLicense as jest.Mock).mockReturnValue({ isPlatinumPlus: () => false });

    const assignees = ['user-id-1', 'user-id-2'];
    const { getByTestId } = renderAssignees('test-event', assignees);

    expect(getByTestId(ASSIGNEES_ADD_BUTTON_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(ASSIGNEES_ADD_BUTTON_TEST_ID)).toBeDisabled();
  });

  it('should render empty tag in preview mode', () => {
    const assignees = ['user-id-1', 'user-id-2'];
    const { getByTestId, queryByTestId } = renderAssignees(
      'test-event',
      assignees,
      jest.fn(),
      true
    );

    expect(queryByTestId(ASSIGNEES_ADD_BUTTON_TEST_ID)).not.toBeInTheDocument();
    expect(getByTestId(ASSIGNEES_EMPTY_TEST_ID)).toHaveTextContent('—');
  });
});
