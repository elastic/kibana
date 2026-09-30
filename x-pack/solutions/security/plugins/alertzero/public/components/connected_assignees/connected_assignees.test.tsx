/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { coreMock } from '@kbn/core/public/mocks';
import {
  useAssignEscalation,
  useAssignInvestigation,
  useUserProfiles,
  useSuggestUserProfiles,
} from '@kbn/agentic-investigations-plugin/public';
import { ConnectedAssignees } from './connected_assignees';

jest.mock('@kbn/agentic-investigations-plugin/public', () => ({
  ...jest.requireActual('@kbn/agentic-investigations-plugin/public'),
  useAssignEscalation: jest.fn(),
  useAssignInvestigation: jest.fn(),
  useUserProfiles: jest.fn(),
  useSuggestUserProfiles: jest.fn(),
}));

jest.mock('@kbn/agentic-investigations-common', () => {
  const actual = jest.requireActual('@kbn/agentic-investigations-common');
  return {
    ...actual,
    // eslint-disable-next-line react/display-name
    AssignToUsers: ({
      conversationId,
      onChange,
      canManage,
      isUpdating,
    }: {
      conversationId: string;
      onChange: (s: unknown[]) => void;
      canManage: boolean;
      isUpdating: boolean;
    }) => (
      <div>
        <span data-test-subj={`updating-${conversationId}`}>
          {isUpdating ? 'updating' : 'idle'}
        </span>
        {canManage && (
          <button
            data-test-subj={`assign-${conversationId}`}
            onClick={() =>
              onChange([{ uid: 'user-1', enabled: true, user: { username: 'alice' }, data: {} }])
            }
          >
            Assign
          </button>
        )}
      </div>
    ),
  };
});

const mockUseAssignEscalation = useAssignEscalation as jest.Mock;
const mockUseAssignInvestigation = useAssignInvestigation as jest.Mock;
const mockUseUserProfiles = useUserProfiles as jest.Mock;
const mockUseSuggestUserProfiles = useSuggestUserProfiles as jest.Mock;

const escalationMutate = jest.fn().mockResolvedValue({});
const investigationMutate = jest.fn().mockResolvedValue({});

const renderPicker = (
  props: Partial<React.ComponentProps<typeof ConnectedAssignees>> & {
    capabilities?: Record<string, unknown>;
  } = {}
) => {
  const { capabilities = { manageEscalations: true, manageInvestigations: true }, ...rest } = props;
  const core = coreMock.createStart();
  (core.application.capabilities as Record<string, unknown>).agenticInvestigations = capabilities;
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  render(
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider services={core}>
          <QueryClientProvider client={queryClient}>
            <ConnectedAssignees
              conversationId="conv-1"
              templateId="escalation"
              assigneeUids={[]}
              status="open"
              {...rest}
            />
          </QueryClientProvider>
        </KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );

  return { core };
};

beforeEach(() => {
  mockUseAssignEscalation.mockReturnValue({ mutateAsync: escalationMutate });
  mockUseAssignInvestigation.mockReturnValue({ mutateAsync: investigationMutate });
  mockUseUserProfiles.mockReturnValue({ data: [], isFetching: false });
  mockUseSuggestUserProfiles.mockReturnValue({ data: [], isLoading: false });
});

afterEach(() => jest.clearAllMocks());

describe('ConnectedAssignees', () => {
  it('calls the escalation mutation for templateId: escalation', async () => {
    renderPicker({ templateId: 'escalation' });

    fireEvent.click(screen.getByTestId('assign-conv-1'));

    await waitFor(() =>
      expect(escalationMutate).toHaveBeenCalledWith(
        expect.objectContaining({ escalationId: 'conv-1' })
      )
    );
    expect(investigationMutate).not.toHaveBeenCalled();
  });

  it('calls the investigation mutation for templateId: investigation', async () => {
    renderPicker({ templateId: 'investigation' });

    fireEvent.click(screen.getByTestId('assign-conv-1'));

    await waitFor(() =>
      expect(investigationMutate).toHaveBeenCalledWith(
        expect.objectContaining({ investigationId: 'conv-1' })
      )
    );
    expect(escalationMutate).not.toHaveBeenCalled();
  });

  it('renders read-only for a closed escalation regardless of capability', () => {
    renderPicker({ templateId: 'escalation', status: 'closed' });

    expect(screen.queryByTestId('assign-conv-1')).not.toBeInTheDocument();
  });

  it('renders read-only for a closed investigation', () => {
    renderPicker({ templateId: 'investigation', status: 'closed' });

    expect(screen.queryByTestId('assign-conv-1')).not.toBeInTheDocument();
  });

  it('renders read-only when manageEscalations capability is absent', () => {
    renderPicker({
      templateId: 'escalation',
      capabilities: { manageEscalations: false, manageInvestigations: true },
    });

    expect(screen.queryByTestId('assign-conv-1')).not.toBeInTheDocument();
  });

  it('renders read-only when manageInvestigations capability is absent', () => {
    renderPicker({
      templateId: 'investigation',
      capabilities: { manageEscalations: true, manageInvestigations: false },
    });

    expect(screen.queryByTestId('assign-conv-1')).not.toBeInTheDocument();
  });

  it('still clears pending after a successful mutation when refetchConversation is absent', async () => {
    renderPicker({ templateId: 'escalation', refetchConversation: undefined });

    fireEvent.click(screen.getByTestId('assign-conv-1'));

    await waitFor(() => expect(screen.getByTestId('updating-conv-1')).toHaveTextContent('idle'));
  });
});
