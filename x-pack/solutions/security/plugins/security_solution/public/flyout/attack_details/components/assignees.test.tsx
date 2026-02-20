/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import { Assignees } from './assignees';
import { TestProviders } from '../../../common/mock';
import { useAttackDetailsAssignees } from '../hooks/use_attack_details_assignees';
import { HEADER_ASSIGNEES_ADD_BUTTON_TEST_ID } from '../constants/test_ids';

import {
  USERS_AVATARS_COUNT_BADGE_TEST_ID,
  USERS_AVATARS_PANEL_TEST_ID,
  USER_AVATAR_ITEM_TEST_ID,
} from '../../../common/components/user_profiles/test_ids';

jest.mock('../hooks/use_attack_details_assignees');
jest.mock('../../../common/components/empty_value', () => ({
  getEmptyTagValue: () => '—',
}));

const mockUseAttackDetailsAssignees = useAttackDetailsAssignees as jest.MockedFunction<
  typeof useAttackDetailsAssignees
>;

const defaultHookReturn = {
  assignedUserIds: ['uid-1'],
  assignedUsers: [
    {
      uid: 'uid-1',
      enabled: true,
      user: { username: 'user1', full_name: 'User 1' },
      data: {},
    },
  ],
  onApplyAssignees: jest.fn().mockResolvedValue(undefined),
  hasPermission: true,
  isPlatinumPlus: true,
  upsellingMessage: undefined,
  isLoading: false,
};

const renderAssignees = () =>
  render(
    <TestProviders>
      <Assignees />
    </TestProviders>
  );

describe('Assignees', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAttackDetailsAssignees.mockReturnValue(
      defaultHookReturn as ReturnType<typeof useAttackDetailsAssignees>
    );
  });

  it('renders empty state when user has no permission', () => {
    mockUseAttackDetailsAssignees.mockReturnValue({
      ...defaultHookReturn,
      hasPermission: false,
    } as ReturnType<typeof useAttackDetailsAssignees>);

    renderAssignees();

    expect(screen.getByTestId('attackDetailsFlyoutHeaderAssigneesEmpty')).toBeInTheDocument();
    expect(screen.getByTestId('attackDetailsFlyoutHeaderAssigneesEmpty')).toHaveTextContent('—');
    expect(screen.queryByTestId('attackDetailsFlyoutHeaderAssignees')).not.toBeInTheDocument();
  });

  it('renders empty state when not platinum plus', () => {
    mockUseAttackDetailsAssignees.mockReturnValue({
      ...defaultHookReturn,
      isPlatinumPlus: false,
    } as ReturnType<typeof useAttackDetailsAssignees>);

    renderAssignees();

    expect(screen.getByTestId('attackDetailsFlyoutHeaderAssigneesEmpty')).toBeInTheDocument();
    expect(screen.queryByTestId('attackDetailsFlyoutHeaderAssignees')).not.toBeInTheDocument();
  });

  it('renders assignees block with add button when has permission and platinum', () => {
    renderAssignees();

    expect(screen.getByTestId('attackDetailsFlyoutHeaderAssignees')).toBeInTheDocument();
    expect(screen.getByTestId(HEADER_ASSIGNEES_ADD_BUTTON_TEST_ID)).toBeInTheDocument();
    expect(screen.getByTestId(HEADER_ASSIGNEES_ADD_BUTTON_TEST_ID)).not.toBeDisabled();
  });

  it('renders avatars when assignedUsers is provided', () => {
    renderAssignees();

    expect(screen.getByTestId(USERS_AVATARS_PANEL_TEST_ID)).toBeInTheDocument();
    expect(screen.getByTestId(USER_AVATAR_ITEM_TEST_ID('user1'))).toBeInTheDocument();
  });

  it('renders count badge when more than two assignees', () => {
    mockUseAttackDetailsAssignees.mockReturnValue({
      ...defaultHookReturn,
      assignedUserIds: ['uid-1', 'uid-2', 'uid-3'],
      assignedUsers: [
        { uid: 'uid-1', enabled: true, user: { username: 'u1', full_name: 'U1' }, data: {} },
        { uid: 'uid-2', enabled: true, user: { username: 'u2', full_name: 'U2' }, data: {} },
        { uid: 'uid-3', enabled: true, user: { username: 'u3', full_name: 'U3' }, data: {} },
      ],
    } as ReturnType<typeof useAttackDetailsAssignees>);

    renderAssignees();

    expect(screen.getByTestId(USERS_AVATARS_COUNT_BADGE_TEST_ID)).toBeInTheDocument();
    expect(screen.getByTestId(USERS_AVATARS_COUNT_BADGE_TEST_ID)).toHaveTextContent('3');
  });

  it('disables add button when loading', () => {
    mockUseAttackDetailsAssignees.mockReturnValue({
      ...defaultHookReturn,
      isLoading: true,
    } as ReturnType<typeof useAttackDetailsAssignees>);

    renderAssignees();

    expect(screen.getByTestId(HEADER_ASSIGNEES_ADD_BUTTON_TEST_ID)).toBeDisabled();
  });

  it('does not render avatars when assignedUsers is empty', () => {
    mockUseAttackDetailsAssignees.mockReturnValue({
      ...defaultHookReturn,
      assignedUserIds: [],
      assignedUsers: undefined,
    } as ReturnType<typeof useAttackDetailsAssignees>);

    renderAssignees();

    expect(screen.getByTestId('attackDetailsFlyoutHeaderAssignees')).toBeInTheDocument();
    expect(screen.queryByTestId(USERS_AVATARS_PANEL_TEST_ID)).not.toBeInTheDocument();
    expect(screen.getByTestId(HEADER_ASSIGNEES_ADD_BUTTON_TEST_ID)).toBeInTheDocument();
  });
});
