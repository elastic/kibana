/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen } from '@testing-library/react';
import React from 'react';
import { renderWithHostPageProviders } from '../../../pages/host/__tests__/test_helpers';
import { OtelKubernetesInstallStep } from './install_step';

const wiredStreamsStatus = {
  isEnabled: false,
  isLoading: false,
  isEnabling: false,
  enableWiredStreams: jest.fn(),
};

describe('OtelKubernetesInstallStep', () => {
  it('renders the V2 heading and inline copy affordance when requested', () => {
    renderWithHostPageProviders(
      <OtelKubernetesInstallStep
        installStackCommand="helm upgrade --install opentelemetry-kube-stack"
        valuesFileUrl="https://example.com/values.yaml"
        ingestionMode="classic"
        onIngestionModeChange={jest.fn()}
        wiredStreamsStatus={wiredStreamsStatus}
        showTitle
        useInlineCopyOnly
      />
    );

    expect(
      screen.getByRole('heading', { name: 'Install the Elastic Distribution for OTel Collector' })
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('observabilityOnboardingOtelKubernetesPanelInstallStackCopyToClipboard')
    ).not.toBeInTheDocument();
  });
});
