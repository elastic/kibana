/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useEffect, useContext } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiIcon,
  EuiSpacer,
  EuiTabs,
  EuiTab,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import { MLJobsAwaitingNodeWarning } from '@kbn/ml-plugin/public';
import { FeatureFeedbackButton, useLinkProps } from '@kbn/observability-shared-plugin/public';
import { css } from '@emotion/react';
import {
  MissingResultsPrivilegesPrompt,
  MissingSetupPrivilegesPrompt,
} from '../../logging/log_analysis_setup';
import { useMetricHostsModuleContext } from '../../../containers/ml/modules/metrics_hosts/module';
import { useMetricK8sModuleContext } from '../../../containers/ml/modules/metrics_k8s/module';
import { LoadingPrompt } from '../../loading_page';
import { AnomaliesTable } from './anomalies_table/anomalies_table';
import { SubscriptionSplashPrompt } from '../../subscription_splash_content';
import { useInfraMLCapabilitiesContext } from '../../../containers/ml/infra_ml_capabilities';
import { KibanaEnvironmentContext } from '../../../hooks/use_kibana';

interface Props {
  hasSetupCapabilities: boolean;
  goToSetup(type: 'hosts' | 'kubernetes'): void;
  closeFlyout(): void;
  hideJobType?: boolean;
  hideSelectGroup?: boolean;
}

type Tab = 'jobs' | 'anomalies';

export const INFRA_ML_FLYOUT_FEEDBACK_LINK =
  'https://docs.google.com/forms/d/e/1FAIpQLSfBixH_1HTuqeMCy38iK9w1mB8vl_eVvcLUlSPAPiWKBHeHiQ/viewform';

