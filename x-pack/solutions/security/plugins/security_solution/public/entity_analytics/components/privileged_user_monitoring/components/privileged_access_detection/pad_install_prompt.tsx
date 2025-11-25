/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiImage,
  EuiToolTip,
  EuiPanel,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useState } from 'react';
import { MlNodeAvailableWarningShared } from '@kbn/ml-plugin/public';
import { i18n } from '@kbn/i18n';
import dashboardEnableImg from '../../../../images/entity_store_dashboard.png';

export const PrivilegedAccessDetectionInstallPrompt: React.FC<{
  installationErrorOccurred: boolean;
  install: () => Promise<void>;
}> = ({ installationErrorOccurred, install }) => {
  const [mlNodesAvailable, setMlNodesAvailable] = useState(false);

  const privilegedAccessDetectionInstallTooltipText = i18n.translate(
    'xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.topPrivilegedAccessDetectionAnomalies.installTooltip',
    { defaultMessage: 'Install and enable privileged access detection anomaly jobs' }
  );

  const privilegedAccessDetectionInstallTooltipUnavailableText = i18n.translate(
    'xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.topPrivilegedAccessDetectionAnomalies.installUnavailableTooltip',
    { defaultMessage: 'Unable to install jobs due to no ML node currently available.' }
  );

  return (
    <EuiPanel hasShadow={false} hasBorder={true}>
      <EuiEmptyPrompt
        hasBorder={false}
        layout="horizontal"
        actions={
          <EuiToolTip
            content={
              mlNodesAvailable
                ? privilegedAccessDetectionInstallTooltipText
                : privilegedAccessDetectionInstallTooltipUnavailableText
            }
          >
            <EuiButton
              color="primary"
              disabled={!mlNodesAvailable}
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
        icon={
          <EuiImage
            size="l"
            hasShadow
            src={dashboardEnableImg}
            alt={i18n.translate(
              'xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.topPrivilegedAccessDetectionAnomalies.installAndEnable',
              { defaultMessage: 'Install and Enable.' }
            )}
          />
        }
        data-test-subj="privilegedUserMonitoringEnablementPanel"
        title={
          <h2>
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.topPrivilegedAccessDetectionAnomalies.enablePrivilegedAccessDetection',
              { defaultMessage: 'Enable Privileged access detection.' }
            )}
          </h2>
        }
        body={
          <>
            <p>
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.privilegedAccessEnablementDescription"
                defaultMessage={
                  'Detect anomalous privileged access activity in Windows, Linux and Okta system logs.'
                }
              />
            </p>
            <MlNodeAvailableWarningShared size="s" nodeAvailableCallback={setMlNodesAvailable} />
            {installationErrorOccurred && (
              <EuiCallOut
                announceOnMount
                title={i18n.translate(
                  'xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.privilegedAccessDetection.installErrorStatus',
                  {
                    defaultMessage:
                      'There was an error installing the privileged access detection package.',
                  }
                )}
                color="danger"
                iconType="error"
              />
            )}
          </>
        }
      />
    </EuiPanel>
  );
};
