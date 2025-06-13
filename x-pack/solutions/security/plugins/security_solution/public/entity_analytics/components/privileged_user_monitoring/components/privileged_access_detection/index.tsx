/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiEmptyPrompt,
  EuiImage,
  EuiFlexGroup,
  EuiLink,
  EuiSkeletonLoading,
  EuiSkeletonRectangle,
  EuiPanel,
  EuiToolTip,
  EuiProgress,
  EuiText,
} from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import moment from 'moment';
import { useNavigation } from '@kbn/security-solution-navigation';
import { ML_PAGES, useMlHref } from '@kbn/ml-plugin/public';
import dashboardEnableImg from '../../../../images/entity_store_dashboard.png';
import { HeaderSection } from '../../../../../common/components/header_section';
import { PRIVILEGED_USER_ACTIVITY_QUERY_ID } from '../privileged_user_activity/constants';
import { useQueryToggle } from '../../../../../common/containers/query_toggle';
import { PrivilegedAccessDetectionChart } from './pad_chart/pad_chart';
import { usePrivilegedAccessDetectionRoutes } from './pad_routes';
import { MlPopover } from '../../../../../common/components/ml_popover/ml_popover';
import { useIntegrationLinkState } from '../../../../../common/hooks/integrations/use_integration_link_state';
import { ENTITY_ANALYTICS_PRIVILEGED_USER_MONITORING_PATH } from '../../../../../../common/constants';
import { INTEGRATION_APP_ID } from '../../../../../common/lib/integrations/constants';
import { addPathParamToUrl } from '../../../../../common/utils/integrations';
import { usePrivilegedAccessDetectionIntegration } from '../../../privileged_user_monitoring_onboarding/hooks/use_integrations';
import { useKibana } from '../../../../../common/lib/kibana';
import { useGlobalTime } from '../../../../../common/containers/use_global_time';

const TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.topPrivilegedAccessDetectionAnomalies.title',
  { defaultMessage: 'Top privileged access detection anomalies' }
);

const PRIVILEGED_ACCESS_DETECTIONS_QUERY_ID = 'privileged-access-detection-query';

const usePopoverDescription = () => {
  const state = useIntegrationLinkState(ENTITY_ANALYTICS_PRIVILEGED_USER_MONITORING_PATH);
  const { navigateTo } = useNavigation();
  const padPackage = usePrivilegedAccessDetectionIntegration();
  const navigateToPadIntegration = useCallback(() => {
    navigateTo({
      appId: INTEGRATION_APP_ID,
      path: addPathParamToUrl(
        `/detail/${padPackage?.name}-${padPackage?.version}/overview`,
        ENTITY_ANALYTICS_PRIVILEGED_USER_MONITORING_PATH
      ),
      state,
    });
  }, [navigateTo, padPackage, state]);

  return (
    <EuiText>
      <p>
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.privilegedAccessDetection.padMlJobsDescription"
          defaultMessage="Run privileged access detection jobs in to monitor anomalous behaviors of privileged users in your environment. Note that some jobs may require additional manual steps configured in order to fully function. See the {integrationLink} for details"
          values={{
            integrationLink: (
              <EuiLink external onClick={navigateToPadIntegration}>
                {'Privileged access detection integration'}
              </EuiLink>
            ),
          }}
        />
      </p>
    </EuiText>
  );
};

