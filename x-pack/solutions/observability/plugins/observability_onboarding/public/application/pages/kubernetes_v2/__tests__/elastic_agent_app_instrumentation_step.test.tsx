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
import { ElasticAgentAppInstrumentationStep } from '../elastic_agent_app_instrumentation_step';

const CARD_PREFIX = 'observabilityOnboardingKubernetesV2ElasticAgentAppInstrumentation';

const ELASTIC_APM_AGENT_DOCS_BY_LANGUAGE = {
  nodejs: 'https://www.elastic.co/docs/reference/apm/agents/nodejs',
  java: 'https://www.elastic.co/docs/reference/apm/agents/java',
  python: 'https://www.elastic.co/docs/reference/apm/agents/python',
  dotnet: 'https://www.elastic.co/docs/reference/apm/agents/dotnet',
  go: 'https://www.elastic.co/docs/reference/apm/agents/go',
  ruby: 'https://www.elastic.co/docs/reference/apm/agents/ruby',
  php: 'https://www.elastic.co/docs/reference/apm/agents/php',
} as const;

describe('ElasticAgentAppInstrumentationStep', () => {
  it('selects "No, infrastructure only" by default', () => {
    renderWithHostPageProviders(<ElasticAgentAppInstrumentationStep />);

    expect(screen.getByTestId(`${CARD_PREFIX}-no`)).toHaveAttribute('data-selected', 'true');
    expect(screen.getByTestId(`${CARD_PREFIX}-yes`)).toHaveAttribute('data-selected', 'false');
    expect(
      screen.queryByTestId(
        'observabilityOnboardingKubernetesV2ElasticAgentAppInstrumentationApmServerUrlInput'
      )
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId(
        'observabilityOnboardingKubernetesV2ElasticAgentAppInstrumentationLanguageSelector'
      )
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId(
        'observabilityOnboardingKubernetesV2ElasticAgentAppInstrumentationDocsLink'
      )
    ).not.toBeInTheDocument();
  });

  it('reveals the APM Server URL input when Yes is selected', async () => {
    renderWithHostPageProviders(<ElasticAgentAppInstrumentationStep />);

    await userEvent.click(screen.getByRole('radio', { name: 'Yes' }));

    const apmServerUrlInput = screen.getByTestId(
      'observabilityOnboardingKubernetesV2ElasticAgentAppInstrumentationApmServerUrlInput'
    );
    expect(apmServerUrlInput).toBeInTheDocument();
    await userEvent.type(apmServerUrlInput, 'https://apm.example.com');
    expect(apmServerUrlInput).toHaveValue('https://apm.example.com');
  });

  it('reveals the language selector when Yes is selected', async () => {
    renderWithHostPageProviders(<ElasticAgentAppInstrumentationStep />);

    await userEvent.click(screen.getByRole('radio', { name: 'Yes' }));

    expect(
      screen.getByTestId(
        'observabilityOnboardingKubernetesV2ElasticAgentAppInstrumentationLanguageSelector'
      )
    ).toBeInTheDocument();
  });

  it('updates the documentation link when the selected language changes', async () => {
    renderWithHostPageProviders(<ElasticAgentAppInstrumentationStep />);

    await userEvent.click(screen.getByRole('radio', { name: 'Yes' }));

    const docsLink = screen.getByTestId(
      'observabilityOnboardingKubernetesV2ElasticAgentAppInstrumentationDocsLink'
    );
    expect(docsLink).toHaveAttribute('href', ELASTIC_APM_AGENT_DOCS_BY_LANGUAGE.nodejs);

    await userEvent.click(screen.getByRole('button', { name: 'Java' }));
    expect(docsLink).toHaveAttribute('href', ELASTIC_APM_AGENT_DOCS_BY_LANGUAGE.java);

    await userEvent.click(screen.getByRole('button', { name: 'Python' }));
    expect(docsLink).toHaveAttribute('href', ELASTIC_APM_AGENT_DOCS_BY_LANGUAGE.python);
  });

  it('links to Elastic APM agent documentation, not OpenTelemetry documentation', async () => {
    renderWithHostPageProviders(<ElasticAgentAppInstrumentationStep />);

    await userEvent.click(screen.getByRole('radio', { name: 'Yes' }));

    const docsLink = screen.getByTestId(
      'observabilityOnboardingKubernetesV2ElasticAgentAppInstrumentationDocsLink'
    );
    expect(docsLink.getAttribute('href')).toMatch(/\/docs\/reference\/apm\/agents\//);
    expect(docsLink.getAttribute('href')).not.toMatch(/opentelemetry/i);
  });
});
