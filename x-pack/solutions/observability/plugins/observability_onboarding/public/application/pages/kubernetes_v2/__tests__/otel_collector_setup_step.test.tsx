/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { OBSERVABILITY_ONBOARDING_FLOW_PROGRESS_TELEMETRY_EVENT } from '../../../../../common/telemetry_events';
import {
  buildHostPageServices,
  renderWithHostPageProviders,
} from '../../host/__tests__/test_helpers';
import { OtelCollectorSetupStep } from '../otel_collector_setup_step';

jest.mock('../../../quickstart_flows/otel_kubernetes/steps', () => ({
  OtelKubernetesAddRepositoryStep: ({
    addRepoCommand,
    showTitle,
    useInlineCopyOnly,
  }: {
    addRepoCommand: string;
    showTitle?: boolean;
    useInlineCopyOnly?: boolean;
  }) => (
    <div
      data-test-subj="otelK8sAddRepoStep"
      data-add-repo-command={addRepoCommand}
      data-show-title={showTitle}
      data-use-inline-copy-only={useInlineCopyOnly}
    />
  ),
  OtelKubernetesInstallStep: ({
    installStackCommand,
    secretValues,
    showTitle,
    useInlineCopyOnly,
  }: {
    installStackCommand?: string;
    secretValues?: string[];
    showTitle?: boolean;
    useInlineCopyOnly?: boolean;
  }) => (
    <div
      data-test-subj="otelK8sInstallStep"
      data-install-stack-command={installStackCommand}
      data-secret-values={secretValues?.join('|')}
      data-show-title={showTitle}
      data-use-inline-copy-only={useInlineCopyOnly}
    />
  ),
}));

jest.mock('../../../quickstart_flows/shared/masked_code_block', () => ({
  MaskedCodeBlock: ({
    value,
    secrets,
    dataTestSubj,
  }: {
    value: string;
    secrets: string[];
    dataTestSubj: string;
  }) => (
    <div data-test-subj={dataTestSubj} data-value={value} data-secrets={secrets.join('|')}>
      {value}
    </div>
  ),
}));

const defaultProps = {
  addRepoCommand: 'helm repo add elastic https://helm.elastic.co',
  installStackCommand: 'helm install edot-collector',
  valuesFileUrl: 'https://example.com/values.yaml',
  isManagedOtlpServiceAvailable: true,
  onboardingId: 'test-onboarding-id',
  managedOtlpEndpointUrl: 'https://otlp.example',
  elasticsearchUrl: 'https://elasticsearch.example',
  apiKeyEncoded: 'encoded-api-key',
  selectedCollectorMethod: 'edot' as const,
  onCollectorMethodChange: jest.fn(),
};

