/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiText } from '@elastic/eui';

import { FormattedDate } from '../../../../../common/components/formatted_date';
import { useBulkGetUserProfiles } from '../../../../../common/components/user_profiles/use_bulk_get_user_profiles';
import type { RuleMigrationRule } from '../../../../../../common/siem_migrations/model/rule_migration.gen';

import * as i18n from './translations';

interface UpdatedByLabelProps {
  ruleMigration: RuleMigrationRule;
}

export const UpdatedByLabel: React.FC<UpdatedByLabelProps> = React.memo(
  ({ ruleMigration }: UpdatedByLabelProps) => {
    const userProfileId = useMemo(
      () => new Set([ruleMigration.updated_by ?? ruleMigration.created_by]),
      [ruleMigration.created_by, ruleMigration.updated_by]
    );
    const { isLoading: isLoadingUserProfiles, data: userProfiles } = useBulkGetUserProfiles({
      uids: userProfileId,
    });

    if (isLoadingUserProfiles || !userProfiles?.length) {
      return null;
    }

    const userProfile = userProfiles[0];
    const updatedBy = userProfile.user.full_name ?? userProfile.user.username;
    const updatedAt = ruleMigration.updated_at ?? ruleMigration['@timestamp'];
    return (
      <EuiText size="xs">
        <FormattedMessage
          id="xpack.securitySolution.siemMigrations.rules.translationDetails.updatedByLabel"
          defaultMessage="{updated}: {by} on {date}"
          values={{
            updated: <b>{i18n.LAST_UPDATED_LABEL}</b>,
            by: updatedBy,
            date: <FormattedDate value={updatedAt} fieldName="updated_at" />,
          }}
        />
      </EuiText>
    );
  }
);
UpdatedByLabel.displayName = 'UpdatedByLabel';
