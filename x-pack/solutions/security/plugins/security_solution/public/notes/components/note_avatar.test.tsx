/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { NoteAvatar } from './note_avatar';
import { useSuggestUsers } from '../../common/components/user_profiles/use_suggest_users';

jest.mock('../../common/components/user_profiles/use_suggest_users');

const TEST_ID = 'note-avatar';

describe('NoteAvatar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useSuggestUsers as jest.Mock).mockReturnValue({
      isLoading: false,
      data: [
        {
          uid: '1',
          user: { username: 'elastic', full_name: 'Elastic User' },
          data: { avatar: { imageUrl: 'my-image-url' } },
        },
        {
          uid: '2',
          user: { username: 'test' },
          data: { avatar: { initials: 'TU', color: '#09e8ca' } },
        },
      ],
    });
  });

  it('should render the profile image when the matching user profile has one', () => {
    const { getByTestId } = render(
      <NoteAvatar displayName={'Elastic User'} size="l" data-test-subj={TEST_ID} />
    );

    const avatar = getByTestId(TEST_ID);
    expect(avatar).toBeInTheDocument();
    // EuiAvatar renders the profile image as a CSS background, not an <img> element
    expect(avatar).toHaveStyle('background-image: url(my-image-url)');
  });

  it('should render the profile initials and color when the matching user profile has them', () => {
    const { getByTestId, getByText } = render(
      <NoteAvatar displayName={'test'} size="l" data-test-subj={TEST_ID} />
    );

    expect(getByTestId(TEST_ID)).toBeInTheDocument();
    expect(getByText('TU')).toBeInTheDocument();
  });

  it('should fall back to a default avatar when no user profile matches', () => {
    const { getByTestId, getByText } = render(
      <NoteAvatar displayName={'unknown user'} size="l" data-test-subj={TEST_ID} />
    );

    expect(getByTestId(TEST_ID)).toBeInTheDocument();
    expect(getByText('uu')).toBeInTheDocument();
  });

  it('should render ? when the display name is missing', () => {
    const { getByText } = render(
      <NoteAvatar displayName={undefined} size="l" data-test-subj={TEST_ID} />
    );

    expect(getByText('?')).toBeInTheDocument();
  });
});
