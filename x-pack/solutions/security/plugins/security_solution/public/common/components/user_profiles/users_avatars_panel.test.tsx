/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';

import { UsersAvatarsPanel } from './users_avatars_panel';

import { TestProviders } from '../../mock';
import { mockUserProfiles } from './mock';
import {
  USERS_AVATARS_COUNT_BADGE_TEST_ID,
  USERS_AVATARS_PANEL_TEST_ID,
  USER_AVATAR_ITEM_TEST_ID,
} from './test_ids';

const renderUsersAvatarsPanel = (userProfiles = [mockUserProfiles[0]], maxVisibleAvatars = 1) =>
  render(
    <TestProviders>
      <UsersAvatarsPanel userProfiles={userProfiles} maxVisibleAvatars={maxVisibleAvatars} />
    </TestProviders>
  );

describe('<UsersAvatarsPanel />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render component', () => {
    const { getByTestId } = renderUsersAvatarsPanel();

    expect(getByTestId(USERS_AVATARS_PANEL_TEST_ID)).toBeInTheDocument();
  });

  it('should render avatars for all assignees', () => {
    const assignees = [mockUserProfiles[0], mockUserProfiles[1]];
    const { getByTestId, queryByTestId } = renderUsersAvatarsPanel(assignees, 2);

    expect(getByTestId(USER_AVATAR_ITEM_TEST_ID('user1'))).toBeInTheDocument();
    expect(getByTestId(USER_AVATAR_ITEM_TEST_ID('user2'))).toBeInTheDocument();

    expect(queryByTestId(USERS_AVATARS_COUNT_BADGE_TEST_ID)).not.toBeInTheDocument();
  });

  it('should render badge with number of assignees if exceeds `maxVisibleAvatars`', () => {
    const assignees = [mockUserProfiles[0], mockUserProfiles[1]];
    const { getByTestId, queryByTestId } = renderUsersAvatarsPanel(assignees, 1);

    expect(getByTestId(USERS_AVATARS_COUNT_BADGE_TEST_ID)).toBeInTheDocument();

    expect(queryByTestId(USER_AVATAR_ITEM_TEST_ID('user1'))).not.toBeInTheDocument();
    expect(queryByTestId(USER_AVATAR_ITEM_TEST_ID('user2'))).not.toBeInTheDocument();
  });
});
