/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import type { UserProfileService } from '@kbn/core/public';
import { type DataTableRecord, getFieldValue } from '@kbn/discover-utils';
import { FormattedMessage } from '@kbn/i18n-react';
import { useQuery } from '@kbn/react-query';
import { getUserDisplayName, type UserProfileWithAvatar } from '@kbn/user-profile-components';
import React, { memo, useMemo } from 'react';
import { PreferenceFormattedDate } from '../../../common/components/formatted_date';
import { USER_PROFILES_FAILURE } from '../../../common/components/user_profiles/translations';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { useKibana } from '../../../common/lib/kibana';
import { WORKFLOW_STATUS_DETAILS_TEST_ID, WORKFLOW_STATUS_TITLE_TEST_ID } from './test_ids';

interface AlertStatusProps {
  hit: DataTableRecord;
}

interface UserProfileBulkGetService {
  bulkGet: UserProfileService['bulkGet'];
}

/**
 * WHY: this flyout component is rendered from different hosts (Security app and Discover),
 * which expose user profile services with different shapes.
 * We keep the compatibility resolution local here to avoid broad behavior changes in shared hooks.
 */
const getUserProfileService = (services: unknown): UserProfileBulkGetService | undefined => {
  const serviceContainer = services as {
    core?: { userProfile?: UserProfileBulkGetService };
    userProfile?: UserProfileBulkGetService;
    security?: { userProfiles?: UserProfileBulkGetService };
  };

  return (
    serviceContainer.core?.userProfile ??
    serviceContainer.userProfile ??
    serviceContainer.security?.userProfiles
  );
};

const getFieldFromHit = (hit: DataTableRecord, fieldName: string): unknown => {
  return getFieldValue(hit, fieldName) ?? (hit.flattened as Record<string, unknown>)[fieldName];
};

/**
 * Displays info about who last updated the alert's workflow status and when.
 */
export const AlertStatus = memo(({ hit }: AlertStatusProps) => {
  const { services } = useKibana();
  const { addError } = useAppToasts();
  const userProfileService = useMemo(() => getUserProfileService(services), [services]);

  const statusUpdatedBy = useMemo(() => {
    const workflowUser = getFieldFromHit(hit, 'kibana.alert.workflow_user');
    const users = Array.isArray(workflowUser) ? workflowUser : [workflowUser];

    return users.filter(
      (userId): userId is string => typeof userId === 'string' && userId.length > 0
    );
  }, [hit]);

  const statusUpdatedAt = useMemo(() => {
    const workflowStatusUpdatedAt = getFieldFromHit(hit, 'kibana.alert.workflow_status_updated_at');

    if (Array.isArray(workflowStatusUpdatedAt)) {
      return workflowStatusUpdatedAt.find(
        (date): date is string => typeof date === 'string' && date.length > 0
      );
    }

    return typeof workflowStatusUpdatedAt === 'string' && workflowStatusUpdatedAt.length > 0
      ? workflowStatusUpdatedAt
      : undefined;
  }, [hit]);

  const { data: userProfiles, isLoading } = useQuery<UserProfileWithAvatar[]>(
    ['alertStatusUserProfiles', ...statusUpdatedBy],
    async () => {
      if (statusUpdatedBy.length === 0 || !userProfileService?.bulkGet) {
        return [];
      }

      return userProfileService.bulkGet({ uids: new Set(statusUpdatedBy), dataPath: 'avatar' });
    },
    {
      enabled: statusUpdatedBy.length > 0 && Boolean(userProfileService?.bulkGet),
      retry: false,
      staleTime: Infinity,
      onError: (e) => {
        addError(e, { title: USER_PROFILES_FAILURE });
      },
    }
  );

  const user = userProfiles?.[0]?.user;

  const lastStatusChange = useMemo(
    () => (
      <>
        {user && statusUpdatedAt && (
          <FormattedMessage
            id="xpack.securitySolution.flyout.right.about.status.statusHistoryDetails"
            defaultMessage="Alert status updated by {user} on {date}"
            values={{
              user: getUserDisplayName(user),
              date: <PreferenceFormattedDate value={new Date(statusUpdatedAt)} />,
            }}
          />
        )}
      </>
    ),
    [statusUpdatedAt, user]
  );

  if (statusUpdatedBy.length === 0 || !statusUpdatedAt || isLoading || user == null) {
    return null;
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiSpacer size="xs" />
      <EuiFlexItem data-test-subj={WORKFLOW_STATUS_TITLE_TEST_ID}>
        <EuiTitle size="xxs">
          <h5>
            <FormattedMessage
              id="xpack.securitySolution.flyout.right.about.status.statusHistoryTitle"
              defaultMessage="Last alert status change"
            />
          </h5>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem data-test-subj={WORKFLOW_STATUS_DETAILS_TEST_ID}>{lastStatusChange}</EuiFlexItem>
    </EuiFlexGroup>
  );
});

AlertStatus.displayName = 'AlertStatus';
