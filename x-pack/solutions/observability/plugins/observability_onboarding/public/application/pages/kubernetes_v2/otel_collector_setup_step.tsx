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

const EXISTING_COLLECTOR_YAML = `exporters:
  otlp/elastic:
    endpoint: "\${ELASTIC_OTLP_ENDPOINT}"
    headers:
      Authorization: "ApiKey \${ELASTIC_API_KEY}"

service:
  pipelines:
    logs:
      exporters: [otlp/elastic]
    metrics:
      exporters: [otlp/elastic]
    traces:
      exporters: [otlp/elastic]`;

export interface OtelCollectorSetupStepProps {
  addRepoCommand: string;
  installStackCommand?: string;
  valuesFileUrl?: string;
  ingestionMode: IngestionMode;
  onIngestionModeChange: (mode: IngestionMode) => void;
  streamsDocLink?: string;
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
        content: (
          <>
            <EuiSpacer size="l" />
            <EuiTitle size="xs">
              <h3>
                {i18n.translate(
                  'xpack.observability_onboarding.kubernetesV2.collectorSetup.existingCollectorTitle',
                  { defaultMessage: 'Add an OTLP exporter' }
                )}
              </h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiText size="s">
              <p>
                <FormattedMessage
                  id="xpack.observability_onboarding.kubernetesV2.collectorSetup.existingCollectorDescription"
                  defaultMessage="Add the following exporter to your collector config. Ensure your receivers include {k8sCluster}, {kubeletstats}, and {prometheus} for full infrastructure coverage."
                  values={{
                    k8sCluster: <EuiCode>k8s_cluster</EuiCode>,
                    kubeletstats: <EuiCode>kubeletstats</EuiCode>,
                    prometheus: <EuiCode>prometheus</EuiCode>,
                  }}
                />
              </p>
            </EuiText>
            <EuiSpacer />
            <EuiCodeBlock paddingSize="m" language="yaml" isCopyable>
              {EXISTING_COLLECTOR_YAML}
            </EuiCodeBlock>
          </>
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
      wiredStreamsStatus,
    ]
  );

  return (
    <div data-test-subj="observabilityOnboardingKubernetesV2CollectorTabs">
      <EuiTabbedContent tabs={tabs} initialSelectedTab={tabs[0]} />
    </div>
  );
};
