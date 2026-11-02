/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';

import { AssigneesBadge } from './assignees_badge';
import { UNKNOWN_USER_PROFILE_NAME } from '../../../../../common/components/user_profiles/translations';
import { TestProviders } from '../../../../../common/mock/test_providers';

const mockUseBulkGetUserProfiles = jest.fn();

jest.mock('../../../../../common/components/user_profiles/use_bulk_get_user_profiles', () => ({
  useBulkGetUserProfiles: () => mockUseBulkGetUserProfiles(),
}));

jest.mock('@kbn/user-profile-components', () => ({
  UserAvatar: () => <div data-test-subj="user-avatar" />,
}));

describe('AssigneesBadge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseBulkGetUserProfiles.mockReturnValue({
      data: [
        { uid: '1', user: { username: 'user1', email: 'user1@example.com' }, data: {} },
        { uid: '2', user: { username: 'user2', email: 'user2@example.com' }, data: {} },
      ],
    });
  });

  it('renders correctly with given assignees count', () => {
    const assignees = ['1', '2'];
    const { getByTestId } = render(
      <TestProviders>
        <AssigneesBadge assignees={assignees} />
      </TestProviders>
    );

    expect(getByTestId('attack-assignees-badgeDisplayPopoverButton')).toHaveTextContent('2');
  });

  it('renders nothing when assignees array is empty', () => {
    const { container } = render(
      <TestProviders>
        <AssigneesBadge assignees={[]} />
      </TestProviders>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('displays popover with title and correct assignees list on click', async () => {
    const assignees = ['1', '2'];
    const { getByTestId, findByText } = render(
      <TestProviders>
        <AssigneesBadge assignees={assignees} />
      </TestProviders>
    );

    getByTestId('attack-assignees-badgeDisplayPopoverButton').click();

    // Check popover title
    expect(await findByText('Assignees')).toBeInTheDocument();

    // First user has an email, so email is shown over username
    expect(await findByText('user1@example.com')).toBeInTheDocument();
    expect(await findByText('user2@example.com')).toBeInTheDocument();
  });

  it('falls back to username if email is missing', async () => {
    mockUseBulkGetUserProfiles.mockReturnValue({
      data: [{ uid: '3', user: { username: 'user3_no_email' }, data: {} }],
    });
    const assignees = ['3'];
    const { getByTestId, findByText } = render(
      <TestProviders>
        <AssigneesBadge assignees={assignees} />
      </TestProviders>
    );

    getByTestId('attack-assignees-badgeDisplayPopoverButton').click();

    expect(await findByText('user3_no_email')).toBeInTheDocument();
  });

  it('falls back to UNKNOWN_USER_PROFILE_NAME if user info is unavailable', async () => {
    mockUseBulkGetUserProfiles.mockReturnValue({
      data: undefined,
    });
    const assignees = ['unknown_id'];
    const { getByTestId, findByText } = render(
      <TestProviders>
        <AssigneesBadge assignees={assignees} />
      </TestProviders>
    );

    getByTestId('attack-assignees-badgeDisplayPopoverButton').click();

    expect(await findByText(UNKNOWN_USER_PROFILE_NAME)).toBeInTheDocument();
  });
});
