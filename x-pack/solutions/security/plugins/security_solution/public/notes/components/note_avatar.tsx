/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiAvatar } from '@elastic/eui';
import type { EuiAvatarProps } from '@elastic/eui';
import { UserAvatar, getUserDisplayName } from '@kbn/user-profile-components';
import { useSuggestUsers } from '../../common/components/user_profiles/use_suggest_users';

export interface NoteAvatarProps {
  /**
   * The display name saved on the note (createdBy/updatedBy), which the server stores
   * as the user's full_name || email || username at the time the note was saved
   */
  displayName: string | null | undefined;
  /**
   * Size of the avatar
   */
  size: EuiAvatarProps['size'];
  /**
   * Data test subject string for testing
   */
  ['data-test-subj']?: string;
}

/**
 * Renders the avatar for a note author.
 * Notes only persist the author's display name, so we look up the matching user profile
 * to render the avatar (image, initials and color) configured in the user's profile.
 * Falls back to a default initials avatar when no matching profile is found.
 */
export const NoteAvatar = memo(
  ({ displayName, size, 'data-test-subj': dataTestSubj }: NoteAvatarProps) => {
    const { data: userProfiles } = useSuggestUsers({ searchTerm: '' });

    const userProfile = useMemo(
      () => (userProfiles ?? []).find(({ user }) => getUserDisplayName(user) === displayName),
      [userProfiles, displayName]
    );

    if (userProfile) {
      return (
        <UserAvatar
          data-test-subj={dataTestSubj}
          user={userProfile.user}
          avatar={userProfile.data.avatar}
          size={size}
        />
      );
    }

    return <EuiAvatar data-test-subj={dataTestSubj} size={size} name={displayName || '?'} />;
  }
);

NoteAvatar.displayName = 'NoteAvatar';
