/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import { GO_TO_RULES_BUTTON_TEST_ID, HeaderSection } from './header_section';
import { FILTER_BY_ASSIGNEES_BUTTON } from '../../../../common/components/filter_by_assignees_popover/test_ids';
import { useSuggestUsers } from '../../../../common/components/user_profiles/use_suggest_users';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { useLicense } from '../../../../common/hooks/use_license';
import { useGetCurrentUserProfile } from '../../../../common/components/user_profiles/use_get_current_user_profile';

jest.mock('../../../../common/hooks/use_license');
jest.mock('../../../../common/components/user_profiles/use_get_current_user_profile');
jest.mock('../../../../common/components/user_profiles/use_suggest_users');

const currentUser: UserProfileWithAvatar = {
  uid: 'uid1',
  enabled: true,
  user: {
    username: 'current.user',
    email: 'current.user@elastic.co',
    full_name: 'Current User',
  },
  data: {},
};
const user: UserProfileWithAvatar = {
  uid: 'uid2',
  enabled: true,
  user: {
    username: 'jon.doe',
    email: 'jon.do@elastic.co',
    full_name: 'John Doe',
  },
  data: {},
};

describe('HeaderSection', () => {
  beforeEach(() => {
    (useLicense as jest.Mock).mockReturnValue({ isPlatinumPlus: () => true });
  });

  it('should render correctly', () => {
    const { getByTestId } = render(
      <TestProviders>
        <HeaderSection assignees={[]} setAssignees={jest.fn()} />
      </TestProviders>
    );

    expect(getByTestId(FILTER_BY_ASSIGNEES_BUTTON)).toBeInTheDocument();
    expect(getByTestId(GO_TO_RULES_BUTTON_TEST_ID)).toBeInTheDocument();
  });

  it('should set assignee', async () => {
    const setAssignees = jest.fn();

    (useGetCurrentUserProfile as jest.Mock).mockReturnValue({
      data: user,
    });
    (useSuggestUsers as jest.Mock).mockReturnValue({
      isLoading: false,
      data: [currentUser, user],
    });

    const { getByTestId } = render(
      <TestProviders>
        <HeaderSection assignees={[]} setAssignees={setAssignees} />
      </TestProviders>
    );

    fireEvent.click(getByTestId(FILTER_BY_ASSIGNEES_BUTTON));

    await waitFor(() => {
      expect(
        screen.getByTestId(`userProfileSelectableOption-${user.user.username}`)
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId(`userProfileSelectableOption-${user.user.username}`));

    expect(setAssignees).toHaveBeenCalledWith([user.uid]);
  });

  it('should not set assignee if user is already assigned', async () => {
    const setAssignees = jest.fn();

    (useGetCurrentUserProfile as jest.Mock).mockReturnValue({
      data: user,
    });
    (useSuggestUsers as jest.Mock).mockReturnValue({
      isLoading: false,
      data: [currentUser, user],
    });

    const { getByTestId } = render(
      <TestProviders>
        <HeaderSection assignees={[user.uid]} setAssignees={setAssignees} />
      </TestProviders>
    );

    fireEvent.click(getByTestId(FILTER_BY_ASSIGNEES_BUTTON));

    await waitFor(() => {
      expect(
        screen.getByTestId(`userProfileSelectableOption-${user.user.username}`)
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId(`userProfileSelectableOption-${user.user.username}`));

    expect(setAssignees).not.toHaveBeenCalled();
  });
});
