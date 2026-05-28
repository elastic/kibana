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
import { ChatElasticsearchConnectionDetails } from './connection_details';
import { useElasticsearchUrl } from '../../hooks/use_elasticsearch_url';
import { useAgentBuilderMcpUrl } from '../../hooks/use_mcp_url';

jest.mock('../../hooks/use_elasticsearch_url');
jest.mock('../../hooks/use_mcp_url');
jest.mock('@kbn/search-api-keys-components', () => ({
  ApiKeyForm: () => <div data-test-subj="apiKeyForm" />,
}));

const mockUseElasticsearchUrl = useElasticsearchUrl as jest.Mock;
const mockUseAgentBuilderMcpUrl = useAgentBuilderMcpUrl as jest.Mock;

const MOCK_ES_URL = 'https://my-deployment.es.us-east-1.aws.elastic.cloud';
const MOCK_MCP_URL = 'https://my-kibana.kb.us-east-1.aws.elastic.cloud/api/agent_builder/mcp';

const renderComponent = () =>
  render(
    <I18nProvider>
      <EuiThemeProvider>
        <ChatElasticsearchConnectionDetails />
      </EuiThemeProvider>
    </I18nProvider>
  );

describe('ChatElasticsearchConnectionDetails', () => {
  beforeEach(() => {
    mockUseElasticsearchUrl.mockReturnValue(MOCK_ES_URL);
    mockUseAgentBuilderMcpUrl.mockReturnValue(MOCK_MCP_URL);
  });

  it('shows the Elasticsearch URL by default', () => {
    renderComponent();

    expect(screen.getByTestId('endpointValueField')).toHaveTextContent(MOCK_ES_URL);
    expect(screen.queryByTestId('mcpEndpointValueField')).not.toBeInTheDocument();
  });

  it('switches to the MCP URL when the MCP badge is clicked', () => {
    renderComponent();

    fireEvent.click(screen.getByTestId('viewMCPUrlBtn'));

    expect(screen.getByTestId('mcpEndpointValueField')).toHaveTextContent(MOCK_MCP_URL);
    expect(screen.queryByTestId('endpointValueField')).not.toBeInTheDocument();
  });

  it('switches back to the Elasticsearch URL when the Elasticsearch badge is clicked', () => {
    renderComponent();

    fireEvent.click(screen.getByTestId('viewMCPUrlBtn'));
    fireEvent.click(screen.getByTestId('viewElasticsearchUrlBtn'));

    expect(screen.getByTestId('endpointValueField')).toHaveTextContent(MOCK_ES_URL);
    expect(screen.queryByTestId('mcpEndpointValueField')).not.toBeInTheDocument();
  });

  describe('badge colors', () => {
    it('Elasticsearch badge is default color and MCP badge is hollow on initial render', () => {
      renderComponent();

      const esBadge = screen.getByTestId('viewElasticsearchUrlBtn');
      const mcpBadge = screen.getByTestId('viewMCPUrlBtn');

      // EuiBadge uses CSS-in-JS; check the className string for the variant name
      expect(esBadge.closest('.euiBadge')?.className).not.toContain('hollow');
      expect(mcpBadge.closest('.euiBadge')?.className).toContain('hollow');
    });

    it('MCP badge becomes default color and Elasticsearch badge becomes hollow after switching', () => {
      renderComponent();

      fireEvent.click(screen.getByTestId('viewMCPUrlBtn'));

      const esBadge = screen.getByTestId('viewElasticsearchUrlBtn');
      const mcpBadge = screen.getByTestId('viewMCPUrlBtn');

      expect(mcpBadge.closest('.euiBadge')?.className).not.toContain('hollow');
      expect(esBadge.closest('.euiBadge')?.className).toContain('hollow');
    });
  });

  it('always renders the ApiKeyForm regardless of URL view', () => {
    renderComponent();

    expect(screen.getByTestId('apiKeyForm')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('viewMCPUrlBtn'));

    expect(screen.getByTestId('apiKeyForm')).toBeInTheDocument();
  });
});