describe('OtelCollectorSetupStep', () => {
  it('renders collector setup tabs with EDOT selected by default', () => {
    renderWithHostPageProviders(<OtelCollectorSetupStep {...defaultProps} />);

    expect(
      screen.getByTestId('observabilityOnboardingKubernetesCollectorTabs')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('observabilityOnboardingKubernetesCollectorTab-edot')
    ).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('otelK8sAddRepoStep')).toHaveAttribute(
      'data-add-repo-command',
      defaultProps.addRepoCommand
    );
    expect(screen.getByTestId('otelK8sAddRepoStep')).toHaveAttribute('data-show-title', 'true');
    expect(screen.getByTestId('otelK8sAddRepoStep')).toHaveAttribute(
      'data-use-inline-copy-only',
      'true'
    );
    expect(screen.getByTestId('otelK8sInstallStep')).toHaveAttribute('data-show-title', 'true');
    expect(screen.getByTestId('otelK8sInstallStep')).toHaveAttribute(
      'data-use-inline-copy-only',
      'true'
    );
    expect(screen.getByTestId('otelK8sInstallStep')).toHaveAttribute(
      'data-secret-values',
      'https://otlp.example|encoded-api-key'
    );
  });

  it('reports collector method telemetry when a collector tab is selected', async () => {
    const services = buildHostPageServices();
    const reportEvent = jest.fn();
    services.analytics.reportEvent = reportEvent;

    renderWithHostPageProviders(<OtelCollectorSetupStep {...defaultProps} />, { services });

    await userEvent.click(
      screen.getByTestId('observabilityOnboardingKubernetesCollectorTab-existing')
    );

    expect(defaultProps.onCollectorMethodChange).toHaveBeenCalledWith('existing_collector');
    expect(reportEvent).toHaveBeenCalledWith(
      OBSERVABILITY_ONBOARDING_FLOW_PROGRESS_TELEMETRY_EVENT.eventType,
      {
        onboardingFlowType: 'kubernetes_otel',
        onboardingId: defaultProps.onboardingId,
        step: 'collector_method_selected',
        context: {
          kubernetes: { selectedCollectorMethod: 'existing_collector' },
        },
      }
    );
  });

  it('shows managed OTLP guidance and a copyable snippet when managed OTLP is available', async () => {
    renderWithHostPageProviders(
      <OtelCollectorSetupStep {...defaultProps} selectedCollectorMethod="existing_collector" />
    );

    expect(screen.queryByTestId('otelK8sAddRepoStep')).not.toBeInTheDocument();
    expect(screen.queryByTestId('otelK8sInstallStep')).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Add a managed OTLP exporter' })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Merge this configuration fragment into a collector config that already gathers the Kubernetes logs, metrics, and traces/
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Keep your current receivers and add this processor and exporter to the logs, metrics, and traces pipelines/
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Create or adapt a Secret in the namespace where your collector runs/)
    ).toBeInTheDocument();
    expect(screen.getAllByText(/resource\/onboarding_id/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/onboarding\.id/).length).toBeGreaterThan(0);
    expect(screen.getByText(/k8s_cluster/)).toBeInTheDocument();
    expect(screen.getByText(/kubeletstats/)).toBeInTheDocument();
    expect(screen.getByText(/hostmetrics/)).toBeInTheDocument();
    expect(screen.getByText(/file_log/)).toBeInTheDocument();

    const managedSnippet = screen.getByTestId(
      'observabilityOnboardingKubernetesExistingCollectorManagedSnippet'
    );
    expect(managedSnippet).toHaveTextContent(/test-onboarding-id/);
    expect(managedSnippet).toHaveTextContent(/action: upsert/);
    expect(managedSnippet).toHaveTextContent(/endpoint: "\$\{ELASTIC_OTLP_ENDPOINT\}"/);
    expect(managedSnippet).toHaveTextContent(/Authorization: "ApiKey \$\{ELASTIC_API_KEY\}"/);
    expect(managedSnippet).toHaveTextContent(/sending_queue/);
    expect(managedSnippet).toHaveTextContent(/queue_size: 50_000_000/);
    expect(managedSnippet).toHaveTextContent(/block_on_overflow: true/);

    const secretSnippet = screen.getByTestId(
      'observabilityOnboardingKubernetesExistingCollectorSecretSnippet'
    );
    expect(secretSnippet).toHaveAttribute(
      'data-value',
      expect.stringContaining("--from-literal=ELASTIC_OTLP_ENDPOINT='https://otlp.example'")
    );
    expect(secretSnippet).toHaveAttribute(
      'data-value',
      expect.stringContaining("--from-literal=ELASTIC_API_KEY='encoded-api-key'")
    );
    expect(secretSnippet).toHaveAttribute('data-secrets', 'https://otlp.example|encoded-api-key');

    expect(
      screen.queryByRole('heading', { name: 'Use a gateway collector configuration' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Managed OTLP is not available for this deployment/)
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('observabilityOnboardingKubernetesExistingCollectorKubeStackDocsLink')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('observabilityOnboardingKubernetesExistingCollectorOtlpEndpointDocsLink')
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/prometheus/i)).not.toBeInTheDocument();
  });

  it.each([undefined, ''])(
    'shows a preparing message without the managed OTLP snippet when onboardingId is %p',
    async (onboardingId) => {
      renderWithHostPageProviders(
        <OtelCollectorSetupStep
          {...defaultProps}
          onboardingId={onboardingId}
          managedOtlpEndpointUrl={undefined}
          apiKeyEncoded={undefined}
          selectedCollectorMethod="existing_collector"
        />
      );

      expect(
        screen.getByRole('heading', { name: 'Add a managed OTLP exporter' })
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /Merge this configuration fragment into a collector config that already gathers the Kubernetes logs, metrics, and traces/
        )
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Create or adapt a Secret in the namespace where your collector runs/)
      ).toBeInTheDocument();
      expect(screen.getByText(/k8s_cluster/)).toBeInTheDocument();
      expect(screen.getByText(/kubeletstats/)).toBeInTheDocument();
      expect(screen.getByText(/hostmetrics/)).toBeInTheDocument();
      expect(screen.getByText(/file_log/)).toBeInTheDocument();
      expect(
        screen.getByText(
          /Preparing your collector configuration\. The snippet will appear when the onboarding flow is ready\./
        )
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId('observabilityOnboardingKubernetesExistingCollectorManagedSnippet')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('observabilityOnboardingKubernetesExistingCollectorSecretSnippet')
      ).not.toBeInTheDocument();
      expect(screen.queryByText(/value: ""/)).not.toBeInTheDocument();
      expect(screen.queryByText(/test-onboarding-id/)).not.toBeInTheDocument();
    }
  );

  it('shows non-managed guidance without the managed OTLP snippet when managed OTLP is unavailable', async () => {
    renderWithHostPageProviders(
      <OtelCollectorSetupStep
        {...defaultProps}
        isManagedOtlpServiceAvailable={false}
        selectedCollectorMethod="existing_collector"
      />
    );

    expect(
      screen.getByRole('heading', { name: 'Use a gateway collector configuration' })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Managed OTLP is not available for this deployment/)
    ).toBeInTheDocument();
    expect(screen.getByText(/onboarding\.id/)).toBeInTheDocument();
    expect(
      screen.getByTestId('observabilityOnboardingKubernetesExistingCollectorKubeStackDocsLink')
    ).toHaveAttribute(
      'href',
      'https://www.elastic.co/docs/reference/edot-collector/config/default-config-k8s'
    );
    expect(
      screen.getByTestId('observabilityOnboardingKubernetesExistingCollectorOtlpEndpointDocsLink')
    ).toHaveAttribute('href', 'https://www.elastic.co/docs/manage-data/ingest/otlp-endpoint');

    expect(
      screen.queryByRole('heading', { name: 'Add a managed OTLP exporter' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/already gathers the Kubernetes logs, metrics, and traces/)
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/test-onboarding-id/)).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('observabilityOnboardingKubernetesExistingCollectorManagedSnippet')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('observabilityOnboardingKubernetesExistingCollectorSecretSnippet')
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/endpoint: "\$\{ELASTIC_OTLP_ENDPOINT\}"/)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Authorization: "ApiKey \$\{ELASTIC_API_KEY\}"/)
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/sending_queue/)).not.toBeInTheDocument();
    expect(screen.queryByText(/prometheus/i)).not.toBeInTheDocument();
  });
});
