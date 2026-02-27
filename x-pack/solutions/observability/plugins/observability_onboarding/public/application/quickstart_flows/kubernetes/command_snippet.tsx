/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCodeBlock, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { buildHelmCommand } from './build_helm_command';
import { CopyToClipboardButton } from '../shared/copy_to_clipboard_button';
import { usePricingFeature } from '../shared/use_pricing_feature';
import { ObservabilityOnboardingPricingFeature } from '../../../../common/pricing_features';
import type { ElasticAgentVersionInfo } from '../../../../common/types';

interface Props {
  encodedApiKey: string;
  onboardingId: string;
  elasticsearchUrl: string;
  isCopyPrimaryAction: boolean;
  elasticAgentVersionInfo: ElasticAgentVersionInfo;
}

export function CommandSnippet({
  encodedApiKey,
  onboardingId,
  elasticsearchUrl,
  isCopyPrimaryAction,
  elasticAgentVersionInfo,
}: Props) {
  const metricsEnabled = usePricingFeature(
    ObservabilityOnboardingPricingFeature.METRICS_ONBOARDING
  );
  const command = buildHelmCommand({
    encodedApiKey,
    onboardingId,
    elasticsearchUrl,
    metricsEnabled,
    elasticAgentVersionInfo,
  });

  return (
    <>
      <EuiText>
        <p>
          <FormattedMessage
            id="xpack.observability_onboarding.kubernetesPanel.installElasticAgentDescription"
            defaultMessage="Copy and run the install command. Note that the following manifest contains resource limits that may not be appropriate for a production environment, review our guide on {scalingLink} before deploying this manifest. Refer to the {docsLink} for information on supported Helm versions."
            values={{
              scalingLink: (
                <EuiLink
                  data-test-subj="observabilityOnboardingKubernetesPanelScalingElasticAgentOnKubernetesLink"
                  href="https://www.elastic.co/guide/en/fleet/current/scaling-on-kubernetes.html"
                  external
                  target="_blank"
                >
                  {i18n.translate(
                    'xpack.observability_onboarding.kubernetesPanel.scalingElasticAgentOnLinkLabel',
                    { defaultMessage: 'Scaling Elastic Agent on Kubernetes' }
                  )}
                </EuiLink>
              ),
              docsLink: (
                <EuiLink
                  data-test-subj="observabilityOnboardingKubernetesPanelQuickstartDocsLink"
                  href="https://www.elastic.co/docs/solutions/observability/get-started/quickstart-monitor-kubernetes-cluster-with-elastic-agent"
                  external
                  target="_blank"
                >
                  {i18n.translate(
                    'xpack.observability_onboarding.kubernetesPanel.quickstartDocsLinkLabel',
                    { defaultMessage: 'quickstart guide' }
                  )}
                </EuiLink>
              ),
            }}
          />
        </p>
      </EuiText>

      <EuiSpacer />

      <EuiCodeBlock
        language="text"
        paddingSize="m"
        fontSize="m"
        data-test-subj="observabilityOnboardingKubernetesPanelCodeSnippet"
      >
        {command}
      </EuiCodeBlock>

      <EuiSpacer />

      <CopyToClipboardButton textToCopy={command} fill={isCopyPrimaryAction} />
    </>
  );
}
