/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
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
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { OBSERVABILITY_ONBOARDING_FLOW_PROGRESS_TELEMETRY_EVENT } from '../../../../common/telemetry_events';
import type { ObservabilityOnboardingAppServices } from '../../..';
import {
  OtelKubernetesAddRepositoryStep,
  OtelKubernetesInstallStep,
} from '../../quickstart_flows/otel_kubernetes/steps';
import { MaskedCodeBlock } from '../../quickstart_flows/shared/masked_code_block';

export type CollectorMethod = 'edot' | 'existing_collector';
type CollectorTabId = 'edot' | 'existing_collector';

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

const buildExistingCollectorSecretSnippet = ({
  managedOtlpEndpointUrl,
  apiKeyEncoded,
}: {
  managedOtlpEndpointUrl: string;
  apiKeyEncoded: string;
}) => `kubectl create secret generic elastic-otel-env \\
  --namespace <collector-namespace> \\
  --from-literal=ELASTIC_OTLP_ENDPOINT='${managedOtlpEndpointUrl}' \\
  --from-literal=ELASTIC_API_KEY='${apiKeyEncoded}'

# Reference the Secret from your collector environment. Adapt the namespace,
# resource name, and rollout command to your Helm, Operator, or Deployment setup.
env:
  - name: ELASTIC_OTLP_ENDPOINT
    valueFrom:
      secretKeyRef:
        name: elastic-otel-env
        key: ELASTIC_OTLP_ENDPOINT
  - name: ELASTIC_API_KEY
    valueFrom:
      secretKeyRef:
        name: elastic-otel-env
        key: ELASTIC_API_KEY`;

const ManagedExistingCollectorContent: React.FC<{
  onboardingId?: string;
  managedOtlpEndpointUrl?: string;
  apiKeyEncoded?: string;
}> = ({ onboardingId, managedOtlpEndpointUrl, apiKeyEncoded }) => (
  <>
    <EuiSpacer size="l" />
    <EuiTitle size="xs">
      <h3>
        {i18n.translate(
          'xpack.observability_onboarding.kubernetes.collectorSetup.managedExistingCollectorTitle',
          { defaultMessage: 'Add a managed OTLP exporter' }
        )}
      </h3>
    </EuiTitle>
    <EuiSpacer size="s" />
    <EuiText size="s">
      <p>
        <FormattedMessage
          id="xpack.observability_onboarding.kubernetes.collectorSetup.managedExistingCollectorDescription"
          defaultMessage="Merge this configuration fragment into a collector config that already gathers the Kubernetes logs, metrics, and traces you want to send to Elastic."
        />
      </p>
      <p>
        <FormattedMessage
          id="xpack.observability_onboarding.kubernetes.collectorSetup.managedExistingCollectorOnboardingIdDescription"
          defaultMessage="Keep your current receivers and add this processor and exporter to the logs, metrics, and traces pipelines you want to send to Elastic. The {processor} processor adds {onboardingId} so Kibana can confirm data from this onboarding flow."
          values={{
            processor: <EuiCode>resource/onboarding_id</EuiCode>,
            onboardingId: <EuiCode>onboarding.id</EuiCode>,
          }}
        />
      </p>
      <p>
        <FormattedMessage
          id="xpack.observability_onboarding.kubernetes.collectorSetup.managedExistingCollectorEnvironmentDescription"
          defaultMessage="Create or adapt a Secret in the namespace where your collector runs, then reference ELASTIC_OTLP_ENDPOINT and ELASTIC_API_KEY from your collector environment. Apply the change with the Helm, Operator, or Deployment-specific rollout that manages your collector."
        />
      </p>
      <p>
        <FormattedMessage
          id="xpack.observability_onboarding.kubernetes.collectorSetup.managedExistingCollectorReceiversDescription"
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
        data-test-subj="observabilityOnboardingKubernetesExistingCollectorManagedSnippet"
      >
        {buildManagedOtlpExporterYaml(onboardingId)}
      </EuiCodeBlock>
    ) : (
      <EuiText size="s">
        <p>
          <FormattedMessage
            id="xpack.observability_onboarding.kubernetes.collectorSetup.managedExistingCollectorPreparingMessage"
            defaultMessage="Preparing your collector configuration. The snippet will appear when the onboarding flow is ready."
          />
        </p>
      </EuiText>
    )}
    {managedOtlpEndpointUrl && apiKeyEncoded ? (
      <>
        <EuiSpacer />
        <MaskedCodeBlock
          value={buildExistingCollectorSecretSnippet({ managedOtlpEndpointUrl, apiKeyEncoded })}
          secrets={[managedOtlpEndpointUrl, apiKeyEncoded]}
          language="bash"
          dataTestSubj="observabilityOnboardingKubernetesExistingCollectorSecretSnippet"
        />
      </>
    ) : null}
  </>
);

