/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiText } from '@elastic/eui';
import { useBulkGetUserProfiles } from '../../../../common/components/user_profiles/use_bulk_get_user_profiles';
import { FormattedDate } from '../../../../common/components/formatted_date';
import * as i18n from './translations';

interface UpdatedByLabelProps {
  updatedBy: string;
  updatedAt: string;
}

export const UpdatedByLabel: React.FC<UpdatedByLabelProps> = React.memo(
  ({ updatedBy, updatedAt }: UpdatedByLabelProps) => {
    const userProfileId = useMemo(() => new Set([updatedBy]), [updatedBy]);
    const { isLoading: isLoadingUserProfiles, data: userProfiles } = useBulkGetUserProfiles({
      uids: userProfileId,
    });

    if (isLoadingUserProfiles || !userProfiles?.length) {
      return null;
    }

    const userProfile = userProfiles[0];
    const updatedByName = userProfile.user.full_name ?? userProfile.user.username;
    return (
      <EuiText data-test-subj="updated_at" size="xs">
        <FormattedMessage
          id="xpack.securitySolution.siemMigrations.rules.translationDetails.updatedByLabel"
          defaultMessage="{updated}: {by} on {date}"
          values={{
            updated: <b>{i18n.LAST_UPDATED_LABEL}</b>,
            by: updatedByName,
            date: <FormattedDate value={updatedAt} fieldName="updated_at" />,
          }}
        />
      </EuiText>
    );
  }
);
UpdatedByLabel.displayName = 'UpdatedByLabel';
