/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiLoadingLogo,
  EuiButton,
  EuiEmptyPrompt,
  EuiIcon,
  EuiMarkdownFormat,
  EuiLink,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { CSPM_POLICY_TEMPLATE, KSPM_POLICY_TEMPLATE } from '@kbn/cloud-security-posture-common';
import type { IndexDetails, CspStatusCode } from '@kbn/cloud-security-posture-common';
import { useCspSetupStatusApi } from '@kbn/cloud-security-posture/src/hooks/use_csp_setup_status_api';
import { useLocation } from 'react-router-dom';
import { findingsNavigation } from '@kbn/cloud-security-posture';
import { EmptyStatesIllustrationContainer } from '../empty_states_illustration_container';
import { useAdd3PIntegrationRoute } from '../../common/api/use_wiz_integration_route';
import { FullSizeCenteredPage } from '../full_size_centered_page';
import { useCISIntegrationPoliciesLink } from '../../common/navigation/use_navigate_to_cis_integration_policies';
import {
  CSPM_NOT_INSTALLED_ACTION_SUBJ,
  KSPM_NOT_INSTALLED_ACTION_SUBJ,
  NO_FINDINGS_STATUS_TEST_SUBJ,
  THIRD_PARTY_INTEGRATIONS_NO_MISCONFIGURATIONS_FINDINGS_PROMPT,
  THIRD_PARTY_NO_MISCONFIGURATIONS_FINDINGS_PROMPT_WIZ_INTEGRATION_BUTTON,
} from '../test_subjects';
import { CloudPosturePage, PACKAGE_NOT_INSTALLED_TEST_SUBJECT } from '../cloud_posture_page';
import type { PostureTypes } from '../../../common/types_old';
import cloudsSVG from '../../assets/illustrations/clouds.svg';
import misconfigurationsVendorsSVG from '../../assets/illustrations/misconfigurations_vendors.svg';
import { useCspIntegrationLink } from '../../common/navigation/use_csp_integration_link';
import { NO_FINDINGS_STATUS_REFRESH_INTERVAL_MS } from '../../common/constants';
import { cspIntegrationDocsNavigation } from '../../common/navigation/constants';

const NotDeployed = ({ postureType }: { postureType: PostureTypes }) => {
  const integrationPoliciesLink = useCISIntegrationPoliciesLink({
    postureType,
  });

  return (
    <EuiEmptyPrompt
      data-test-subj={NO_FINDINGS_STATUS_TEST_SUBJ.NO_AGENTS_DEPLOYED}
      color="plain"
      iconType="fleetApp"
      title={
        <h2>
          <FormattedMessage
            id="xpack.csp.noFindingsStates.noAgentsDeployed.noAgentsDeployedTitle"
            defaultMessage="No Agents Installed"
          />
        </h2>
      }
      body={
        <p>
          <FormattedMessage
            id="xpack.csp.noFindingsStates.noAgentsDeployed.noAgentsDeployedDescription"
            defaultMessage="In order to begin detecting security misconfigurations, you'll need to deploy elastic-agent into the cloud account or Kubernetes cluster you want to monitor."
          />
        </p>
      }
      actions={[
        <EuiButton fill href={integrationPoliciesLink} isDisabled={!integrationPoliciesLink}>
          <FormattedMessage
            id="xpack.csp.noFindingsStates.noAgentsDeployed.noAgentsDeployedButtonTitle"
            defaultMessage="Install Agent"
          />
        </EuiButton>,
      ]}
    />
  );
};

const Indexing = () => (
  <EuiEmptyPrompt
    data-test-subj={NO_FINDINGS_STATUS_TEST_SUBJ.INDEXING}
    color="plain"
    icon={<EuiLoadingLogo logo="logoSecurity" size="xl" />}
    title={
      <h2>
        <FormattedMessage
          id="xpack.csp.noFindingsStates.indexing.indexingButtonTitle"
          defaultMessage="Posture evaluation underway"
        />
      </h2>
    }
    body={
      <p>
        <FormattedMessage
          id="xpack.csp.noFindingsStates.indexing.indexingDescription"
          defaultMessage="Waiting for data to be collected and indexed. Check back later to see your findings"
        />
      </p>
    }
  />
);

