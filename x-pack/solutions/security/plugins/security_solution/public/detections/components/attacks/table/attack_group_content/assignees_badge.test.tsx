/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';

import { AssigneesBadge } from './assignees_badge';
import { UNKNOWN_USER_PROFILE_NAME } from '../../../../../common/components/user_profiles/translations';

const mockUseBulkGetUserProfiles = jest.fn();

jest.mock('../../../../../common/components/user_profiles/use_bulk_get_user_profiles', () => ({
  useBulkGetUserProfiles: () => mockUseBulkGetUserProfiles(),
}));

describe('AssigneesBadge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseBulkGetUserProfiles.mockReturnValue({
      data: [
        { uid: '1', user: { username: 'user1', email: 'user1@example.com' } },
        { uid: '2', user: { username: 'user2', email: 'user2@example.com' } },
      ],
    });
  });

  it('renders correctly with given assignees count', () => {
    const assignees = ['1', '2'];
    const { getByText } = render(<AssigneesBadge assignees={assignees} />);

    // Check if the badge with the correct number of assignees is rendered
    expect(getByText('2')).toBeInTheDocument();
  });

  it('renders nothing when assignees array is empty', () => {
    const { container } = render(<AssigneesBadge assignees={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('displays tooltip with title and correct assignees list on hover', async () => {
    const assignees = ['1', '2'];
    const { getByText, findByText } = render(<AssigneesBadge assignees={assignees} />);

    const badge = getByText('2');
    fireEvent.mouseOver(badge);

    // Check tooltip title
    expect(await findByText('Assignees')).toBeInTheDocument();

    // Check tooltip items
    // First user has an email, so we expect the email to be shown over username
    expect(await findByText('user1@example.com')).toBeInTheDocument();
    expect(await findByText('user2@example.com')).toBeInTheDocument();
  });

  it('falls back to username if email is missing', async () => {
    mockUseBulkGetUserProfiles.mockReturnValue({
      data: [{ uid: '3', user: { username: 'user3_no_email' } }],
    });
    const assignees = ['3'];
    const { getByText, findByText } = render(<AssigneesBadge assignees={assignees} />);

    const badge = getByText('1');
    fireEvent.mouseOver(badge);

    expect(await findByText('user3_no_email')).toBeInTheDocument();
  });

  it('falls back to UNKNOWN_USER_PROFILE_NAME if user info is unavailable', async () => {
    mockUseBulkGetUserProfiles.mockReturnValue({
      data: [undefined],
    });
    const assignees = ['unknown_id'];
    const { getByText, findByText } = render(<AssigneesBadge assignees={assignees} />);

    const badge = getByText('1');
    fireEvent.mouseOver(badge);

    expect(await findByText(UNKNOWN_USER_PROFILE_NAME)).toBeInTheDocument();
  });
});