export const FlyoutHome = (props: Props) => {
  const [tab, setTab] = useState<Tab>('jobs');
  const { goToSetup, closeFlyout } = props;
  const {
    fetchJobStatus: fetchHostJobStatus,
    setupStatus: hostSetupStatus,
    jobSummaries: hostJobSummaries,
  } = useMetricHostsModuleContext();
  const {
    fetchJobStatus: fetchK8sJobStatus,
    setupStatus: k8sSetupStatus,
    jobSummaries: k8sJobSummaries,
  } = useMetricK8sModuleContext();
  const { hasInfraMLCapabilities, hasInfraMLReadCapabilities, hasInfraMLSetupCapabilities } =
    useInfraMLCapabilitiesContext();
  const { kibanaVersion, isCloudEnv, isServerlessEnv } = useContext(KibanaEnvironmentContext);
  const { euiTheme } = useEuiTheme();

  const createHosts = useCallback(() => {
    goToSetup('hosts');
  }, [goToSetup]);

  const createK8s = useCallback(() => {
    goToSetup('kubernetes');
  }, [goToSetup]);

  const jobIds = [
    ...(k8sJobSummaries || []).map((k) => k.id),
    ...(hostJobSummaries || []).map((h) => h.id),
  ];

  useEffect(() => {
    if (hasInfraMLReadCapabilities) {
      fetchHostJobStatus();
      fetchK8sJobStatus();
    }
  }, [fetchK8sJobStatus, fetchHostJobStatus, hasInfraMLReadCapabilities]);

  const hasJobs = hostJobSummaries.length > 0 || k8sJobSummaries.length > 0;
  const manageJobsLinkProps = useLinkProps({
    app: 'ml',
    pathname: '/jobs',
  });

  // Used for prefilling the feedback form (if both types are enabled do not prefill)
  // In case the host type is the only option (if props.hideJobType is true) - prefill 'host'
  const mlJobTypeByNode =
    props.hideJobType || (hostJobSummaries.length > 0 && k8sJobSummaries.length === 0)
      ? 'host'
      : hostJobSummaries.length === 0 && k8sJobSummaries.length > 0
      ? 'pod'
      : undefined;

  if (!hasInfraMLCapabilities) {
    return <SubscriptionSplashPrompt />;
  } else if (!hasInfraMLReadCapabilities) {
    return <MissingResultsPrivilegesPrompt />;
  } else if (hostSetupStatus.type === 'initializing' || k8sSetupStatus.type === 'initializing') {
    return (
      <LoadingPrompt
        message={i18n.translate('xpack.infra.ml.anomalyFlyout.jobStatusLoadingMessage', {
          defaultMessage: 'Checking status of metrics jobs...',
        })}
      />
    );
  } else if (!hasInfraMLSetupCapabilities) {
    return <MissingSetupPrivilegesPrompt />;
  } else {
    return (
      <>
        <EuiFlyoutHeader hasBorder>
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiTitle size="s">
                <h2>
                  <FormattedMessage
                    defaultMessage="Machine Learning anomaly detection"
                    id="xpack.infra.ml.anomalyFlyout.flyoutHeader"
                  />
                </h2>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem
              grow={false}
              css={css`
                margin-right: ${euiTheme.size.l};
              `}
            >
              <FeatureFeedbackButton
                data-test-subj={
                  mlJobTypeByNode
                    ? `infraML${mlJobTypeByNode}FlyoutFeedbackLink`
                    : 'infraMLFlyoutFeedbackLink'
                }
                formUrl={INFRA_ML_FLYOUT_FEEDBACK_LINK}
                kibanaVersion={kibanaVersion}
                isCloudEnv={isCloudEnv}
                isServerlessEnv={isServerlessEnv}
                nodeType={mlJobTypeByNode}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
          <EuiTabs
            bottomBorder
            css={css`
              margin-bottom: calc(-1 * (${euiTheme.size.l} + 1px));
            `}
            size="s"
          >
            <EuiTab isSelected={tab === 'jobs'} onClick={() => setTab('jobs')}>
              {i18n.translate('xpack.infra.ml.anomalyFlyout.jobsTabLabel', {
                defaultMessage: 'Jobs',
              })}
            </EuiTab>
            <EuiTab
              isSelected={tab === 'anomalies'}
              onClick={() => setTab('anomalies')}
              data-test-subj="anomalyFlyoutAnomaliesTab"
            >
              {i18n.translate('xpack.infra.ml.anomalyFlyout.anomaliesTabLabel', {
                defaultMessage: 'Anomalies',
              })}
            </EuiTab>
          </EuiTabs>
        </EuiFlyoutHeader>

        <EuiFlyoutBody
          banner={
            <>
              {tab === 'jobs' && hasJobs && (
                <>
                  <JobsEnabledCallout
                    hasHostJobs={hostJobSummaries.length > 0}
                    hasK8sJobs={k8sJobSummaries.length > 0}
                    jobIds={jobIds}
                  />
                </>
              )}
              <MLJobsAwaitingNodeWarning jobIds={jobIds} />
            </>
          }
        >
          {tab === 'jobs' && (
            <>
              {hasJobs && (
                <>
                  <EuiFlexGroup gutterSize={'s'}>
                    <EuiFlexItem grow={false}>
                      <EuiButton
                        data-test-subj="infraFlyoutHomeManageJobsInMlButton"
                        {...manageJobsLinkProps}
                        style={{ marginRight: 5 }}
                      >
                        <FormattedMessage
                          defaultMessage="Manage jobs in ML"
                          id="xpack.infra.ml.anomalyFlyout.manageJobs"
                        />
                      </EuiButton>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                  <EuiSpacer size="l" />
                </>
              )}
              <EuiText>
                <h4>
                  {i18n.translate('xpack.infra.ml.anomalyFlyout.createMLJobsLabel', {
                    defaultMessage: 'Create ML Jobs',
                  })}
                </h4>
                <p>
                  <FormattedMessage
                    defaultMessage="Anomaly detection is powered by machine learning. Machine learning jobs are available for the following resource types. Enable these jobs to begin detecting anomalies in your infrastructure metrics."
                    id="xpack.infra.ml.anomalyFlyout.createJobs"
                  />
                </p>
              </EuiText>
              <EuiSpacer size="l" />

              <CreateJobTab
                hasHostJobs={hostJobSummaries.length > 0}
                hasK8sJobs={k8sJobSummaries.length > 0}
                hasSetupCapabilities={props.hasSetupCapabilities}
                createHosts={createHosts}
                createK8s={createK8s}
                hideJobType={props.hideJobType}
              />
            </>
          )}

          {tab === 'anomalies' && (
            <AnomaliesTable closeFlyout={closeFlyout} hideSelectGroup={props.hideSelectGroup} />
          )}
        </EuiFlyoutBody>
      </>
    );
  }
};

interface CalloutProps {
  hasHostJobs: boolean;
  hasK8sJobs: boolean;
  jobIds: string[];
}
const JobsEnabledCallout = (props: CalloutProps) => {
  let target = '';
  if (props.hasHostJobs && props.hasK8sJobs) {
    target = `${i18n.translate('xpack.infra.ml.anomalyFlyout.create.hostTitle', {
      defaultMessage: 'Hosts',
    })} and ${i18n.translate('xpack.infra.ml.anomalyFlyout.create.k8sSuccessTitle', {
      defaultMessage: 'Kubernetes',
    })}`;
  } else if (props.hasHostJobs) {
    target = i18n.translate('xpack.infra.ml.anomalyFlyout.create.hostSuccessTitle', {
      defaultMessage: 'Hosts',
    });
  } else if (props.hasK8sJobs) {
    target = i18n.translate('xpack.infra.ml.anomalyFlyout.create.k8sSuccessTitle', {
      defaultMessage: 'Kubernetes',
    });
  }

  return (
    <>
      <EuiCallOut
        size="m"
        color="success"
        title={
          <FormattedMessage
            defaultMessage="Anomaly detection enabled for {target}"
            id="xpack.infra.ml.anomalyFlyout.enabledCallout"
            values={{ target }}
          />
        }
        iconType="check"
      />
    </>
  );
};

