/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { EuiProvider } from '@elastic/eui';
import { WorkplaceAIHomeHeader } from './workplace_ai_home_header';
import { useCurrentUser } from '../hooks/use_current_user';
import { useElasticsearchUrl } from '../hooks/use_elasticsearch_url';
import { useMcpServerUrl } from '../hooks/use_mcp_server_url';
import { openWiredConnectionDetails } from '@kbn/cloud/connection_details';

jest.mock('../hooks/use_current_user');
jest.mock('../hooks/use_elasticsearch_url');
jest.mock('../hooks/use_mcp_server_url');
jest.mock('@kbn/cloud/connection_details', () => ({
  openWiredConnectionDetails: jest.fn(),
}));
jest.mock('@kbn/workplaceai-api-keys-components', () => ({
  ApiKeyForm: () => <div data-test-subj="apiKeyForm">API Key Form</div>,
}));

const mockUseCurrentUser = useCurrentUser as jest.Mock;
const mockUseElasticsearchUrl = useElasticsearchUrl as jest.MockedFunction<
  typeof useElasticsearchUrl
>;
const mockUseMcpServerUrl = useMcpServerUrl as jest.MockedFunction<typeof useMcpServerUrl>;
const mockOpenWiredConnectionDetails = openWiredConnectionDetails as jest.MockedFunction<
  typeof openWiredConnectionDetails
>;

describe('WorkplaceAIHomeHeader', () => {
  const renderWithIntl = (component: React.ReactElement) => {
    return render(
      <EuiProvider>
        <IntlProvider locale="en">{component}</IntlProvider>
      </EuiProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock document.execCommand for EuiCopy
    document.execCommand = jest.fn();

    mockUseElasticsearchUrl.mockReturnValue('https://test-elasticsearch.elastic.co');
    mockUseMcpServerUrl.mockReturnValue({
      mcpServerUrl: 'https://test-kibana.elastic.co/api/agent_builder/mcp',
    });
    mockUseCurrentUser.mockReturnValue({
      full_name: 'John Doe',
      username: 'johndoe',
      roles: [],
      enabled: true,
      authentication_realm: { name: 'test', type: 'native' },
      lookup_realm: { name: 'test', type: 'native' },
      authentication_provider: { name: 'basic', type: 'basic' },
      authentication_type: 'realm',
      elastic_cloud_user: false,
      metadata: {},
    });

    renderWithIntl(<WorkplaceAIHomeHeader />);
  });

  describe('User Greeting', () => {
    it('renders welcome message', () => {
      expect(screen.getByText(/Welcome, John Doe/i)).toBeInTheDocument();
      const heroImage = screen.getByAltText('Workplace AI Hero');
      expect(heroImage).toBeInTheDocument();
      expect(
        screen.getByText(
          /Connect data, create agents, and automate workflows powered by your enterprise knowledge/i
        )
      ).toBeInTheDocument();
    });
  });

  describe('Elasticsearch URL Field', () => {
    it('renders Elasticsearch URL field with correct value', () => {
      const urlField = screen.getByTestId('elasticsearchUrlField');
      expect(urlField).toBeInTheDocument();
      expect(urlField).toHaveTextContent('https://test-elasticsearch.elastic.co');
    });

    it('renders copy button for Elasticsearch URL', () => {
      const copyButton = screen.getByTestId('copyElasticsearchUrlButton');
      expect(copyButton).toBeInTheDocument();
      expect(copyButton).toHaveAttribute('aria-label', 'Copy to clipboard');
    });
  });

  describe('API Key Form', () => {
    it('renders API Key form component', () => {
      expect(screen.getByTestId('apiKeyForm')).toBeInTheDocument();
    });
  });

  describe('MCP Endpoint Button', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('renders MCP Endpoint button', () => {
      expect(screen.getByText('MCP Endpoint')).toBeInTheDocument();
    });

    it('copies MCP Server URL to clipboard when clicked', () => {
      const mcpButton = screen.getByText('MCP Endpoint');

      (document.execCommand as jest.Mock).mockImplementationOnce(() => true);

      fireEvent.click(mcpButton);

      expect(document.execCommand).toHaveBeenCalledWith('copy');
    });
  });

  describe('Connection Settings Button', () => {
    it('renders Connection settings button', () => {
      const connectionButton = screen.getByText('Connection settings');
      expect(connectionButton).toBeInTheDocument();
    });

    it('opens connection details flyout when clicked', () => {
      const connectionButton = screen.getByText('Connection settings');
      fireEvent.click(connectionButton);

      expect(mockOpenWiredConnectionDetails).toHaveBeenCalledTimes(1);
    });
  });
});