const IndexTimeout = () => (
  <EuiEmptyPrompt
    data-test-subj={NO_FINDINGS_STATUS_TEST_SUBJ.INDEX_TIMEOUT}
    color="plain"
    icon={<EuiLoadingLogo logo="logoSecurity" size="xl" />}
    title={
      <h2>
        <FormattedMessage
          id="xpack.csp.noFindingsStates.indexTimeout.indexTimeoutTitle"
          defaultMessage="Waiting for Findings data"
        />
      </h2>
    }
    body={
      <p>
        <FormattedMessage
          id="xpack.csp.noFindingsStates.indexTimeout.indexTimeoutDescription"
          defaultMessage="Collecting findings is taking longer than expected. {docs}."
          values={{
            docs: (
              <EuiLink href="https://ela.st/findings" target="_blank">
                <FormattedMessage
                  id="xpack.csp.noFindingsStates.indexTimeout.indexTimeoutDocLink"
                  defaultMessage="Learn more"
                />
              </EuiLink>
            ),
          }}
        />
      </p>
    }
  />
);

const Unprivileged = ({ unprivilegedIndices }: { unprivilegedIndices: string[] }) => (
  <EuiEmptyPrompt
    data-test-subj={NO_FINDINGS_STATUS_TEST_SUBJ.UNPRIVILEGED}
    color="plain"
    icon={<EuiIcon type="logoSecurity" size="xl" />}
    title={
      <h2>
        <FormattedMessage
          id="xpack.csp.noFindingsStates.unprivileged.unprivilegedTitle"
          defaultMessage="Privileges required"
        />
      </h2>
    }
    body={
      <p>
        <FormattedMessage
          id="xpack.csp.noFindingsStates.unprivileged.unprivilegedDescription"
          defaultMessage="To view cloud posture data, you must update privileges. For more information, contact your Kibana administrator."
        />
      </p>
    }
    footer={
      <EuiMarkdownFormat
        css={css`
          text-align: initial;
        `}
        children={
          i18n.translate('xpack.csp.noFindingsStates.unprivileged.unprivilegedFooterMarkdown', {
            defaultMessage:
              'Required Elasticsearch index privilege `read` for the following indices:',
          }) + unprivilegedIndices.map((idx) => `\n- \`${idx}\``)
        }
      />
    }
  />
);

