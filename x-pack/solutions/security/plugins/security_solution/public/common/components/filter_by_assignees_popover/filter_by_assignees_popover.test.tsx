/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';

import { FilterByAssigneesPopover } from './filter_by_assignees_popover';
import { TestProviders } from '../../mock';
import type { AssigneesIdsSelection } from '../assignees/types';

import { useGetCurrentUserProfile } from '../user_profiles/use_get_current_user_profile';
import { useBulkGetUserProfiles } from '../user_profiles/use_bulk_get_user_profiles';
import { useSuggestUsers } from '../user_profiles/use_suggest_users';
import { useLicense } from '../../hooks/use_license';
import { useUpsellingMessage } from '../../hooks/use_upselling';
import { FILTER_BY_ASSIGNEES_BUTTON } from './test_ids';
import userEvent from '@testing-library/user-event';

jest.mock('../user_profiles/use_get_current_user_profile');
jest.mock('../user_profiles/use_bulk_get_user_profiles');
jest.mock('../user_profiles/use_suggest_users');
jest.mock('../../hooks/use_license');
jest.mock('../../hooks/use_upselling');

const mockUserProfiles = [
  {
    uid: 'user-id-1',
    enabled: true,
    user: { username: 'user1', full_name: 'User 1', email: 'user1@test.com' },
    data: {},
  },
  {
    uid: 'user-id-2',
    enabled: true,
    user: { username: 'user2', full_name: 'User 2', email: 'user2@test.com' },
    data: {},
  },
  {
    uid: 'user-id-3',
    enabled: true,
    user: { username: 'user3', full_name: 'User 3', email: 'user3@test.com' },
    data: {},
  },
];

const renderFilterByAssigneesPopover = (
  alertAssignees: AssigneesIdsSelection[] = [],
  onUsersChange = jest.fn()
) =>
  render(
    <TestProviders>
      <FilterByAssigneesPopover
        selectedUserIds={alertAssignees}
        onSelectionChange={onUsersChange}
      />
    </TestProviders>
  );

describe('<FilterByAssigneesPopover />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useGetCurrentUserProfile as jest.Mock).mockReturnValue({
      isLoading: false,
      data: mockUserProfiles[0],
    });
    (useBulkGetUserProfiles as jest.Mock).mockReturnValue({
      isLoading: false,
      data: [],
    });
    (useSuggestUsers as jest.Mock).mockReturnValue({
      isLoading: false,
      data: mockUserProfiles,
    });
    (useLicense as jest.Mock).mockReturnValue({ isPlatinumPlus: () => true });
    (useUpsellingMessage as jest.Mock).mockReturnValue('Go for Platinum!');
  });

  it('should render closed popover component', () => {
    const { getByTestId, queryByTestId } = renderFilterByAssigneesPopover();

    expect(getByTestId(FILTER_BY_ASSIGNEES_BUTTON)).toBeInTheDocument();
    expect(queryByTestId('euiSelectableList')).not.toBeInTheDocument();
  });

  it('should render opened popover component', async () => {
    const { getByTestId } = renderFilterByAssigneesPopover();

    await userEvent.click(getByTestId(FILTER_BY_ASSIGNEES_BUTTON));
    expect(getByTestId('euiSelectableList')).toBeInTheDocument();
  });

  it('should render assignees', async () => {
    const { getByTestId } = renderFilterByAssigneesPopover();

    await userEvent.click(getByTestId(FILTER_BY_ASSIGNEES_BUTTON));

    const assigneesList = getByTestId('euiSelectableList');
    expect(assigneesList).toHaveTextContent('User 1');
    expect(assigneesList).toHaveTextContent('user1@test.com');
    expect(assigneesList).toHaveTextContent('User 2');
    expect(assigneesList).toHaveTextContent('user2@test.com');
    expect(assigneesList).toHaveTextContent('User 3');
    expect(assigneesList).toHaveTextContent('user3@test.com');
  });

  it('should call onUsersChange on closing the popover', () => {
    const onUsersChangeMock = jest.fn();
    const { getByTestId, getByText } = renderFilterByAssigneesPopover([], onUsersChangeMock);

    fireEvent.click(getByTestId(FILTER_BY_ASSIGNEES_BUTTON));

    fireEvent.click(getByText('User 1'));
    fireEvent.click(getByText('User 2'));
    fireEvent.click(getByText('User 3'));
    fireEvent.click(getByText('User 3'));
    fireEvent.click(getByText('User 2'));
    fireEvent.click(getByText('User 1'));

    expect(onUsersChangeMock).toHaveBeenCalledTimes(6);
    expect(onUsersChangeMock.mock.calls).toEqual([
      [['user-id-1']],
      [['user-id-2', 'user-id-1']],
      [['user-id-3', 'user-id-2', 'user-id-1']],
      [['user-id-2', 'user-id-1']],
      [['user-id-1']],
      [[]],
    ]);
  });
});