interface CreateJobTab {
  hasSetupCapabilities: boolean;
  hasHostJobs: boolean;
  hasK8sJobs: boolean;
  createHosts(): void;
  createK8s(): void;
  hideJobType?: boolean;
}

const CreateJobTab = (props: CreateJobTab) => {
  return (
    <>
      <EuiFlexGroup gutterSize={'m'}>
        <EuiFlexItem>
          <EuiCard
            data-test-subj="infraHostsJobCard"
            isDisabled={!props.hasSetupCapabilities}
            icon={<EuiIcon type={'storage'} size="xl" />}
            title={
              <FormattedMessage
                defaultMessage="Hosts"
                id="xpack.infra.ml.anomalyFlyout.create.hostTitle"
              />
            }
            description={
              <FormattedMessage
                defaultMessage="Detect anomalies for memory usage and network traffic on hosts."
                id="xpack.infra.ml.anomalyFlyout.create.hostDescription"
              />
            }
            footer={
              <>
                {props.hasHostJobs && (
                  <EuiButtonEmpty
                    data-test-subj="infraCreateJobTabRecreateJobsButton"
                    onClick={props.createHosts}
                  >
                    <FormattedMessage
                      defaultMessage="Recreate jobs"
                      id="xpack.infra.ml.anomalyFlyout.create.recreateButton"
                    />
                  </EuiButtonEmpty>
                )}
                {!props.hasHostJobs && (
                  <EuiButton
                    data-test-subj="infraCreateJobTabEnableButton"
                    onClick={props.createHosts}
                  >
                    <FormattedMessage
                      defaultMessage="Enable"
                      id="xpack.infra.ml.anomalyFlyout.create.createButton"
                    />
                  </EuiButton>
                )}
              </>
            }
          />
        </EuiFlexItem>
        {!props.hideJobType && (
          <EuiFlexItem>
            <EuiCard
              data-test-subj="infraK8sJobCard"
              isDisabled={!props.hasSetupCapabilities}
              icon={<EuiIcon type="logoKubernetes" size="xl" />}
              title={
                <FormattedMessage
                  defaultMessage="Kubernetes Pods"
                  id="xpack.infra.ml.anomalyFlyout.create.k8sTitle"
                />
              }
              description={
                <FormattedMessage
                  defaultMessage="Detect anomalies for memory usage and network traffic on Kubernetes Pods."
                  id="xpack.infra.ml.anomalyFlyout.create.k8sDescription"
                />
              }
              footer={
                <>
                  {props.hasK8sJobs && (
                    <EuiButtonEmpty
                      data-test-subj="infraCreateJobTabRecreateJobsButton"
                      onClick={props.createK8s}
                    >
                      <FormattedMessage
                        defaultMessage="Recreate jobs"
                        id="xpack.infra.ml.anomalyFlyout.create.recreateButton"
                      />
                    </EuiButtonEmpty>
                  )}
                  {!props.hasK8sJobs && (
                    <EuiButton
                      data-test-subj="infraCreateJobTabEnableButton"
                      onClick={props.createK8s}
                    >
                      <FormattedMessage
                        defaultMessage="Enable"
                        id="xpack.infra.ml.anomalyFlyout.create.createButton"
                      />
                    </EuiButton>
                  )}
                </>
              }
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </>
  );
};

export const createResultsUrl = (jobIds: string[], mode = 'absolute') => {
  const idString = jobIds.map((j) => `'${j}'`).join(',');
  let path = '';

  const from = moment().subtract(4, 'weeks').toISOString();
  const to = moment().toISOString();

  path += `(ml:(jobIds:!(${idString}))`;
  path += `,refreshInterval:(display:Off,pause:!f,value:0),time:(from:'${from}'`;
  path += `,to:'${to}'`;
  if (mode === 'invalid') {
    path += `,mode:invalid`;
  }
  path += "))&_a=(query:(query_string:(analyze_wildcard:!t,query:'*')))";

  return path;
};
