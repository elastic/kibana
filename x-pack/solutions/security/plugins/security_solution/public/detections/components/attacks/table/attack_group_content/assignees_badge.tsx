/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiHorizontalRule,
  EuiToolTip,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { useBulkGetUserProfiles } from '../../../../../common/components/user_profiles/use_bulk_get_user_profiles';
import { UNKNOWN_USER_PROFILE_NAME } from '../../../../../common/components/user_profiles/translations';

const ASSIGNEES_TOOLTIP_MAX_HEIGHT = '150px';

export const AssigneesBadge = ({ assignees }: { assignees: string[] }) => {
  const uids = useMemo(() => new Set(assignees), [assignees]);
  const { data: assignedUsers } = useBulkGetUserProfiles({ uids });

  if (assignees.length === 0) {
    return null;
  }

  return (
    <EuiToolTip
      content={
        <EuiFlexGroup direction="column" gutterSize="none">
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              {i18n.translate(
                'xpack.securitySolution.detectionEngine.attacks.tableSection.assigneesTooltipTitle',
                { defaultMessage: 'Assignees' }
              )}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiHorizontalRule margin="xs" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup
              direction="column"
              gutterSize="xs"
              style={{
                maxHeight: ASSIGNEES_TOOLTIP_MAX_HEIGHT,
                overflowY: 'auto',
              }}
            >
              {assignedUsers?.map((user, index) => (
                <EuiFlexItem key={user?.uid ?? index}>
                  <EuiText size="s">
                    {user ? user.user.email ?? user.user.username : UNKNOWN_USER_PROFILE_NAME}
                  </EuiText>
                </EuiFlexItem>
              )) ?? null}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
    >
      <EuiBadge tabIndex={0} color="hollow" iconType="users">
        {assignees.length}
      </EuiBadge>
    </EuiToolTip>
  );
};