const EmptySecurityFindingsPrompt = () => {
  const location = useLocation();
  const { euiTheme } = useEuiTheme();
  const kspmIntegrationLink = useCspIntegrationLink(KSPM_POLICY_TEMPLATE);
  const cspmIntegrationLink = useCspIntegrationLink(CSPM_POLICY_TEMPLATE);
  const wizAddIntegrationLink = useAdd3PIntegrationRoute('wiz');
  const is3PSupportedPage = location.pathname.includes(findingsNavigation.findings_default.path);

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiEmptyPrompt
          style={{ padding: euiTheme.size.l }}
          data-test-subj={PACKAGE_NOT_INSTALLED_TEST_SUBJECT}
          icon={
            <EmptyStatesIllustrationContainer>
              <EuiImage size="fullWidth" src={cloudsSVG} alt="clouds" role="presentation" />
            </EmptyStatesIllustrationContainer>
          }
          title={
            <h2>
              <FormattedMessage
                id="xpack.csp.cloudPosturePage.packageNotInstalledRenderer.promptTitle"
                defaultMessage="Elastic’s Cloud Security {lineBreak} Posture Management"
                values={{
                  lineBreak: <br />,
                }}
              />
            </h2>
          }
          layout="vertical"
          color="plain"
          body={
            <p>
              <FormattedMessage
                id="xpack.csp.cloudPosturePage.packageNotInstalledRenderer.promptDescription"
                defaultMessage="Detect and remediate potential configuration {lineBreak} risks in your cloud infrastructure, with our {lineBreak} Cloud and Kubernetes Security Posture {lineBreak} Management solutions. {learnMore}"
                values={{
                  lineBreak: <br />,
                  learnMore: (
                    <EuiLink href={cspIntegrationDocsNavigation.cspm.overviewPath} target="_blank">
                      <FormattedMessage
                        id="xpack.csp.cloudPosturePage.packageNotInstalledRenderer.learnMoreTitle"
                        defaultMessage="Learn more"
                      />
                    </EuiLink>
                  ),
                }}
              />
            </p>
          }
          actions={
            <EuiFlexGroup justifyContent="center" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiButton
                  color="primary"
                  fill
                  href={cspmIntegrationLink}
                  isDisabled={!cspmIntegrationLink}
                  data-test-subj={CSPM_NOT_INSTALLED_ACTION_SUBJ}
                >
                  <FormattedMessage
                    id="xpack.csp.cloudPosturePage.packageNotInstalledRenderer.addCspmIntegrationButtonTitle"
                    defaultMessage="Add CSPM Integration"
                  />
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  color="primary"
                  fill
                  href={kspmIntegrationLink}
                  isDisabled={!kspmIntegrationLink}
                  data-test-subj={KSPM_NOT_INSTALLED_ACTION_SUBJ}
                >
                  <FormattedMessage
                    id="xpack.csp.cloudPosturePage.packageNotInstalledRenderer.addKspmIntegrationButtonTitle"
                    defaultMessage="Add KSPM Integration"
                  />
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          }
        />
      </EuiFlexItem>
      {is3PSupportedPage && (
        <EuiFlexItem>
          <EuiEmptyPrompt
            style={{ padding: euiTheme.size.l }}
            data-test-subj={THIRD_PARTY_INTEGRATIONS_NO_MISCONFIGURATIONS_FINDINGS_PROMPT}
            icon={
              <EmptyStatesIllustrationContainer>
                <EuiImage
                  size="fullWidth"
                  src={misconfigurationsVendorsSVG}
                  alt="misconfigurationsVendorsSVG"
                  role="presentation"
                />
              </EmptyStatesIllustrationContainer>
            }
            title={
              <h2>
                <FormattedMessage
                  id="xpack.csp.cloudPosturePage.3pIntegrationsNoFindingsPrompt.promptTitle"
                  defaultMessage="Already using a {lineBreak} cloud security product?"
                  values={{ lineBreak: <br /> }}
                />
              </h2>
            }
            layout="vertical"
            color="plain"
            body={
              <p>
                <FormattedMessage
                  id="xpack.csp.cloudPosturePage.3pIntegrationsNoFindingsPrompt.promptDescription"
                  defaultMessage="Ingest data from your existing CSPM solution {lineBreak} for centralized analytics, hunting, {lineBreak} investigations, visualizations, and more. {lineBreak} Other integrations coming soon."
                  values={{ lineBreak: <br /> }}
                />
              </p>
            }
            actions={
              <EuiFlexGroup justifyContent="center">
                <EuiFlexItem grow={false}>
                  <EuiButton
                    color="primary"
                    fill
                    href={wizAddIntegrationLink}
                    isDisabled={!wizAddIntegrationLink}
                    data-test-subj={
                      THIRD_PARTY_NO_MISCONFIGURATIONS_FINDINGS_PROMPT_WIZ_INTEGRATION_BUTTON
                    }
                  >
                    <FormattedMessage
                      id="xpack.csp.cloudPosturePage.3pIntegrationsNoFindingsPrompt.addWizIntegrationButtonTitle"
                      defaultMessage="Add Wiz Integration"
                    />
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            }
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

const NoFindingsStatesNotification = ({
  postureType,
  status,
  indicesStatus,
  isNotInstalled,
}: {
  postureType: PostureTypes;
  status?: CspStatusCode;
  indicesStatus?: IndexDetails[];
  isNotInstalled: boolean;
}) => {
  const unprivilegedIndices =
    indicesStatus &&
    indicesStatus
      .filter((idxDetails) => idxDetails.status === 'unprivileged')
      .map((idxDetails: IndexDetails) => idxDetails.index)
      .sort((a, b) => a.localeCompare(b));

  if (status === 'unprivileged')
    return <Unprivileged unprivilegedIndices={unprivilegedIndices || []} />;
  if (status === 'indexing' || status === 'waiting_for_results') return <Indexing />;
  if (status === 'index-timeout') return <IndexTimeout />;
  if (isNotInstalled) return <EmptySecurityFindingsPrompt />;
  if (status === 'not-deployed') return <NotDeployed postureType={postureType} />;

  return null;
};

/**
 * This component will return the render states based on cloud posture setup status API
 * since 'not-installed' is being checked globally by CloudPosturePage and 'indexed' is the pass condition, those states won't be handled here
 * */
export const NoFindingsStates = ({ postureType }: { postureType: PostureTypes }) => {
  const getSetupStatus = useCspSetupStatusApi({
    refetchInterval: NO_FINDINGS_STATUS_REFRESH_INTERVAL_MS,
  });
  const statusKspm = getSetupStatus.data?.kspm?.status;
  const statusCspm = getSetupStatus.data?.cspm?.status;
  const indicesStatus = getSetupStatus.data?.indicesDetails;
  const status = postureType === 'cspm' ? statusCspm : statusKspm;
  const isNotInstalled = statusKspm === 'not-installed' && statusCspm === 'not-installed';

  return (
    <CloudPosturePage query={getSetupStatus}>
      <FullSizeCenteredPage>
        <NoFindingsStatesNotification
          postureType={postureType}
          status={status}
          indicesStatus={indicesStatus}
          isNotInstalled={isNotInstalled}
        />
      </FullSizeCenteredPage>
    </CloudPosturePage>
  );
};
