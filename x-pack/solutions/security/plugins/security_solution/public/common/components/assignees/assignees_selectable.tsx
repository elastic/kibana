/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash/fp';
import type { FC } from 'react';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';

import { UserProfilesSelectable } from '@kbn/user-profile-components';

import { isEmpty } from 'lodash';
import { useGetCurrentUserProfile } from '../user_profiles/use_get_current_user_profile';
import * as i18n from './translations';
import type { AssigneesIdsSelection, AssigneesProfilesSelection } from './types';
import { NO_ASSIGNEES_VALUE } from './constants';
import { useSuggestUsers } from '../user_profiles/use_suggest_users';
import { useBulkGetUserProfiles } from '../user_profiles/use_bulk_get_user_profiles';
import { bringCurrentUserToFrontAndSort, removeNoAssigneesSelection } from './utils';
import { ASSIGNEES_SELECTABLE_TEST_ID } from './test_ids';

export interface AssigneesSelectableProps {
  /**
   * Identifier of search field.
   */
  searchInputId?: string;

  /**
   * Ids of the users assigned to the alert
   */
  assignedUserIds: AssigneesIdsSelection[];

  /** Ids of users assigned to only some of the selected alerts. */
  mixedUserIds?: string[];

  /**
   * Show "Unassigned" option if needed
   */
  showUnassignedOption?: boolean;

  /**
   * Callback to handle changing of the assignees selection
   */
  onSelectionChange?: (userIds: AssigneesIdsSelection[], mixedUserIds?: string[]) => void;
}

const toProfilesById = (
  previousProfiles: AssigneesProfilesSelection[],
  assignedUserProfiles: AssigneesProfilesSelection[]
) =>
  new Map(
    [...previousProfiles, ...assignedUserProfiles]
      .filter((profile): profile is NonNullable<typeof profile> => profile !== null)
      .map((profile) => [profile.uid, profile])
  );

/**
 * Renders a selectable component given a list of assignees ids
 */
