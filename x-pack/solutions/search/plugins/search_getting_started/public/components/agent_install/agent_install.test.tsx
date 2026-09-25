/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { EuiThemeProvider } from '@elastic/eui';
import { AgentInstallSection } from './agent_install';
import { useKibana } from '../../hooks/use_kibana';
import { useUsageTracker } from '../../contexts/usage_tracker_context';
import { useElasticsearchUrl } from '../../hooks/use_elasticsearch_url';

jest.mock('../../hooks/use_kibana');
jest.mock('../../contexts/usage_tracker_context');
jest.mock('../../hooks/use_elasticsearch_url');

const mockUseKibana = useKibana as jest.Mock;
const mockUseUsageTracker = useUsageTracker as jest.Mock;
const mockUseElasticsearchUrl = useElasticsearchUrl as jest.Mock;

const renderComponent = () =>
  render(
    <I18nProvider>
      <EuiThemeProvider>
        <AgentInstallSection />
      </EuiThemeProvider>
    </I18nProvider>
  );

describe('AgentInstallSection', () => {
  beforeEach(() => {
    mockUseKibana.mockReturnValue({
      services: { agentBuilder: undefined },
    });
    mockUseUsageTracker.mockReturnValue({ click: jest.fn(), count: jest.fn(), load: jest.fn() });
    mockUseElasticsearchUrl.mockReturnValue(
      'https://my-deployment.es.us-east-1.aws.elastic.cloud:443'
    );
  });

  it('does not render the CLI install modal on initial mount', () => {
    renderComponent();

    expect(screen.queryByTestId('cliInstallModalInstallCode')).not.toBeInTheDocument();
  });

  it('opens the CLI install modal when Install the CLI is clicked', () => {
    renderComponent();

    fireEvent.click(screen.getByTestId('agentInstallInstallCli'));

    expect(screen.getByTestId('cliInstallModalInstallCode')).toBeInTheDocument();
  });

  it('closes the CLI install modal when the Close button is clicked', () => {
    renderComponent();

    fireEvent.click(screen.getByTestId('agentInstallInstallCli'));
    expect(screen.getByTestId('cliInstallModalInstallCode')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('cliInstallModalCloseBtn'));
    expect(screen.queryByTestId('cliInstallModalInstallCode')).not.toBeInTheDocument();
  });
});
