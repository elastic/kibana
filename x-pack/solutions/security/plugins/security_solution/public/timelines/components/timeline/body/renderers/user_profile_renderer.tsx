/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import React from 'react';
import { UsersAvatarsPanel } from '../../../../../common/components/user_profiles/users_avatars_panel';
import type { ColumnRenderer } from './column_renderer';
import { profileUidColumns } from '../../../../../detections/configurations/security_solution_detections/fetch_page_context';
import type { AlertsUserProfilesData } from '../../../../../detections/configurations/security_solution_detections/fetch_page_context';

export const userProfileColumnRenderer: ColumnRenderer = {
  isInstance: (columnName, _, context) => profileUidColumns.includes(columnName) && !!context,
  renderColumn: ({
    values,
    context,
  }: {
    values: string[] | undefined | null;
    context?: AlertsUserProfilesData;
  }) => {
    // Show spinner if loading profiles or if there are no fetched profiles yet
    // Do not show the loading spinner if context is not provided at all
    if (context?.isLoading) {
      return <EuiLoadingSpinner size="s" />;
    }

    const userProfiles =
      values?.map((uid) => context?.profiles?.find((user) => uid === user.uid)) ?? [];

    return <UsersAvatarsPanel userProfiles={userProfiles} maxVisibleAvatars={4} />;
  },
};