export const AssigneesSelectable: FC<AssigneesSelectableProps> = memo(
  ({ searchInputId, assignedUserIds, mixedUserIds, showUnassignedOption, onSelectionChange }) => {
    const { data: currentUserProfile, isLoading: isLoadingCurrentUserProfile } =
      useGetCurrentUserProfile();
    const existingIds = useMemo(
      () => new Set([...removeNoAssigneesSelection(assignedUserIds), ...(mixedUserIds ?? [])]),
      [assignedUserIds, mixedUserIds]
    );
    const { isLoading: isLoadingUserProfiles, data: assignedUserProfiles } = useBulkGetUserProfiles(
      {
        uids: existingIds,
      }
    );

    const [searchTerm, setSearchTerm] = useState('');
    const { isLoading: isLoadingSuggestedUsers, data: userProfiles } = useSuggestUsers({
      searchTerm,
    });

    const searchResultProfiles = useMemo(() => {
      // The current user is hoisted to the top of the list once their profile resolves, which
      // re-orders every other option. Publishing options before then would move a row out from
      // under a pointer that is already over it.
      if (isLoadingCurrentUserProfile) {
        return [];
      }

      const sortedUsers = bringCurrentUserToFrontAndSort(currentUserProfile, userProfiles) ?? [];

      if (showUnassignedOption && isEmpty(searchTerm)) {
        return [NO_ASSIGNEES_VALUE, ...sortedUsers];
      }

      return sortedUsers;
    }, [
      currentUserProfile,
      isLoadingCurrentUserProfile,
      searchTerm,
      showUnassignedOption,
      userProfiles,
    ]);

    /**
     * Holds user profiles of currently selected users
     */
    const [selectedUserProfiles, setSelectedUserProfiles] = useState<AssigneesProfilesSelection[]>(
      []
    );
    const [mixedUserProfiles, setMixedUserProfiles] = useState<AssigneesProfilesSelection[]>([]);
    const [selectedUserIds, setSelectedUserIds] =
      useState<AssigneesIdsSelection[]>(assignedUserIds);
    const [selectedMixedUserIds, setSelectedMixedUserIds] = useState<string[]>(mixedUserIds ?? []);

    useEffect(() => setSelectedUserIds(assignedUserIds), [assignedUserIds]);
    useEffect(() => setSelectedMixedUserIds(mixedUserIds ?? []), [mixedUserIds]);

    useEffect(() => {
      if (isLoadingUserProfiles || !assignedUserProfiles) {
        return;
      }
      setSelectedUserProfiles((previousProfiles) => {
        const profilesById = toProfilesById(previousProfiles, assignedUserProfiles);
        const nextProfiles = selectedUserIds.flatMap((uid) =>
          uid === NO_ASSIGNEES_VALUE ? [NO_ASSIGNEES_VALUE] : profilesById.get(uid) ?? []
        );
        return isEqual(nextProfiles, previousProfiles) ? previousProfiles : nextProfiles;
      });
      setMixedUserProfiles((previousProfiles) => {
        const profilesById = toProfilesById(previousProfiles, assignedUserProfiles);
        const nextProfiles = selectedMixedUserIds.flatMap((uid) => profilesById.get(uid) ?? []);
        return isEqual(nextProfiles, previousProfiles) ? previousProfiles : nextProfiles;
      });
    }, [assignedUserProfiles, isLoadingUserProfiles, selectedMixedUserIds, selectedUserIds]);

    const handleSelectedAssignees = useCallback(
      (
        newAssignees: AssigneesProfilesSelection[],
        newMixedAssignees?: AssigneesProfilesSelection[]
      ) => {
        if (
          !isEqual(newAssignees, selectedUserProfiles) ||
          !isEqual(newMixedAssignees ?? [], mixedUserProfiles)
        ) {
          setSelectedUserProfiles(newAssignees);
          const selectedIds = newAssignees.map((assignee) => assignee?.uid ?? NO_ASSIGNEES_VALUE);
          const unresolvedSelectedIds = selectedUserIds.filter(
            (uid): uid is string =>
              uid !== NO_ASSIGNEES_VALUE &&
              !selectedUserProfiles.some((profile) => profile?.uid === uid)
          );
          const nextSelectedIds = [...new Set([...selectedIds, ...unresolvedSelectedIds])];
          setSelectedUserIds(nextSelectedIds);
          if (mixedUserIds !== undefined) {
            const mixedIds = (newMixedAssignees ?? []).flatMap((assignee) =>
              assignee ? [assignee.uid] : []
            );
            const unresolvedMixedIds = selectedMixedUserIds.filter(
              (uid) => !mixedUserProfiles.some((profile) => profile?.uid === uid)
            );
            const nextMixedIds = [...new Set([...mixedIds, ...unresolvedMixedIds])];
            setMixedUserProfiles(newMixedAssignees ?? []);
            setSelectedMixedUserIds(nextMixedIds);
            onSelectionChange?.(nextSelectedIds, nextMixedIds);
          } else {
            onSelectionChange?.(nextSelectedIds);
          }
        }
      },
      [
        mixedUserIds,
        mixedUserProfiles,
        onSelectionChange,
        selectedMixedUserIds,
        selectedUserIds,
        selectedUserProfiles,
      ]
    );

    const handleClear = useCallback(() => {
      setSelectedUserProfiles([]);
      setMixedUserProfiles([]);
      setSelectedUserIds([]);
      setSelectedMixedUserIds([]);
      if (mixedUserIds !== undefined) {
        onSelectionChange?.([], []);
      } else {
        onSelectionChange?.([]);
      }
    }, [mixedUserIds, onSelectionChange]);

    const selectedStatusMessage = useCallback(
      (total: number) => i18n.ASSIGNEES_SELECTION_STATUS_MESSAGE(total),
      []
    );

    const isLoading =
      isLoadingCurrentUserProfile || isLoadingUserProfiles || isLoadingSuggestedUsers;

    return (
      <div data-test-subj={ASSIGNEES_SELECTABLE_TEST_ID}>
        <UserProfilesSelectable
          searchInputId={searchInputId}
          onSearchChange={(term: string) => {
            setSearchTerm(term);
          }}
          onChange={handleSelectedAssignees}
          onClear={handleClear}
          selectedStatusMessage={selectedStatusMessage}
          options={searchResultProfiles}
          selectedOptions={selectedUserProfiles}
          mixedOptions={mixedUserIds === undefined ? undefined : mixedUserProfiles}
          isLoading={isLoading}
          height={'full'}
          singleSelection={false}
          searchPlaceholder={i18n.ASSIGNEES_SEARCH_USERS}
          clearButtonLabel={i18n.ASSIGNEES_CLEAR_FILTERS}
          nullOptionLabel={i18n.ASSIGNEES_NO_ASSIGNEES}
        />
      </div>
    );
  }
);

AssigneesSelectable.displayName = 'AssigneesSelectable';
