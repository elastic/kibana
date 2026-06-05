/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiCode,
  EuiCodeBlock,
  EuiLink,
  EuiSpacer,
  EuiTabbedContent,
  EuiText,
  EuiTitle,
  type EuiTabbedContentTab,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { UseWiredStreamsStatusResult } from '../../../hooks/use_wired_streams_status';
import {
  OtelKubernetesAddRepositoryStep,
  OtelKubernetesInstallStep,
} from '../../quickstart_flows/otel_kubernetes/steps';
import type { IngestionMode } from '../../quickstart_flows/shared/wired_streams_ingestion_selector';

type CollectorTabId = 'edot' | 'existing';

const KUBE_STACK_DEFAULT_CONFIG_DOC_URL =
  'https://www.elastic.co/docs/reference/edot-collector/config/default-config-k8s';
const ELASTICSEARCH_OTLP_ENDPOINT_DOC_URL =
  'https://www.elastic.co/docs/manage-data/ingest/otlp-endpoint';

const buildManagedOtlpExporterYaml = (onboardingId: string) => `processors:
  resource/onboarding_id:
    attributes:
      - key: onboarding.id
        value: "${onboardingId}"
        action: upsert

exporters:
  otlp/elastic:
    endpoint: "\${ELASTIC_OTLP_ENDPOINT}"
    headers:
      Authorization: "ApiKey \${ELASTIC_API_KEY}"
    sending_queue:
      enabled: true
      sizer: bytes
      queue_size: 50_000_000
      block_on_overflow: true
      batch:
        flush_timeout: 1s
        min_size: 1_000_000
        max_size: 4_000_000

service:
  pipelines:
    logs:
      processors: [resource/onboarding_id]
      exporters: [otlp/elastic]
    metrics:
      processors: [resource/onboarding_id]
      exporters: [otlp/elastic]
    traces:
      processors: [resource/onboarding_id]
      exporters: [otlp/elastic]`;

const ManagedExistingCollectorContent: React.FC<{ onboardingId?: string }> = ({ onboardingId }) => (
  <>
    <EuiSpacer size="l" />
    <EuiTitle size="xs">
      <h3>
        {i18n.translate(
          'xpack.observability_onboarding.kubernetesV2.collectorSetup.managedExistingCollectorTitle',
          { defaultMessage: 'Add a managed OTLP exporter' }
        )}
      </h3>
    </EuiTitle>
    <EuiSpacer size="s" />
    <EuiText size="s">
      <p>
        <FormattedMessage
          id="xpack.observability_onboarding.kubernetesV2.collectorSetup.managedExistingCollectorDescription"
          defaultMessage="Merge this configuration fragment into a collector config that already gathers the Kubernetes logs, metrics, and traces you want to send to Elastic."
        />
      </p>
      <p>
        <FormattedMessage
          id="xpack.observability_onboarding.kubernetesV2.collectorSetup.managedExistingCollectorOnboardingIdDescription"
          defaultMessage="Keep your current receivers and add this processor and exporter to the logs, metrics, and traces pipelines you want to send to Elastic. The {processor} processor adds {onboardingId} so Kibana can confirm data from this onboarding flow."
          values={{
            processor: <EuiCode>resource/onboarding_id</EuiCode>,
            onboardingId: <EuiCode>onboarding.id</EuiCode>,
          }}
        />
      </p>
      <p>
        <FormattedMessage
          id="xpack.observability_onboarding.kubernetesV2.collectorSetup.managedExistingCollectorEnvironmentDescription"
          defaultMessage="Set ELASTIC_OTLP_ENDPOINT and ELASTIC_API_KEY in your collector environment before restarting or reloading the collector."
        />
      </p>
      <p>
        <FormattedMessage
          id="xpack.observability_onboarding.kubernetesV2.collectorSetup.managedExistingCollectorReceiversDescription"
          defaultMessage="For full Kubernetes observability, make sure your collector configuration includes maintained receiver examples such as {k8sCluster}, {kubeletstats}, {hostmetrics}, {fileLog}, and OTLP where applicable."
          values={{
            k8sCluster: <EuiCode>k8s_cluster</EuiCode>,
            kubeletstats: <EuiCode>kubeletstats</EuiCode>,
            hostmetrics: <EuiCode>hostmetrics</EuiCode>,
            fileLog: <EuiCode>file_log</EuiCode>,
          }}
        />
      </p>
    </EuiText>
    <EuiSpacer />
    {onboardingId ? (
      <EuiCodeBlock
        paddingSize="m"
        language="yaml"
        isCopyable
        data-test-subj="observabilityOnboardingKubernetesV2ExistingCollectorManagedSnippet"
      >
        {buildManagedOtlpExporterYaml(onboardingId)}
      </EuiCodeBlock>
    ) : (
      <EuiText size="s">
        <p>
          <FormattedMessage
            id="xpack.observability_onboarding.kubernetesV2.collectorSetup.managedExistingCollectorPreparingMessage"
            defaultMessage="Preparing your collector configuration. The snippet will appear when the onboarding flow is ready."
          />
        </p>
      </EuiText>
    )}
  </>
);

