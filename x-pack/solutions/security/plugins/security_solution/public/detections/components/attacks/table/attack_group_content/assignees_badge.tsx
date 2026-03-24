/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { UserAvatar } from '@kbn/user-profile-components';

import { useBulkGetUserProfiles } from '../../../../../common/components/user_profiles/use_bulk_get_user_profiles';
import { UNKNOWN_USER_PROFILE_NAME } from '../../../../../common/components/user_profiles/translations';
import { PopoverItems } from '../../../../../common/components/popover_items';

type AssigneeItem = UserProfileWithAvatar | undefined;

export const AssigneesBadge = ({ assignees }: { assignees: string[] }) => {
  const uids = useMemo(() => new Set(assignees), [assignees]);
  const { data: assignedUsers } = useBulkGetUserProfiles({ uids });
  const items: AssigneeItem[] = useMemo(
    () => assignedUsers ?? assignees.map(() => undefined),
    [assignedUsers, assignees]
  );
  const popoverButtonTitle = useMemo(() => assignees.length.toString(), [assignees.length]);
  const popoverTitle = useMemo(
    () =>
      i18n.translate(
        'xpack.securitySolution.detectionEngine.attacks.tableSection.assigneesTooltipTitle',
        {
          defaultMessage: 'Assignees',
        }
      ),
    []
  );
  const renderAssigneeItem = useCallback((user: AssigneeItem, index: number) => {
    const displayName = user ? user.user.email ?? user.user.username : UNKNOWN_USER_PROFILE_NAME;
    return (
      <EuiFlexGroup
        key={index}
        alignItems="center"
        gutterSize="s"
        responsive={false}
        style={{ width: '100%' }}
      >
        <EuiFlexItem grow={false}>
          <UserAvatar user={user?.user} avatar={user?.data?.avatar} size="s" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s">{displayName}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }, []);

  if (assignees.length === 0) {
    return null;
  }

  return (
    <PopoverItems
      items={items}
      popoverTitle={popoverTitle}
      popoverButtonTitle={popoverButtonTitle}
      popoverButtonIcon="users"
      dataTestPrefix="attack-assignees-badge"
      renderItem={renderAssigneeItem}
    />
  );
};
