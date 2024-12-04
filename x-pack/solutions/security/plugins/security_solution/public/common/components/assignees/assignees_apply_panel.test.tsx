/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';

import { ASSIGNEES_APPLY_BUTTON_TEST_ID, ASSIGNEES_APPLY_PANEL_TEST_ID } from './test_ids';
import { AssigneesApplyPanel } from './assignees_apply_panel';

import { useGetCurrentUserProfile } from '../user_profiles/use_get_current_user_profile';
import { useBulkGetUserProfiles } from '../user_profiles/use_bulk_get_user_profiles';
import { useSuggestUsers } from '../user_profiles/use_suggest_users';
import { TestProviders } from '../../mock';
import { mockUserProfiles } from './mocks';

jest.mock('../user_profiles/use_get_current_user_profile');
jest.mock('../user_profiles/use_bulk_get_user_profiles');
jest.mock('../user_profiles/use_suggest_users');

const renderAssigneesApplyPanel = (
  {
    assignedUserIds,
    onApply,
  }: {
    assignedUserIds: string[];
    onApply: () => void;
  } = {
    assignedUserIds: [],
    onApply: jest.fn(),
  }
) => {
  const assignedProfiles = mockUserProfiles.filter((user) => assignedUserIds.includes(user.uid));
  (useBulkGetUserProfiles as jest.Mock).mockReturnValue({
    isLoading: false,
    data: assignedProfiles,
  });
  return render(
    <TestProviders>
      <AssigneesApplyPanel assignedUserIds={assignedUserIds} onApply={onApply} />
    </TestProviders>
  );
};

describe('<AssigneesApplyPanel />', () => {
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

  it('should render component', () => {
    const { getByTestId } = renderAssigneesApplyPanel();

    expect(getByTestId(ASSIGNEES_APPLY_PANEL_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(ASSIGNEES_APPLY_BUTTON_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(ASSIGNEES_APPLY_BUTTON_TEST_ID)).toBeDisabled();
  });

  it('should call `onApply` callback on apply button click', () => {
    const mockedOnApply = jest.fn();

    const { getByText, getByTestId } = renderAssigneesApplyPanel({
      assignedUserIds: ['user-id-1'],
      onApply: mockedOnApply,
    });

    expect(getByTestId(ASSIGNEES_APPLY_BUTTON_TEST_ID)).toBeDisabled();
    getByText(mockUserProfiles[1].user.full_name).click();
    expect(getByTestId(ASSIGNEES_APPLY_BUTTON_TEST_ID)).not.toBeDisabled();
    getByTestId(ASSIGNEES_APPLY_BUTTON_TEST_ID).click();

    expect(mockedOnApply).toHaveBeenCalledWith({
      add: ['user-id-2'],
      remove: [],
    });
  });
});
