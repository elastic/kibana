/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import { getUserDisplayName } from '@kbn/user-profile-components';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { memo, useMemo } from 'react';
import { WORKFLOW_STATUS_DETAILS_TEST_ID, WORKFLOW_STATUS_TITLE_TEST_ID } from './test_ids';
import { useBulkGetUserProfiles } from '../../../../common/components/user_profiles/use_bulk_get_user_profiles';
import { PreferenceFormattedDate } from '../../../../common/components/formatted_date';
import { useDocumentDetailsContext } from '../../shared/context';
import { getField } from '../../shared/utils';

/**
 * Displays info about who last updated the alert's workflow status and when.
 */
export const AlertStatus = memo(() => {
  const { getFieldsData } = useDocumentDetailsContext();
  const statusUpdatedBy = getFieldsData('kibana.alert.workflow_user');
  const statusUpdatedAt = getField(getFieldsData('kibana.alert.workflow_status_updated_at'));

  const result = useBulkGetUserProfiles({ uids: new Set(statusUpdatedBy) });
  const user = result.data?.[0]?.user;

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

  if (!statusUpdatedBy || !statusUpdatedAt || result.isLoading || user == null) {
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
