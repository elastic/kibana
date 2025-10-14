/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiIcon, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { IntegrationCards } from '../privileged_user_monitoring_onboarding/components/integrations_cards';

export const IntegrationsManageDataSource = () => {
  return (
    <EuiFlexGroup alignItems="flexStart" direction="column">
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiIcon size="l" type="plugs" />
        <EuiText>
          <h1>
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.manageDataSources.integrations"
              defaultMessage="Integrations"
            />
          </h1>
        </EuiText>
      </EuiFlexGroup>
      <EuiText>
        <p>
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.manageDataSources.integrations.infoText"
            defaultMessage="By default, all users with admin roles or groups are considered privileged. You can customize which roles or groups are monitored as privileged."
          />
        </p>
      </EuiText>
      <IntegrationCards maxCardWidth={360} showInstallationStatus titleSize="xs" />
    </EuiFlexGroup>
  );
};
