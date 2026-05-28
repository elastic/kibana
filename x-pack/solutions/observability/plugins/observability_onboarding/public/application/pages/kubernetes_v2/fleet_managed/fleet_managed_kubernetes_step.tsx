/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiCallOut,
  EuiCodeBlock,
  EuiFieldPassword,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiLink,
  EuiSkeletonRectangle,
  EuiSkeletonText,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { ObservabilityOnboardingAppServices } from '../../../..';
import { useFleetManagedKubernetesState } from './use_fleet_managed_kubernetes_state';

const FLEET_SERVER_URL_PLACEHOLDER = '<YOUR_FLEET_SERVER_URL>';
const ENROLLMENT_TOKEN_PLACEHOLDER = '<YOUR_ENROLLMENT_TOKEN>';
const ADD_REPOSITORY_COMMAND = "helm repo add elastic 'https://helm.elastic.co' --force-update";

const buildFleetManagedInstallCommand = ({
  fleetServerUrl,
  enrollmentToken,
}: {
  fleetServerUrl: string;
  enrollmentToken: string;
}) =>
  [
    'helm install elastic-agent elastic/elastic-agent \\',
    '  -n kube-system \\',
    '  --set agent.fleet.enabled=true \\',
    `  --set agent.fleet.url="${fleetServerUrl || FLEET_SERVER_URL_PLACEHOLDER}" \\`,
    `  --set agent.fleet.token="${enrollmentToken || ENROLLMENT_TOKEN_PLACEHOLDER}"`,
  ].join('\n');

export const FleetManagedKubernetesStep: React.FC = () => {
  const {
    services: { application },
  } = useKibana<ObservabilityOnboardingAppServices>();
  const {
    isLoadingDefaults,
    error,
    fleetServerUrl,
    enrollmentToken,
    agentPolicyId,
    setFleetServerUrl,
    setEnrollmentToken,
  } = useFleetManagedKubernetesState();

  const fleetManagedInstallCommand = buildFleetManagedInstallCommand({
    fleetServerUrl,
    enrollmentToken,
  });

  const kubernetesIntegrationHref = application.getUrlForApp('fleet', {
    path: `/integrations/kubernetes/add-integration${
      agentPolicyId ? `?policyId=${encodeURIComponent(agentPolicyId)}` : ''
    }`,
  });

  if (isLoadingDefaults) {
    return (
      <div data-test-subj="observabilityOnboardingKubernetesV2FleetManagedStep">
        <EuiSkeletonText lines={5} />
        <EuiSpacer />
        <EuiSkeletonRectangle width="100%" height={40} />
        <EuiSpacer />
        <EuiSkeletonRectangle width="100%" height={40} />
      </div>
    );
  }

  return (
    <div data-test-subj="observabilityOnboardingKubernetesV2FleetManagedStep">
      {error ? (
        <>
          <EuiCallOut announceOnMount title={error.message} color="danger" iconType="error" />
          <EuiSpacer />
        </>
      ) : null}

      <EuiFlexGroup
        data-test-subj="observabilityOnboardingKubernetesV2FleetConnectionInputs"
        gutterSize="m"
      >
        <EuiFlexItem>
          <EuiFormRow
            label={i18n.translate(
              'xpack.observability_onboarding.kubernetesV2.fleetManaged.fleetServerUrlLabel',
              { defaultMessage: 'Fleet Server URL' }
            )}
            fullWidth
          >
            <EuiFieldText
              fullWidth
              value={fleetServerUrl}
              onChange={(event) => setFleetServerUrl(event.target.value)}
              placeholder="https://fleet-server:8220"
              data-test-subj="observabilityOnboardingKubernetesV2FleetServerUrlInput"
            />
          </EuiFormRow>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiFormRow
            label={i18n.translate(
              'xpack.observability_onboarding.kubernetesV2.fleetManaged.enrollmentTokenLabel',
              { defaultMessage: 'Enrollment token' }
            )}
            fullWidth
          >
            <EuiFieldPassword
              type="dual"
              fullWidth
              value={enrollmentToken}
              onChange={(event) => setEnrollmentToken(event.target.value)}
              placeholder={i18n.translate(
                'xpack.observability_onboarding.kubernetesV2.fleetManaged.enrollmentTokenPlaceholder',
                { defaultMessage: 'Enrollment token' }
              )}
              data-test-subj="observabilityOnboardingKubernetesV2FleetEnrollmentTokenInput"
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer />
      <EuiTitle size="xs">
        <h3>
          {i18n.translate(
            'xpack.observability_onboarding.kubernetesV2.fleetManaged.addRepositoryTitle',
            { defaultMessage: 'Add the Elastic Helm repository' }
          )}
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiCodeBlock
        language="bash"
        paddingSize="m"
        fontSize="s"
        isCopyable={true}
        data-test-subj="observabilityOnboardingKubernetesV2FleetAddRepositoryCommand"
      >
        {ADD_REPOSITORY_COMMAND}
      </EuiCodeBlock>

      <EuiSpacer />
      <EuiTitle size="xs">
        <h3>
          {i18n.translate(
            'xpack.observability_onboarding.kubernetesV2.fleetManaged.deployElasticAgentTitle',
            { defaultMessage: 'Deploy Elastic Agent' }
          )}
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiCodeBlock
        language="bash"
        paddingSize="m"
        fontSize="s"
        isCopyable={true}
        data-test-subj="observabilityOnboardingKubernetesV2FleetDeployCommand"
      >
        {fleetManagedInstallCommand}
      </EuiCodeBlock>

      <EuiSpacer />
      <p>
        <FormattedMessage
          id="xpack.observability_onboarding.kubernetesV2.fleetManaged.kubernetesIntegrationCta"
          defaultMessage="Add the {link} to your agent policy to collect Kubernetes data."
          values={{
            link: (
              <EuiLink
                href={kubernetesIntegrationHref}
                data-test-subj="observabilityOnboardingKubernetesV2FleetKubernetesIntegrationCta"
              >
                {i18n.translate(
                  'xpack.observability_onboarding.kubernetesV2.fleetManaged.kubernetesIntegrationLinkLabel',
                  { defaultMessage: 'Kubernetes integration' }
                )}
              </EuiLink>
            ),
          }}
        />
      </p>
    </div>
  );
};