const NonManagedExistingCollectorContent: React.FC = () => (
  <>
    <EuiSpacer size="l" />
    <EuiTitle size="xs">
      <h3>
        {i18n.translate(
          'xpack.observability_onboarding.kubernetes.collectorSetup.nonManagedExistingCollectorTitle',
          { defaultMessage: 'Use a gateway collector configuration' }
        )}
      </h3>
    </EuiTitle>
    <EuiSpacer size="s" />
    <EuiText size="s">
      <p>
        <FormattedMessage
          id="xpack.observability_onboarding.kubernetes.collectorSetup.nonManagedExistingCollectorDescription"
          defaultMessage="Managed OTLP is not available for this deployment. Use a gateway-style collector configuration based on the maintained EDOT Collector Kubernetes configuration, or configure export through the Elasticsearch OTLP endpoint."
        />
      </p>
      <p>
        <FormattedMessage
          id="xpack.observability_onboarding.kubernetes.collectorSetup.nonManagedExistingCollectorOnboardingIdDescription"
          defaultMessage="If you adapt those configurations and want the loading indicator to confirm new data, add the same {onboardingId} resource attribute on logs and metrics for this flow."
          values={{ onboardingId: <EuiCode>onboarding.id</EuiCode> }}
        />
      </p>
      <ul>
        <li>
          <EuiLink
            href={KUBE_STACK_DEFAULT_CONFIG_DOC_URL}
            data-test-subj="observabilityOnboardingKubernetesExistingCollectorKubeStackDocsLink"
            target="_blank"
            external
          >
            {i18n.translate(
              'xpack.observability_onboarding.kubernetes.collectorSetup.kubeStackDocsLinkLabel',
              { defaultMessage: 'Default configuration of the EDOT Collector for Kubernetes' }
            )}
          </EuiLink>
        </li>
        <li>
          <EuiLink
            href={ELASTICSEARCH_OTLP_ENDPOINT_DOC_URL}
            data-test-subj="observabilityOnboardingKubernetesExistingCollectorOtlpEndpointDocsLink"
            target="_blank"
            external
          >
            {i18n.translate(
              'xpack.observability_onboarding.kubernetes.collectorSetup.otlpEndpointDocsLinkLabel',
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
  isManagedOtlpServiceAvailable: boolean;
  onboardingId?: string;
  managedOtlpEndpointUrl?: string;
  elasticsearchUrl?: string;
  apiKeyEncoded?: string;
  selectedCollectorMethod: CollectorMethod;
  onCollectorMethodChange: (method: CollectorMethod) => void;
}

export const OtelCollectorSetupStep: React.FC<OtelCollectorSetupStepProps> = ({
  addRepoCommand,
  installStackCommand,
  valuesFileUrl,
  isManagedOtlpServiceAvailable,
  onboardingId,
  managedOtlpEndpointUrl,
  elasticsearchUrl,
  apiKeyEncoded,
  selectedCollectorMethod,
  onCollectorMethodChange,
}) => {
  const {
    services: { analytics },
  } = useKibana<ObservabilityOnboardingAppServices>();
  const secretValues = useMemo(
    () =>
      [
        isManagedOtlpServiceAvailable ? managedOtlpEndpointUrl : elasticsearchUrl,
        apiKeyEncoded,
      ].filter((secretValue): secretValue is string => Boolean(secretValue)),
    [apiKeyEncoded, elasticsearchUrl, isManagedOtlpServiceAvailable, managedOtlpEndpointUrl]
  );

  const reportCollectorMethodSelection = useCallback(
    (method: CollectorMethod) => {
      onCollectorMethodChange(method);
      analytics?.reportEvent(OBSERVABILITY_ONBOARDING_FLOW_PROGRESS_TELEMETRY_EVENT.eventType, {
        onboardingFlowType: 'kubernetes_otel',
        onboardingId,
        step: 'collector_method_selected',
        context: {
          kubernetes: { selectedCollectorMethod: method },
        },
      });
    },
    [analytics, onboardingId, onCollectorMethodChange]
  );

  const tabs = useMemo<Array<EuiTabbedContentTab & { id: CollectorTabId }>>(
    () => [
      {
        id: 'edot',
        name: i18n.translate(
          'xpack.observability_onboarding.kubernetes.collectorSetup.edotTabLabel',
          { defaultMessage: 'Elastic Distribution for OTel Collector' }
        ),
        'data-test-subj': 'observabilityOnboardingKubernetesCollectorTab-edot',
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
              secretValues={secretValues}
              showTitle
              useInlineCopyOnly
            />
          </>
        ),
      },
      {
        id: 'existing_collector',
        name: i18n.translate(
          'xpack.observability_onboarding.kubernetes.collectorSetup.existingCollectorTabLabel',
          { defaultMessage: 'Use existing collector' }
        ),
        'data-test-subj': 'observabilityOnboardingKubernetesCollectorTab-existing',
        content: isManagedOtlpServiceAvailable ? (
          <ManagedExistingCollectorContent
            onboardingId={onboardingId}
            managedOtlpEndpointUrl={managedOtlpEndpointUrl}
            apiKeyEncoded={apiKeyEncoded}
          />
        ) : (
          <NonManagedExistingCollectorContent />
        ),
      },
    ],
    [
      addRepoCommand,
      installStackCommand,
      valuesFileUrl,
      isManagedOtlpServiceAvailable,
      onboardingId,
      managedOtlpEndpointUrl,
      apiKeyEncoded,
      secretValues,
    ]
  );

  return (
    <div data-test-subj="observabilityOnboardingKubernetesCollectorTabs">
      <EuiTabbedContent
        tabs={tabs}
        selectedTab={tabs.find((tab) => tab.id === selectedCollectorMethod)}
        onTabClick={(tab) => reportCollectorMethodSelection(tab.id as CollectorMethod)}
      />
    </div>
  );
};
