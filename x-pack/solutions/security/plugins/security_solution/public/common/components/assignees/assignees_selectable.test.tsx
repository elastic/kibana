/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { UserProfilesSelectable } from '@kbn/user-profile-components';

import { AssigneesSelectable } from './assignees_selectable';

import { useGetCurrentUserProfile } from '../user_profiles/use_get_current_user_profile';
import { useBulkGetUserProfiles } from '../user_profiles/use_bulk_get_user_profiles';
import { useSuggestUsers } from '../user_profiles/use_suggest_users';
import { TestProviders } from '../../mock';
import * as i18n from './translations';
import { mockUserProfiles } from './mocks';

jest.mock('../user_profiles/use_get_current_user_profile');
jest.mock('../user_profiles/use_bulk_get_user_profiles');
jest.mock('../user_profiles/use_suggest_users');

// Spied rather than stubbed: the option list is virtualised, so the rows it is asked to render
// are only observable as props, while the tests below this one still need the real component.
jest.mock('@kbn/user-profile-components', () => {
  const actual = jest.requireActual('@kbn/user-profile-components');
  return {
    ...actual,
    UserProfilesSelectable: jest.fn((props) => actual.UserProfilesSelectable(props)),
  };
});

const renderAssigneesSelectable = (
  {
    assignedUserIds,
    showUnassignedOption,
    onSelectionChange,
  }: {
    assignedUserIds: string[];
    showUnassignedOption?: boolean;
    onSelectionChange?: () => void;
  } = { assignedUserIds: [] }
) => {
  const assignedProfiles = mockUserProfiles.filter((user) => assignedUserIds.includes(user.uid));
  (useBulkGetUserProfiles as jest.Mock).mockReturnValue({
    isLoading: false,
    data: assignedProfiles,
  });
  return render(
    <TestProviders>
      <AssigneesSelectable
        assignedUserIds={assignedUserIds}
        showUnassignedOption={showUnassignedOption}
        onSelectionChange={onSelectionChange}
      />
    </TestProviders>
  );
};

const lastSelectableProps = () => {
  const { calls } = (UserProfilesSelectable as unknown as jest.Mock).mock;
  return calls[calls.length - 1][0];
};

describe('<AssigneesSelectable /> option ordering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useSuggestUsers as jest.Mock).mockReturnValue({
      isLoading: false,
      data: mockUserProfiles,
    });
  });

  it('should withhold the options until the current user profile has resolved', () => {
    (useGetCurrentUserProfile as jest.Mock).mockReturnValue({
      isLoading: true,
      data: undefined,
    });

    renderAssigneesSelectable({ assignedUserIds: [] });

    expect(lastSelectableProps().options).toEqual([]);
    expect(lastSelectableProps().isLoading).toBe(true);
  });

  it('should bring the current user to the front once their profile has resolved', () => {
    (useGetCurrentUserProfile as jest.Mock).mockReturnValue({
      isLoading: false,
      data: mockUserProfiles[2],
    });

    renderAssigneesSelectable({ assignedUserIds: [] });

    expect(lastSelectableProps().options).toEqual([
      mockUserProfiles[2],
      mockUserProfiles[0],
      mockUserProfiles[1],
    ]);
    expect(lastSelectableProps().isLoading).toBe(false);
  });
});

// Failing: See https://github.com/elastic/kibana/issues/260306
describe.skip('<AssigneesSelectable />', () => {
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
  });

  it('should not render `no assignees` option', () => {
    const { getByTestId } = renderAssigneesSelectable({
      assignedUserIds: [],
      showUnassignedOption: false,
    });

    const assigneesList = getByTestId('euiSelectableList');
    expect(assigneesList).not.toHaveTextContent(i18n.ASSIGNEES_NO_ASSIGNEES);
  });

  it('should render `no assignees` option', () => {
    const { getByTestId } = renderAssigneesSelectable({
      assignedUserIds: [],
      showUnassignedOption: true,
    });

    const assigneesList = getByTestId('euiSelectableList');
    expect(assigneesList).toHaveTextContent(i18n.ASSIGNEES_NO_ASSIGNEES);
  });

  it('should call `onSelectionChange` on user selection', async () => {
    (useBulkGetUserProfiles as jest.Mock).mockReturnValue({
      isLoading: false,
      data: [],
    });

    const onSelectionChangeMock = jest.fn();
    const { getByText } = renderAssigneesSelectable({
      assignedUserIds: [],
      onSelectionChange: onSelectionChangeMock,
    });

    await userEvent.click(getByText('User 1'));
    await userEvent.click(getByText('User 2'));
    await userEvent.click(getByText('User 3'));
    await userEvent.click(getByText('User 3'));
    await userEvent.click(getByText('User 2'));
    await userEvent.click(getByText('User 1'));

    expect(onSelectionChangeMock).toHaveBeenCalledTimes(6);
    expect(onSelectionChangeMock.mock.calls).toEqual([
      [['user-id-1']],
      [['user-id-2', 'user-id-1']],
      [['user-id-3', 'user-id-2', 'user-id-1']],
      [['user-id-2', 'user-id-1']],
      [['user-id-1']],
      [[]],
    ]);
  });
});