export const PrivilegedAccessDetectionsPanel: React.FC<{ spaceId: string }> = ({ spaceId }) => {
  const { toggleStatus, setToggleStatus } = useQueryToggle(PRIVILEGED_USER_ACTIVITY_QUERY_ID);

  const popoverDescription = usePopoverDescription();

  const {
    getPrivilegedAccessDetectionStatus,
    setupPrivilegedAccessDetectionMlModule,
    installPrivilegedAccessDetectionPackage,
  } = usePrivilegedAccessDetectionRoutes();

  const {
    data: padInstallationStatus,
    isLoading: padInstallationStatusIsLoading,
    refetch: refetchInstallationStatus,
  } = useQuery(['padInstallationStatus'], getPrivilegedAccessDetectionStatus, {
    refetchInterval: 10000,
  });

  const {
    services: { ml, http },
  } = useKibana();

  const { from, to } = useGlobalTime();

  const anomalyExplorerUrl = useMlHref(ml, http.basePath.get(), {
    page: ML_PAGES.ANOMALY_EXPLORER,
    pageState: {
      jobIds: ['pad'],
      timeRange: { from, to },
      mlExplorerSwimlane: {
        viewByFieldName: 'user.name',
      },
    },
  });

  const setupMlModuleMutation = useMutation({ mutationFn: setupPrivilegedAccessDetectionMlModule });
  const installPrivilegedAccessDetectionPackageMutation = useMutation({
    mutationFn: installPrivilegedAccessDetectionPackage,
  });

  const currentlyInstalling = useMemo(() => {
    return (
      installPrivilegedAccessDetectionPackageMutation.isLoading || setupMlModuleMutation.isLoading
    );
  }, [installPrivilegedAccessDetectionPackageMutation, setupMlModuleMutation]);

  const install = async () => {
    await installPrivilegedAccessDetectionPackageMutation.mutateAsync();
    await setupMlModuleMutation.mutateAsync();
    await refetchInstallationStatus();
  };

  const sixtyDaysAgo = moment().subtract(60, 'days').toDate().getTime();

  return (
    <>
      {padInstallationStatus?.packageInstallationStatus === 'INCOMPLETE' &&
        !currentlyInstalling && (
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
            icon={
              <EuiImage size="l" hasShadow src={dashboardEnableImg} alt={'Install and Enable'} />
            }
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
        )}

      {currentlyInstalling && (
        <>
          <EuiEmptyPrompt
            css={{ minWidth: '100%' }}
            hasBorder
            iconType="logoSecurity"
            title={<h2>{'Privileged Access Detection'}</h2>}
            body={
              <>
                <p>{'Installing Privileged Access Detection package'}</p>
                <EuiProgress size="s" color="accent" />
              </>
            }
          />
        </>
      )}

      {padInstallationStatus?.packageInstallationStatus === 'COMPLETE' && (
        <EuiPanel hasBorder hasShadow={false} data-test-subj="privileged-access-detections-panel">
          <HeaderSection
            toggleStatus={toggleStatus}
            toggleQuery={setToggleStatus}
            id={PRIVILEGED_ACCESS_DETECTIONS_QUERY_ID}
            showInspectButton={false}
            title={TITLE}
            titleSize="s"
            outerDirection="column"
            hideSubtitle
          >
            {toggleStatus && (
              <EuiFlexGroup gutterSize="s">
                <MlPopover
                  mlJobStartTime={sixtyDaysAgo}
                  popoverDescription={popoverDescription}
                  defaultFilters={{ selectedGroups: ['pad'] }}
                  hideGroupsFilter={true}
                  hideElasticAndCustomJobsFilter={true}
                />
                <EuiButton color={'primary'} fill={false} iconType={'anomalySwimLane'}>
                  <EuiLink href={anomalyExplorerUrl} external={false} target="_blank">
                    <FormattedMessage
                      id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.privilegedAccessDetection.anomalyExplorer"
                      defaultMessage="View all in Anomaly Explorer"
                    />
                  </EuiLink>
                </EuiButton>
              </EuiFlexGroup>
            )}
          </HeaderSection>
          {toggleStatus && (
            <>
              <EuiSkeletonLoading
                isLoading={padInstallationStatusIsLoading}
                loadingContent={<EuiSkeletonRectangle width={'400px'} height={'400px'} />}
                loadedContent={
                  <PrivilegedAccessDetectionChart
                    jobIds={padInstallationStatus.jobs.map((eachJob) => eachJob.jobId)}
                    spaceId={spaceId}
                  />
                }
              />
            </>
          )}
        </EuiPanel>
      )}
    </>
  );
};
