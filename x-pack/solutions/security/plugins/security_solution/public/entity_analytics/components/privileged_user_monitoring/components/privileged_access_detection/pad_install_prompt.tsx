/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiEmptyPrompt, EuiImage, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import dashboardEnableImg from '../../../../images/entity_store_dashboard.png';

export const PrivilegedAccessDetectionInstallPrompt: React.FC<{ install: () => Promise<void> }> = ({
  install,
}) => {
  return (
    <EuiEmptyPrompt
      css={{ minWidth: '100%' }}
      hasBorder
      layout="horizontal"
      actions={
        <EuiToolTip content={'Install and enable privileged access detection anomaly jobs'}>
          <EuiButton
            color="primary"
            fill
            onClick={() => install()}
            data-test-subj={`privilegedUserMonitoringEnablementButton`}
          >
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.privilegedAccessDetection.enableButton"
              defaultMessage="Install"
            />
          </EuiButton>
        </EuiToolTip>
      }
      icon={<EuiImage size="l" hasShadow src={dashboardEnableImg} alt={'Install and Enable'} />}
      data-test-subj="privilegedUserMonitoringEnablementPanel"
      title={<h2>{'Enable Privileged access detection'}</h2>}
      body={
        <p>
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.privilegedAccessEnablementDescription"
            defaultMessage={
              'Detect anomalous privileged access activity in Windows, Linux and Okta system logs.'
            }
          />
        </p>
      }
    />
  );
};
