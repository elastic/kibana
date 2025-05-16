/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sortBy } from 'lodash';

import type { UserProfileWithAvatar } from '@kbn/user-profile-components';

import { NO_ASSIGNEES_VALUE } from './constants';
import type { AssigneesIdsSelection } from './types';

const getSortField = (profile: UserProfileWithAvatar) =>
  profile.user?.full_name?.toLowerCase() ??
  profile.user?.email?.toLowerCase() ??
  profile.user?.username.toLowerCase();

const sortProfiles = (profiles?: UserProfileWithAvatar[]) => {
  if (!profiles) {
    return;
  }

  return sortBy(profiles, getSortField);
};

const moveCurrentUserToBeginning = <T extends { uid: string }>(
  currentUserProfile?: T,
  profiles?: T[]
) => {
  if (!profiles) {
    return;
  }

  if (!currentUserProfile) {
    return profiles;
  }

  const currentProfileIndex = profiles.find((profile) => profile.uid === currentUserProfile.uid);

  if (!currentProfileIndex) {
    return profiles;
  }

  const profilesWithoutCurrentUser = profiles.filter(
    (profile) => profile.uid !== currentUserProfile.uid
  );

  return [currentUserProfile, ...profilesWithoutCurrentUser];
};

export const bringCurrentUserToFrontAndSort = (
  currentUserProfile?: UserProfileWithAvatar,
  profiles?: UserProfileWithAvatar[]
) => moveCurrentUserToBeginning(currentUserProfile, sortProfiles(profiles));

export const removeNoAssigneesSelection = (assignees: AssigneesIdsSelection[]): string[] =>
  assignees.filter<string>((assignee): assignee is string => assignee !== NO_ASSIGNEES_VALUE);
