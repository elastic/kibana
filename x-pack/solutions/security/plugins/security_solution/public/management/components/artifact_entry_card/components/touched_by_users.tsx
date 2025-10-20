/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import type { CommonProps } from '@elastic/eui';
import { EuiAvatar, EuiBadge, EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import styled from 'styled-components';
import { CREATED_BY, LAST_UPDATED_BY } from './translations';
import { TextValueDisplay } from './text_value_display';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';
import { useBulkGetUserProfiles } from '../../../../common/components/user_profiles/use_bulk_get_user_profiles';

const StyledEuiFlexItem = styled(EuiFlexItem)`
  margin: 6px;
`;

export interface TouchedByUsersProps extends Pick<CommonProps, 'data-test-subj'> {
  createdBy: string;
  updatedBy: string;
}

export const TouchedByUsers = memo<TouchedByUsersProps>(
  ({ createdBy, updatedBy, 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);

    const userIds = useMemo(() => {
      const ids = new Set<string>();
      if (createdBy) ids.add(createdBy);
      if (updatedBy) ids.add(updatedBy);
      return ids;
    }, [createdBy, updatedBy]);

    const { isLoading, data: userProfiles } = useBulkGetUserProfiles({ uids: userIds });

    const getUserDisplayName = (userId: string): string => {
      if (!userProfiles?.length) return userId;
      const userProfile = userProfiles.find((profile) => profile.uid === userId);
      if (!userProfile) return userId;
      return userProfile.user.full_name ?? userProfile.user.username;
    };

    const createdByName = getUserDisplayName(createdBy);
    const updatedByName = getUserDisplayName(updatedBy);

    return (
      <EuiFlexGroup
        alignItems="center"
        gutterSize="l"
        responsive={false}
        data-test-subj={dataTestSubj}
      >
        <EuiFlexItem grow={false}>
          <UserName
            label={CREATED_BY}
            value={createdByName}
            isLoading={isLoading}
            data-test-subj={getTestId('createdBy')}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <UserName
            label={LAST_UPDATED_BY}
            value={updatedByName}
            isLoading={isLoading}
            data-test-subj={getTestId('updatedBy')}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
TouchedByUsers.displayName = 'TouchedByUsers';

interface UserNameProps extends Pick<CommonProps, 'data-test-subj'> {
  label: string;
  value: string;
  isLoading?: boolean;
}

const UserName = memo<UserNameProps>(
  ({ label, value, isLoading = false, 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);

    return (
      <EuiFlexGroup
        alignItems="center"
        gutterSize="m"
        wrap={false}
        responsive={false}
        data-test-subj={dataTestSubj}
      >
        <StyledEuiFlexItem grow={false}>
          <EuiBadge data-test-subj={getTestId('label')}>{label}</EuiBadge>
        </StyledEuiFlexItem>
        <StyledEuiFlexItem grow={false}>
          {isLoading ? (
            <EuiLoadingSpinner size="s" data-test-subj={getTestId('loading')} />
          ) : (
            <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center" wrap={false}>
              <EuiFlexItem grow={false}>
                <EuiAvatar name={value} size="s" data-test-subj={getTestId('avatar')} />
              </EuiFlexItem>
              <EuiFlexItem
                grow={false}
                className="eui-textTruncate"
                data-test-subj={getTestId('value')}
              >
                <TextValueDisplay>{value}</TextValueDisplay>
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
        </StyledEuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
UserName.displayName = 'UserName';
