/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { EuiCopy, EuiThemeProvider } from '@elastic/eui';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { MCP_SERVER_PATH } from '@kbn/agent-builder-plugin/public';
import { ConnectToProject } from './connect_to_project';
import type { OnboardingServices } from '../services';

const mockCopy = jest.fn();
jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  EuiCopy: jest.fn(({ children }) => children(mockCopy)),
}));

const KIBANA_URL = 'https://kibana.example.com';
const ELASTICSEARCH_URL = 'https://elasticsearch.example.com:443';

const services = {
  http: { basePath: { publicBaseUrl: KIBANA_URL, serverBasePath: '', get: () => '' } },
  notifications: { toasts: { addDanger: jest.fn() } },
  application: { navigateToApp: jest.fn() },
} as unknown as OnboardingServices;

const renderComponent = (props: Partial<React.ComponentProps<typeof ConnectToProject>> = {}) =>
  render(
    <EuiThemeProvider>
      <KibanaContextProvider services={services}>
        <ConnectToProject
          elasticsearchUrl={ELASTICSEARCH_URL}
          apiKey={null}
          isLoading={false}
          telemetryPage="testPage"
          {...props}
        />
      </KibanaContextProvider>
    </EuiThemeProvider>
  );

const getCurrentTextToCopy = () => jest.mocked(EuiCopy).mock.lastCall?.[0].textToCopy;

describe('ConnectToProject', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not render the connection type selector by default', () => {
    renderComponent();

    expect(screen.getByText(ELASTICSEARCH_URL)).toBeInTheDocument();
    expect(screen.queryByTestId('vectordbConnectionTypeButton')).not.toBeInTheDocument();
  });

  describe('with the connection type selector', () => {
    const renderWithSelector = () => renderComponent({ showConnectionTypeSelector: true });

    it('shows the Elasticsearch endpoint URL by default', () => {
      renderWithSelector();

      expect(screen.getByTestId('vectordbConnectionTypeButton')).toHaveTextContent('Elasticsearch');
      expect(screen.getByText(ELASTICSEARCH_URL)).toBeInTheDocument();
      expect(getCurrentTextToCopy()).toBe(ELASTICSEARCH_URL);
    });

    it('shows both connection type options in the popover', () => {
      renderWithSelector();

      fireEvent.click(screen.getByTestId('vectordbConnectionTypeButton'));

      expect(screen.getByTestId('vectordbConnectionTypeOption-elasticsearch')).toHaveTextContent(
        'Elasticsearch'
      );
      expect(screen.getByTestId('vectordbConnectionTypeOption-mcpServer')).toHaveTextContent(
        'Agent Builder MCP'
      );
    });

    it('shows and copies the Agent Builder MCP URL when Agent Builder MCP is selected', () => {
      renderWithSelector();

      fireEvent.click(screen.getByTestId('vectordbConnectionTypeButton'));
      fireEvent.click(screen.getByTestId('vectordbConnectionTypeOption-mcpServer'));

      const mcpServerUrl = `${KIBANA_URL}${MCP_SERVER_PATH}`;
      expect(screen.getByTestId('vectordbConnectionTypeButton')).toHaveTextContent(
        'Agent Builder MCP'
      );
      expect(screen.getByText(mcpServerUrl)).toBeInTheDocument();
      expect(screen.queryByText(ELASTICSEARCH_URL)).not.toBeInTheDocument();
      expect(getCurrentTextToCopy()).toBe(mcpServerUrl);
    });

    it('switches back to the Elasticsearch endpoint URL', () => {
      renderWithSelector();

      fireEvent.click(screen.getByTestId('vectordbConnectionTypeButton'));
      fireEvent.click(screen.getByTestId('vectordbConnectionTypeOption-mcpServer'));
      fireEvent.click(screen.getByTestId('vectordbConnectionTypeButton'));
      fireEvent.click(screen.getByTestId('vectordbConnectionTypeOption-elasticsearch'));

      expect(screen.getByText(ELASTICSEARCH_URL)).toBeInTheDocument();
      expect(getCurrentTextToCopy()).toBe(ELASTICSEARCH_URL);
    });

    it('keeps the API key control rendered', () => {
      renderWithSelector();

      expect(screen.getByTestId('vectordbPathSelectionGenerateApiKey')).toBeInTheDocument();
    });
  });
});
