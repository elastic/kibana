/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { EuiCallOut, EuiEmptyPrompt, EuiFlexGroup, EuiPanel, EuiProgress } from '@elastic/eui';
import React from 'react';
import { useMutation, useQuery } from '@kbn/react-query';
import { FormattedMessage } from '@kbn/i18n-react';
import { InspectButtonContainer } from '../../../../../common/components/inspect';
import { PrivilegedAccessDetectionMLPopover } from './pad_ml_popover';
import { HeaderSection } from '../../../../../common/components/header_section';
import { PRIVILEGED_USER_ACTIVITY_QUERY_ID } from '../privileged_user_activity/constants';
import { useQueryToggle } from '../../../../../common/containers/query_toggle';
import { PrivilegedAccessDetectionChart } from './pad_chart';
import { usePrivilegedAccessDetectionRoutes } from './pad_routes';
import { PrivilegedAccessDetectionInstallPrompt } from './pad_install_prompt';
import { PrivilegedAccessDetectionViewAllAnomaliesButton } from './pad_view_all_anomalies_button';
import { PrivilegedAccessInfoPopover } from './info_popover';

export const PRIVILEGED_ACCESS_DETECTIONS_QUERY_ID = 'privileged-access-detection-query';

const PRIVILEGED_ACCESS_DETECTIONS_STATUS_REFRESH_INTERVAL_IN_MS = 10_000;

export const PrivilegedAccessDetectionsPanel: React.FC<{ spaceId: string }> = ({ spaceId }) => {
  const { toggleStatus, setToggleStatus } = useQueryToggle(PRIVILEGED_USER_ACTIVITY_QUERY_ID);

  const {
    getPrivilegedAccessDetectionStatus,
    setupPrivilegedAccessDetectionMlModule,
    installPrivilegedAccessDetectionPackage,
  } = usePrivilegedAccessDetectionRoutes();

  const {
    data: padInstallationStatus,
    error: padInstallationStatusError,
    refetch: refetchInstallationStatus,
  } = useQuery(['padInstallationStatus'], getPrivilegedAccessDetectionStatus, {
    refetchInterval: PRIVILEGED_ACCESS_DETECTIONS_STATUS_REFRESH_INTERVAL_IN_MS,
  });

  const setupMlModuleMutation = useMutation({ mutationFn: setupPrivilegedAccessDetectionMlModule });
  const installPrivilegedAccessDetectionPackageMutation = useMutation({
    mutationFn: installPrivilegedAccessDetectionPackage,
  });

  const currentlyInstalling =
    installPrivilegedAccessDetectionPackageMutation.isLoading || setupMlModuleMutation.isLoading;

  const install = async () => {
    await installPrivilegedAccessDetectionPackageMutation.mutateAsync();
    await setupMlModuleMutation.mutateAsync();
    await refetchInstallationStatus();
  };

  const packageInstallationComplete =
    padInstallationStatus?.package_installation_status === 'complete' &&
    padInstallationStatus?.ml_module_setup_status === 'complete';

  return (
    // @ts-expect-error upgrade typescript v5.9.3
    <>
      {padInstallationStatusError && (
        <EuiCallOut
          announceOnMount
          title={i18n.translate(
            'xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.privilegedAccessDetection.errorStatus',
            {
              defaultMessage:
                'There was an error retrieving the status of the privileged access detection package.',
            }
          )}
          color="danger"
          iconType="error"
        />
      )}
      {!padInstallationStatus && !padInstallationStatusError && (
        <EuiPanel data-test-subj={'pad-loading-status'} hasShadow={false} hasBorder={true}>
          <EuiProgress size="xs" color="accent" />
        </EuiPanel>
      )}
      {padInstallationStatus && !packageInstallationComplete && !currentlyInstalling && (
        <PrivilegedAccessDetectionInstallPrompt
          installationErrorOccurred={
            !!installPrivilegedAccessDetectionPackageMutation.error || !!setupMlModuleMutation.error
          }
          install={install}
        />
      )}

      {currentlyInstalling && (
        <>
          <EuiPanel hasShadow={false} hasBorder={true}>
            <EuiEmptyPrompt
              hasBorder={false}
              iconType="logoSecurity"
              title={
                <h2>
                  {i18n.translate(
                    'xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.topPrivilegedAccessDetectionAnomalies.privilegedAccessDetection',
                    { defaultMessage: 'Privileged access detection' }
                  )}
                </h2>
              }
              body={
                <>
                  <p>
                    {i18n.translate(
                      'xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.topPrivilegedAccessDetectionAnomalies.installingPrivilegedAccessDetection',
                      { defaultMessage: 'Installing Privileged access detection package' }
                    )}
                  </p>
                  <EuiProgress size="s" color="accent" />
                </>
              }
            />
          </EuiPanel>
        </>
      )}

      {packageInstallationComplete && (
        <InspectButtonContainer>
          <EuiPanel hasBorder hasShadow={false} data-test-subj="privileged-access-detections-panel">
            <HeaderSection
              toggleStatus={toggleStatus}
              toggleQuery={setToggleStatus}
              id={PRIVILEGED_ACCESS_DETECTIONS_QUERY_ID}
              title={
                <>
                  <FormattedMessage
                    id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.topPrivilegedAccessDetectionAnomalies.title"
                    defaultMessage="Top privileged access anomalies"
                  />
                  <PrivilegedAccessInfoPopover />
                </>
              }
              titleSize="m"
              outerDirection="column"
              hideSubtitle
            >
              {toggleStatus && (
                <EuiFlexGroup gutterSize="s">
                  <PrivilegedAccessDetectionMLPopover />
                  <PrivilegedAccessDetectionViewAllAnomaliesButton />
                </EuiFlexGroup>
              )}
            </HeaderSection>
            {toggleStatus && (
              <>
                <PrivilegedAccessDetectionChart
                  jobIds={padInstallationStatus.jobs.map((eachJob) => eachJob.job_id)}
                  spaceId={spaceId}
                />
              </>
            )}
          </EuiPanel>
        </InspectButtonContainer>
      )}
    </>
  );
};
