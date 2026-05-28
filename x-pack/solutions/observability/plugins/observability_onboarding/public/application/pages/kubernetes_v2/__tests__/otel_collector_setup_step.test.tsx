/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import type { IngestionMode } from '../../../quickstart_flows/shared/wired_streams_ingestion_selector';
import { renderWithHostPageProviders } from '../../host/__tests__/test_helpers';
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
    ingestionMode,
    showTitle,
    useInlineCopyOnly,
  }: {
    installStackCommand?: string;
    ingestionMode: IngestionMode;
    showTitle?: boolean;
    useInlineCopyOnly?: boolean;
  }) => (
    <div
      data-test-subj="otelK8sInstallStep"
      data-install-stack-command={installStackCommand}
      data-ingestion-mode={ingestionMode}
      data-show-title={showTitle}
      data-use-inline-copy-only={useInlineCopyOnly}
    />
  ),
}));

const defaultProps = {
  addRepoCommand: 'helm repo add elastic https://helm.elastic.co',
  installStackCommand: 'helm install edot-collector',
  valuesFileUrl: 'https://example.com/values.yaml',
  ingestionMode: 'classic' as const,
  onIngestionModeChange: jest.fn(),
  streamsDocLink: 'https://example.com/streams',
  wiredStreamsStatus: {
    isEnabled: false,
    isLoading: false,
    isEnabling: false,
    enableWiredStreams: jest.fn(),
  },
};

describe('OtelCollectorSetupStep', () => {
  it('renders collector setup tabs with EDOT selected by default', () => {
    renderWithHostPageProviders(<OtelCollectorSetupStep {...defaultProps} />);

    expect(
      screen.getByTestId('observabilityOnboardingKubernetesV2CollectorTabs')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('observabilityOnboardingKubernetesV2CollectorTab-edot')
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
  });

  it('shows the existing collector guidance and inline copy block when that tab is selected', async () => {
    renderWithHostPageProviders(<OtelCollectorSetupStep {...defaultProps} />);

    await userEvent.click(
      screen.getByTestId('observabilityOnboardingKubernetesV2CollectorTab-existing')
    );

    expect(screen.queryByTestId('otelK8sAddRepoStep')).not.toBeInTheDocument();
    expect(screen.queryByTestId('otelK8sInstallStep')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Add an OTLP exporter' })).toBeInTheDocument();
    expect(screen.getByText(/Add the following exporter/)).toBeInTheDocument();
    expect(screen.getByText(/endpoint: "\$\{ELASTIC_OTLP_ENDPOINT\}"/)).toBeInTheDocument();
    expect(screen.getByText(/Authorization: "ApiKey \$\{ELASTIC_API_KEY\}"/)).toBeInTheDocument();
    expect(screen.getByText(/otlp\/elastic/)).toBeInTheDocument();
    expect(
      screen.queryByTestId('observabilityOnboardingKubernetesV2ExistingCollectorCopyToClipboard')
    ).not.toBeInTheDocument();
  });
});