const NonManagedExistingCollectorContent: React.FC = () => (
  <>
    <EuiSpacer size="l" />
    <EuiTitle size="xs">
      <h3>
        {i18n.translate(
          'xpack.observability_onboarding.kubernetesV2.collectorSetup.nonManagedExistingCollectorTitle',
          { defaultMessage: 'Use a gateway collector configuration' }
        )}
      </h3>
    </EuiTitle>
    <EuiSpacer size="s" />
    <EuiText size="s">
      <p>
        <FormattedMessage
          id="xpack.observability_onboarding.kubernetesV2.collectorSetup.nonManagedExistingCollectorDescription"
          defaultMessage="Managed OTLP is not available for this deployment. Use a gateway-style collector configuration based on the maintained EDOT Collector Kubernetes configuration, or configure export through the Elasticsearch OTLP endpoint."
        />
      </p>
      <p>
        <FormattedMessage
          id="xpack.observability_onboarding.kubernetesV2.collectorSetup.nonManagedExistingCollectorOnboardingIdDescription"
          defaultMessage="If you adapt those configurations and want the loading indicator to confirm new data, add the same {onboardingId} resource attribute on logs and metrics for this flow."
          values={{ onboardingId: <EuiCode>onboarding.id</EuiCode> }}
        />
      </p>
      <ul>
        <li>
          <EuiLink
            href={KUBE_STACK_DEFAULT_CONFIG_DOC_URL}
            data-test-subj="observabilityOnboardingKubernetesV2ExistingCollectorKubeStackDocsLink"
            target="_blank"
            external
          >
            {i18n.translate(
              'xpack.observability_onboarding.kubernetesV2.collectorSetup.kubeStackDocsLinkLabel',
              { defaultMessage: 'Default configuration of the EDOT Collector for Kubernetes' }
            )}
          </EuiLink>
        </li>
        <li>
          <EuiLink
            href={ELASTICSEARCH_OTLP_ENDPOINT_DOC_URL}
            data-test-subj="observabilityOnboardingKubernetesV2ExistingCollectorOtlpEndpointDocsLink"
            target="_blank"
            external
          >
            {i18n.translate(
              'xpack.observability_onboarding.kubernetesV2.collectorSetup.otlpEndpointDocsLinkLabel',
              { defaultMessage: 'Elasticsearch OTLP endpoint' }
            )}
          </EuiLink>
        </li>
      </ul>
    </EuiText>
  </>
);

export interface OtelCollectorSetupStepProps {
  addRepoCommand: string;
  installStackCommand?: string;
  valuesFileUrl?: string;
  ingestionMode: IngestionMode;
  onIngestionModeChange: (mode: IngestionMode) => void;
  streamsDocLink?: string;
  isManagedOtlpServiceAvailable: boolean;
  onboardingId?: string;
  wiredStreamsStatus: Pick<
    UseWiredStreamsStatusResult,
    'isEnabled' | 'isLoading' | 'isEnabling' | 'enableWiredStreams'
  >;
}

export const OtelCollectorSetupStep: React.FC<OtelCollectorSetupStepProps> = ({
  addRepoCommand,
  installStackCommand,
  valuesFileUrl,
  ingestionMode,
  onIngestionModeChange,
  streamsDocLink,
  isManagedOtlpServiceAvailable,
  onboardingId,
  wiredStreamsStatus,
}) => {
  const tabs = useMemo<Array<EuiTabbedContentTab & { id: CollectorTabId }>>(
    () => [
      {
        id: 'edot',
        name: i18n.translate(
          'xpack.observability_onboarding.kubernetesV2.collectorSetup.edotTabLabel',
          { defaultMessage: 'Elastic Distribution for OTel Collector' }
        ),
        'data-test-subj': 'observabilityOnboardingKubernetesV2CollectorTab-edot',
        content: (
          <>
            <EuiSpacer size="l" />
            <OtelKubernetesAddRepositoryStep
              addRepoCommand={addRepoCommand}
              showTitle
              useInlineCopyOnly
            />
            <EuiSpacer size="xl" />
            <OtelKubernetesInstallStep
              installStackCommand={installStackCommand}
              valuesFileUrl={valuesFileUrl}
              ingestionMode={ingestionMode}
              onIngestionModeChange={onIngestionModeChange}
              streamsDocLink={streamsDocLink}
              wiredStreamsStatus={wiredStreamsStatus}
              showTitle
              useInlineCopyOnly
            />
          </>
        ),
      },
      {
        id: 'existing',
        name: i18n.translate(
          'xpack.observability_onboarding.kubernetesV2.collectorSetup.existingCollectorTabLabel',
          { defaultMessage: 'Use existing collector' }
        ),
        'data-test-subj': 'observabilityOnboardingKubernetesV2CollectorTab-existing',
        content: isManagedOtlpServiceAvailable ? (
          <ManagedExistingCollectorContent onboardingId={onboardingId} />
        ) : (
          <NonManagedExistingCollectorContent />
        ),
      },
    ],
    [
      addRepoCommand,
      installStackCommand,
      valuesFileUrl,
      ingestionMode,
      onIngestionModeChange,
      streamsDocLink,
      isManagedOtlpServiceAvailable,
      onboardingId,
      wiredStreamsStatus,
    ]
  );

  return (
    <div data-test-subj="observabilityOnboardingKubernetesV2CollectorTabs">
      <EuiTabbedContent tabs={tabs} initialSelectedTab={tabs[0]} />
    </div>
  );
};
