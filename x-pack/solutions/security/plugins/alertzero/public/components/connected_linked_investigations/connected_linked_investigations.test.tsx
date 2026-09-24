/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { coreMock } from '@kbn/core/public/mocks';
import { useLinkedInvestigations } from '@kbn/agentic-investigations-plugin/public';
import { ConnectedLinkedInvestigations } from './connected_linked_investigations';

jest.mock('@kbn/agentic-investigations-plugin/public', () => ({
  ...jest.requireActual('@kbn/agentic-investigations-plugin/public'),
  useLinkedInvestigations: jest.fn(),
}));

const mockUseLinkedInvestigations = useLinkedInvestigations as jest.Mock;

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <KibanaContextProvider services={coreMock.createStart()}>
    <QueryClientProvider client={queryClient}>
      <EuiProvider>
        <I18nProvider>{children}</I18nProvider>
      </EuiProvider>
    </QueryClientProvider>
  </KibanaContextProvider>
);

const defaultProps = {
  escalationId: 'escalation-1',
  linkedInvestigationIds: ['inv-1', 'inv-2'],
  onOpenInvestigation: jest.fn(),
};

describe('ConnectedLinkedInvestigations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes the loading state to the list', () => {
    mockUseLinkedInvestigations.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });

    render(<ConnectedLinkedInvestigations {...defaultProps} />, { wrapper });

    expect(screen.getByTestId('linkedInvestigationsLoading')).toBeInTheDocument();
  });

  it('passes the error state to the list', () => {
    mockUseLinkedInvestigations.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });

    render(<ConnectedLinkedInvestigations {...defaultProps} />, { wrapper });

    expect(screen.getByTestId('linkedInvestigationsError')).toBeInTheDocument();
  });

  it('renders investigation titles when data is available', () => {
    mockUseLinkedInvestigations.mockReturnValue({
      data: [
        { id: 'inv-1', title: 'Mass file encryption', status: 'open', agent_id: 'agent-1' },
        { id: 'inv-2', title: 'Privilege escalation', status: 'closed', agent_id: 'agent-2' },
      ],
      isLoading: false,
      isError: false,
    });

    render(<ConnectedLinkedInvestigations {...defaultProps} />, { wrapper });

    expect(screen.getByText('Mass file encryption')).toBeInTheDocument();
    expect(screen.getByText('Privilege escalation')).toBeInTheDocument();
  });

  it('calls onOpenInvestigation with the correct conversationId and agentId when a row is clicked', () => {
    const onOpenInvestigation = jest.fn();
    mockUseLinkedInvestigations.mockReturnValue({
      data: [{ id: 'inv-1', title: 'Mass file encryption', status: 'open', agent_id: 'agent-1' }],
      isLoading: false,
      isError: false,
    });

    render(
      <ConnectedLinkedInvestigations {...defaultProps} onOpenInvestigation={onOpenInvestigation} />,
      { wrapper }
    );

    fireEvent.click(screen.getByTestId('linkedInvestigationRow-inv-1'));

    expect(onOpenInvestigation).toHaveBeenCalledWith({
      conversationId: 'inv-1',
      agentId: 'agent-1',
    });
  });

  it('passes linkedInvestigationIds to the hook', () => {
    mockUseLinkedInvestigations.mockReturnValue({ data: [], isLoading: false, isError: false });
    const ids = ['inv-x', 'inv-y'];

    render(<ConnectedLinkedInvestigations {...defaultProps} linkedInvestigationIds={ids} />, {
      wrapper,
    });

    expect(mockUseLinkedInvestigations).toHaveBeenCalledWith(
      expect.objectContaining({ linkedInvestigationIds: ids })
    );
  });
});
