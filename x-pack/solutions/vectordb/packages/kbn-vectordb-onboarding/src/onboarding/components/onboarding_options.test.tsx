/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { coreMock } from '@kbn/core/public/mocks';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/public/mocks';
import { OnboardingOptions } from './onboarding_options';
import { AGENT_PROMPT } from '../constants/agent_options';
import type { OnboardingServices } from '../../services';

const ELASTICSEARCH_URL = 'https://my-project.es.us-east-1.aws.elastic.cloud:443';

const agentBuilder = agentBuilderMocks.createStart();
const services: OnboardingServices = {
  ...coreMock.createStart(),
  share: sharePluginMock.createStartContract(),
  agentBuilder,
};

const renderComponent = () =>
  render(
    <EuiThemeProvider>
      <KibanaContextProvider services={services}>
        <OnboardingOptions elasticsearchUrl={ELASTICSEARCH_URL} />
      </KibanaContextProvider>
    </EuiThemeProvider>
  );

describe('OnboardingOptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens the prompt modal with the skills install prompt', () => {
    renderComponent();

    fireEvent.click(screen.getByTestId('vectordbOnboardingViewPrompt'));

    expect(screen.getByTestId('vectordbOnboardingPromptModal')).toBeInTheDocument();
    expect(screen.getByTestId('vectordbOnboardingPromptModalCode').textContent).toContain(
      AGENT_PROMPT
    );

    fireEvent.click(screen.getByTestId('vectordbOnboardingPromptModalCancel'));
    expect(screen.queryByTestId('vectordbOnboardingPromptModal')).not.toBeInTheDocument();
  });

  it('opens the CLI modal with the project endpoint in the connect command', () => {
    renderComponent();

    fireEvent.click(screen.getByTestId('vectordbOnboardingInstallCli'));

    expect(screen.getByTestId('cliInstallModalConnectCode')).toHaveTextContent(
      `--es-url ${ELASTICSEARCH_URL}`
    );
    expect(screen.getByTestId('cliInstallModalCloseBtn')).toHaveAttribute(
      'data-telemetry-id',
      'vectordbOnboarding-pathSelection-cliModal-close'
    );

    fireEvent.click(screen.getByTestId('cliInstallModalCloseBtn'));
    expect(screen.queryByTestId('cliInstallModal')).not.toBeInTheDocument();
  });

  it('opens the Elastic AI Agent with the onboarding skill loaded', () => {
    renderComponent();

    fireEvent.click(screen.getByTestId('vectordbOnboardingOpenElasticAgent'));

    expect(agentBuilder.openChat).toHaveBeenCalledWith({
      initialMessage: '/elasticsearch-onboarding',
      autoSendInitialMessage: true,
      newConversation: true,
      sessionTag: 'vectordb-getting-started',
    });
  });
});
