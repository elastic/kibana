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
  EuiFieldText,
  EuiFormRow,
  EuiLink,
  EuiSkeletonRectangle,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { ObservabilityOnboardingAppServices } from '../../../..';
import { CopyToClipboardButton } from '../../../quickstart_flows/shared/copy_to_clipboard_button';
import { useFleetManagedKubernetesState } from './use_fleet_managed_kubernetes_state';

const KUBERNETES_APPLY_COMMAND = 'kubectl apply -f elastic-agent-managed-kubernetes.yml';

export const FleetManagedKubernetesStep: React.FC = () => {
  const {
    services: { application },
  } = useKibana<ObservabilityOnboardingAppServices>();
  const {
    isLoadingDefaults,
    isLoadingManifest,
    error,
    fleetServerUrl,
    enrollmentToken,
    agentPolicyId,
    manifest,
    downloadHref,
    setFleetServerUrl,
    setEnrollmentToken,
  } = useFleetManagedKubernetesState();

  const showManifestContent = Boolean(manifest) && !isLoadingManifest;

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
          data-test-subj="observabilityOnboardingKubernetesV2FleetServerUrlInput"
        />
      </EuiFormRow>

      <EuiFormRow
        label={i18n.translate(
          'xpack.observability_onboarding.kubernetesV2.fleetManaged.enrollmentTokenLabel',
          { defaultMessage: 'Enrollment token' }
        )}
        fullWidth
      >
        <EuiFieldText
          fullWidth
          value={enrollmentToken}
          onChange={(event) => setEnrollmentToken(event.target.value)}
          data-test-subj="observabilityOnboardingKubernetesV2FleetEnrollmentTokenInput"
        />
      </EuiFormRow>

      {isLoadingManifest ? (
        <div data-test-subj="observabilityOnboardingKubernetesV2FleetManifestLoading">
          <EuiSpacer />
          <EuiSkeletonText lines={4} />
          <EuiSpacer />
          <EuiSkeletonRectangle width="170px" height={40} />
        </div>
      ) : null}

      {showManifestContent && manifest ? (
        <>
          <EuiSpacer />
          <EuiText size="s">
            <p>
              {i18n.translate(
                'xpack.observability_onboarding.kubernetesV2.fleetManaged.manifestDescription',
                {
                  defaultMessage:
                    'Copy or download the Kubernetes manifest, then apply it to your cluster.',
                }
              )}
            </p>
          </EuiText>
          <EuiSpacer />
          <EuiCodeBlock
            language="yaml"
            paddingSize="m"
            data-test-subj="observabilityOnboardingKubernetesV2FleetManifestPreview"
          >
            {manifest}
          </EuiCodeBlock>
          <EuiSpacer />
          <CopyToClipboardButton
            textToCopy={manifest}
            data-test-subj="observabilityOnboardingKubernetesV2FleetManifestCopy"
          />
          {downloadHref ? (
            <>
              <EuiSpacer size="s" />
              <EuiLink
                href={downloadHref}
                data-test-subj="observabilityOnboardingKubernetesV2FleetManifestDownload"
              >
                {i18n.translate(
                  'xpack.observability_onboarding.kubernetesV2.fleetManaged.downloadManifestLabel',
                  { defaultMessage: 'Download manifest' }
                )}
              </EuiLink>
            </>
          ) : null}
          <EuiSpacer />
          <EuiText size="s">
            <p>
              {i18n.translate(
                'xpack.observability_onboarding.kubernetesV2.fleetManaged.applyCommandDescription',
                {
                  defaultMessage:
                    'From the directory where the manifest is downloaded, run the apply command.',
                }
              )}
            </p>
          </EuiText>
          <EuiSpacer />
          <EuiCodeBlock
            language="bash"
            paddingSize="m"
            isCopyable={true}
            data-test-subj="observabilityOnboardingKubernetesV2FleetApplyCommand"
          >
            {KUBERNETES_APPLY_COMMAND}
          </EuiCodeBlock>
        </>
      ) : null}

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
