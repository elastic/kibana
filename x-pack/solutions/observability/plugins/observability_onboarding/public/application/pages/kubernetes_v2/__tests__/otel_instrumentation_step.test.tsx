/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { renderWithHostPageProviders } from '../../host/__tests__/test_helpers';
import { OtelInstrumentationStep } from '../otel_instrumentation_step';

describe('OtelInstrumentationStep', () => {
  it('hides language and annotation snippets until instrumentation is enabled', () => {
    renderWithHostPageProviders(<OtelInstrumentationStep />);

    expect(
      screen.getByTestId('observabilityOnboardingKubernetesV2OtelInstrumentationSwitch')
    ).not.toBeChecked();
    expect(
      screen.queryByTestId('observabilityOnboardingKubernetesV2OtelInstrumentationLanguageSelector')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('observabilityOnboardingKubernetesV2OtelInstrumentationPodsSnippet')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('observabilityOnboardingKubernetesV2OtelInstrumentationNamespaceSnippet')
    ).not.toBeInTheDocument();
  });

  it('shows pod annotation by default when instrumentation is enabled', async () => {
    renderWithHostPageProviders(<OtelInstrumentationStep />);

    await userEvent.click(
      screen.getByTestId('observabilityOnboardingKubernetesV2OtelInstrumentationSwitch')
    );

    expect(screen.getByText('Annotate specific pods')).toBeInTheDocument();
    expect(screen.getByText('Annotate entire namespace')).toBeInTheDocument();
    expect(
      screen.getByTestId('observabilityOnboardingKubernetesV2OtelAnnotationMode-pods')
    ).toHaveAttribute('data-selected', 'true');
    expect(
      screen.getByTestId('observabilityOnboardingKubernetesV2OtelAnnotationMode-namespace')
    ).toHaveAttribute('data-selected', 'false');
    expect(
      screen.getByTestId('observabilityOnboardingKubernetesV2OtelInstrumentationLanguageSelector')
    ).toBeInTheDocument();
    expect(
      screen
        .getByTestId('observabilityOnboardingKubernetesV2OtelAnnotationMode-pods')
        .compareDocumentPosition(
          screen.getByTestId(
            'observabilityOnboardingKubernetesV2OtelInstrumentationLanguageSelector'
          )
        )
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(
      screen.getByTestId('observabilityOnboardingKubernetesV2OtelInstrumentationPodsSnippet')
    ).toHaveTextContent('instrumentation.opentelemetry.io/inject-nodejs');
    expect(
      screen.queryByTestId('observabilityOnboardingKubernetesV2OtelInstrumentationNamespaceSnippet')
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId('observabilityOnboardingKubernetesV2OtelInstrumentationRestartCommand')
    ).toHaveTextContent('kubectl rollout restart deployment myapp -n my-namespace');
    expect(
      screen.getByTestId('observabilityOnboardingKubernetesV2OtelInstrumentationDocsLink')
    ).toHaveAttribute(
      'href',
      'https://opentelemetry.io/docs/platforms/kubernetes/operator/automatic/'
    );
    expect(screen.getByText('Other languages documentation')).toBeInTheDocument();
  });

  it('shows only the namespace annotation manifest when namespace mode is selected', async () => {
    renderWithHostPageProviders(<OtelInstrumentationStep />);

    await userEvent.click(
      screen.getByTestId('observabilityOnboardingKubernetesV2OtelInstrumentationSwitch')
    );
    await userEvent.click(screen.getByRole('radio', { name: /Annotate entire namespace/ }));

    expect(
      screen.getByTestId('observabilityOnboardingKubernetesV2OtelAnnotationMode-pods')
    ).toHaveAttribute('data-selected', 'false');
    expect(
      screen.getByTestId('observabilityOnboardingKubernetesV2OtelAnnotationMode-namespace')
    ).toHaveAttribute('data-selected', 'true');
    expect(
      screen.queryByTestId('observabilityOnboardingKubernetesV2OtelInstrumentationPodsSnippet')
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId('observabilityOnboardingKubernetesV2OtelInstrumentationNamespaceSnippet')
    ).toHaveTextContent('apiVersion: v1');
    expect(
      screen.getByTestId('observabilityOnboardingKubernetesV2OtelInstrumentationNamespaceSnippet')
    ).toHaveTextContent('kind: Namespace');
    expect(
      screen.getByTestId('observabilityOnboardingKubernetesV2OtelInstrumentationNamespaceSnippet')
    ).not.toHaveTextContent('kubectl annotate namespace my-namespace');
    expect(
      screen.queryByTestId('observabilityOnboardingKubernetesV2OtelInstrumentationRestartCommand')
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId('observabilityOnboardingKubernetesV2OtelInstrumentationDocsLink')
    ).toBeInTheDocument();
  });
});
