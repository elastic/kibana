/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { SecurityUserAvatar, SecurityUserName } from './user_avatar';
import { useUserProfile } from './use_user_profile';
import * as i18n from './translations';

const mockUser = {
  id: '123',
  name: 'Test User',
  username: 'testuser',
  full_name: 'Test User Full',
};

jest.mock('./use_user_profile');

describe('SecurityUserAvatar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useUserProfile as jest.Mock).mockReturnValue({ data: undefined });
  });
  it('renders UserAvatar when userProfile exists', () => {
    (useUserProfile as jest.Mock).mockReturnValue({
      data: { user: mockUser, avatar: 'avatarUrl' },
    });
    render(<SecurityUserAvatar user={mockUser} />);
    expect(screen.getByTestId('userAvatar')).toBeInTheDocument();
  });

  it('renders EuiAvatar when userProfile does not exist', () => {
    render(<SecurityUserAvatar user={mockUser} />);
    expect(screen.getByTestId('genericAvatar')).toBeInTheDocument();
  });
});

describe('SecurityUserName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useUserProfile as jest.Mock).mockReturnValue({ data: undefined });
  });
  it('returns full_name when userProfile exists', () => {
    (useUserProfile as jest.Mock).mockReturnValue({
      data: { user: { ...mockUser, full_name: 'Full Name' } },
    });
    render(<SecurityUserName user={mockUser} />);
    expect(screen.getByText('Full Name')).toBeInTheDocument();
  });

  it('returns username when full_name is missing', () => {
    (useUserProfile as jest.Mock).mockReturnValue({
      data: { user: { ...mockUser, full_name: undefined } },
    });
    render(<SecurityUserName user={mockUser} />);
    expect(screen.getByText('testuser')).toBeInTheDocument();
  });

  it('returns user.name when userProfile does not exist', () => {
    render(<SecurityUserName user={mockUser} />);
    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  it('returns user.id when userProfile and name are missing', () => {
    render(<SecurityUserName user={{ id: '456' }} />);
    expect(screen.getByText('456')).toBeInTheDocument();
  });

  it('returns i18n.YOU when user is missing', () => {
    render(<SecurityUserName />);
    expect(screen.getByText(i18n.YOU)).toBeInTheDocument();
  });
});
