/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import type { EuiDataGridColumn } from '@elastic/eui';
import type { Alert } from '@kbn/alerting-types';
import { useBulkGetUserProfiles } from '../../../common/components/user_profiles/use_bulk_get_user_profiles';

export interface AlertsUserProfilesData {
  profiles: UserProfileWithAvatar[] | undefined;
  isLoading: boolean;
}

// Add new columns names to this array to render the user's display name instead of profile_uid
export const profileUidColumns = [
  'kibana.alert.workflow_assignee_ids',
  'kibana.alert.workflow_user',
];

export const useFetchUserProfilesFromAlerts = ({
  alerts,
  columns,
}: {
  alerts: Alert[];
  columns: EuiDataGridColumn[];
}) => {
  const uids = useMemo(() => {
    const ids = new Set<string>();
    alerts.forEach((alert) => {
      profileUidColumns.forEach((columnId) => {
        if (columns.find((column) => column.id === columnId) != null) {
          const userUids = alert[columnId] as string[];
          userUids?.forEach((uid) => ids.add(uid));
        }
      });
    });
    return ids;
  }, [alerts, columns]);
  const result = useBulkGetUserProfiles({ uids });
  return useMemo<AlertsUserProfilesData>(
    () => ({ profiles: result.data, isLoading: result.isLoading }),
    [result.data, result.isLoading]
  );
};
