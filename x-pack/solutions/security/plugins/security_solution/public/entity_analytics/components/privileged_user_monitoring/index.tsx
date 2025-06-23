/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import { RiskLevelsPrivilegedUsersPanel } from './components/risk_level_panel';
import { KeyInsightsPanel } from './components/key_insights_panel';
import { UserActivityPrivilegedUsersPanel } from './components/privileged_user_activity';
import { PrivilegedAccessDetectionsPanel } from './components/privileged_access_detection';

export interface OnboardingCallout {
  userCount: number;
}

export const PrivilegedUserMonitoring = ({
  callout,
  onManageUserClicked,
}: {
  callout?: OnboardingCallout;
  onManageUserClicked: () => void;
}) => {
  const spaceId = useSpaceId();

  const [dismissCallout, setDismissCallout] = useState(false);
  const handleDismiss = useCallback(() => {
    setDismissCallout(true);
  }, []);

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        {callout && !dismissCallout && (
          <EuiCallOut
            title={
              callout.userCount > 0 ? (
                <FormattedMessage
                  id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.dashboard.userCountCallout.title"
                  defaultMessage="Privileged user monitoring successfully set up: {userCount, plural, one {# user added} other {# users added}}"
                  values={{ userCount: callout.userCount }}
                />
              ) : (
                <FormattedMessage
                  id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.dashboard.noUserCallout.Title"
                  defaultMessage="Privileged user monitoring successfully set up"
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
                  'Your privileged users data source has been successfully added. Now you can start monitoring the privileged users activity to detect potential threats before they escalate or cause damage. You can always update your list of privileged users, add or change their data source in settings.'
                }
              />
            </p>

            <EuiButton iconType="gear" color="success" fill size="s" onClick={onManageUserClicked}>
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.dashboard.callout.manageUsersButton"
                defaultMessage="Manage users"
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
            <KeyInsightsPanel />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      {spaceId && <PrivilegedAccessDetectionsPanel spaceId={spaceId} />}
      <EuiFlexItem>
        <UserActivityPrivilegedUsersPanel />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiPanel hasShadow={false} hasBorder={true}>
          {'TODO: Privileged users'}
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
