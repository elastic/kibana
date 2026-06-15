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
      screen.getByTestId('observabilityOnboardingKubernetesOtelInstrumentationSwitch')
    ).not.toBeChecked();
    expect(
      screen.queryByTestId('observabilityOnboardingKubernetesOtelInstrumentationLanguageSelector')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('observabilityOnboardingKubernetesOtelInstrumentationPodsSnippet')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('observabilityOnboardingKubernetesOtelInstrumentationNamespaceSnippet')
    ).not.toBeInTheDocument();
  });

  it('shows pod annotation by default when instrumentation is enabled', async () => {
    renderWithHostPageProviders(<OtelInstrumentationStep />);

    await userEvent.click(
      screen.getByTestId('observabilityOnboardingKubernetesOtelInstrumentationSwitch')
    );

    expect(screen.getByText('Annotate specific pods')).toBeInTheDocument();
    expect(screen.getByText('Annotate entire namespace')).toBeInTheDocument();
    expect(
      screen.getByTestId('observabilityOnboardingKubernetesOtelAnnotationMode-pods')
    ).toHaveAttribute('data-selected', 'true');
    expect(
      screen.getByTestId('observabilityOnboardingKubernetesOtelAnnotationMode-namespace')
    ).toHaveAttribute('data-selected', 'false');
    expect(
      screen.getByTestId('observabilityOnboardingKubernetesOtelInstrumentationLanguageSelector')
    ).toBeInTheDocument();
    expect(
      screen
        .getByTestId('observabilityOnboardingKubernetesOtelAnnotationMode-pods')
        .compareDocumentPosition(
          screen.getByTestId('observabilityOnboardingKubernetesOtelInstrumentationLanguageSelector')
        )
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(
      screen.getByTestId('observabilityOnboardingKubernetesOtelInstrumentationPodsSnippet')
    ).toHaveTextContent('instrumentation.opentelemetry.io/inject-nodejs');
    expect(
      screen.queryByTestId('observabilityOnboardingKubernetesOtelInstrumentationNamespaceSnippet')
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId('observabilityOnboardingKubernetesOtelInstrumentationRestartCommand')
    ).toHaveTextContent('kubectl rollout restart deployment myapp -n my-namespace');
    expect(
      screen.getByTestId('observabilityOnboardingKubernetesOtelInstrumentationDocsLink')
    ).toHaveAttribute(
      'href',
      'https://opentelemetry.io/docs/platforms/kubernetes/operator/automatic/'
    );
    expect(screen.getByText('Other languages documentation')).toBeInTheDocument();
  });

  it('shows only the namespace annotation manifest when namespace mode is selected', async () => {
    renderWithHostPageProviders(<OtelInstrumentationStep />);

    await userEvent.click(
      screen.getByTestId('observabilityOnboardingKubernetesOtelInstrumentationSwitch')
    );
    await userEvent.click(screen.getByRole('radio', { name: /Annotate entire namespace/ }));

    expect(
      screen.getByTestId('observabilityOnboardingKubernetesOtelAnnotationMode-pods')
    ).toHaveAttribute('data-selected', 'false');
    expect(
      screen.getByTestId('observabilityOnboardingKubernetesOtelAnnotationMode-namespace')
    ).toHaveAttribute('data-selected', 'true');
    expect(
      screen.queryByTestId('observabilityOnboardingKubernetesOtelInstrumentationPodsSnippet')
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId('observabilityOnboardingKubernetesOtelInstrumentationNamespaceSnippet')
    ).toHaveTextContent('apiVersion: v1');
    expect(
      screen.getByTestId('observabilityOnboardingKubernetesOtelInstrumentationNamespaceSnippet')
    ).toHaveTextContent('kind: Namespace');
    expect(
      screen.getByTestId('observabilityOnboardingKubernetesOtelInstrumentationNamespaceSnippet')
    ).not.toHaveTextContent('kubectl annotate namespace my-namespace');
    expect(
      screen.queryByTestId('observabilityOnboardingKubernetesOtelInstrumentationRestartCommand')
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId('observabilityOnboardingKubernetesOtelInstrumentationDocsLink')
    ).toBeInTheDocument();
  });
});
