/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiCallOut, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { DataViewSpec } from '@kbn/data-views-plugin/public';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import { RiskLevelsPrivilegedUsersPanel } from './components/risk_level_panel';
import { KeyInsightsPanel } from './components/key_insights_panel';
import { UserActivityPrivilegedUsersPanel } from './components/privileged_user_activity';
import { PrivilegedAccessDetectionsPanel } from './components/privileged_access_detection';
import { PrivilegedUsersTable } from './components/privileged_users_table';

import { MissingPrivilegesCallout } from '../missing_privileges_callout';
import { usePrivilegedMonitoringPrivileges } from '../../api/hooks/use_privileged_monitoring_privileges';

export interface OnboardingCallout {
  userCount: number;
}

export const PrivilegedUserMonitoring = ({
  callout,
  error,
  onManageUserClicked,
  dataViewSpec,
}: {
  callout?: OnboardingCallout;
  error?: string;
  onManageUserClicked: () => void;
  dataViewSpec: DataViewSpec;
}) => {
  const spaceId = useSpaceId();

  const [dismissCallout, setDismissCallout] = useState(false);
  const handleDismiss = useCallback(() => {
    setDismissCallout(true);
  }, []);

  const { data: privileges } = usePrivilegedMonitoringPrivileges();

  return (
    <EuiFlexGroup direction="column">
      {!privileges || privileges.has_all_required ? null : (
        <EuiFlexItem>
          <MissingPrivilegesCallout
            privileges={privileges}
            title={
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.dashboard.missingPrivileges.title"
                defaultMessage="Insufficient privileges to view the privileged user monitoring panels"
              />
            }
          />
        </EuiFlexItem>
      )}
      <EuiFlexItem>
        {error && (
          <EuiCallOut
            announceOnMount={false}
            title={
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.dashboard.errorTitle"
                defaultMessage="Error loading privileged user monitoring data"
              />
            }
            color="danger"
            iconType="cross"
          >
            <p>{error}</p>
          </EuiCallOut>
        )}
        {callout && !dismissCallout && (
          <EuiCallOut
            announceOnMount
            data-test-subj="privilegedUserMonitoringOnboardingCallout"
            title={
              callout.userCount > 0 ? (
                <FormattedMessage
                  id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.dashboard.userCountCallout.title"
                  defaultMessage="Privileged user monitoring set up: {userCount, plural, one {# user added} other {# users added}}"
                  values={{ userCount: callout.userCount }}
                />
              ) : (
                <FormattedMessage
                  id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.dashboard.noUserCallout.Title"
                  defaultMessage="Privileged user monitoring set up"
                />
              )
            }
            color="success"
            iconType="check"
            onDismiss={handleDismiss}
          >
            <p>
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.dashboard.callout.description"
                defaultMessage={
                  'Your data source has been added. You can now start monitoring privileged user activity to detect potential threats before they escalate or cause damage. You can always update your list of privileged users from the data source settings.'
                }
              />
            </p>

            <EuiButton iconType="gear" color="success" fill size="s" onClick={onManageUserClicked}>
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.dashboard.callout.manageDataSources"
                defaultMessage="Manage data sources"
              />
            </EuiButton>
          </EuiCallOut>
        )}
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup responsive direction="row">
          <EuiFlexItem>
            {spaceId && <RiskLevelsPrivilegedUsersPanel spaceId={spaceId} />}
          </EuiFlexItem>
          <EuiFlexItem>
            {spaceId && <KeyInsightsPanel spaceId={spaceId} dataViewSpec={dataViewSpec} />}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      {spaceId && <PrivilegedUsersTable spaceId={spaceId} />}
      {spaceId && <PrivilegedAccessDetectionsPanel spaceId={spaceId} />}
      <EuiFlexItem>
        <UserActivityPrivilegedUsersPanel dataViewSpec={dataViewSpec} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
