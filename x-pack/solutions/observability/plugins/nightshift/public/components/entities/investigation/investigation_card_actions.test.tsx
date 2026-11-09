/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { copyToClipboard } from '@elastic/eui';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { InvestigationSummary } from '@kbn/agentic-investigations-plugin/common';
import { InvestigationCardActions } from './investigation_card_actions';

const openChat = jest.fn();
const getChatHref = jest.fn(
  (id: string, agentId?: string) => `/mock/chat/${agentId ?? 'none'}/${id}`
);
const addSuccess = jest.fn();
const addError = jest.fn();
const httpDelete = jest.fn();
let isAgentBuilderAdmin = true;

jest.mock('@kbn/agentic-investigations-plugin/public', () => ({
  useOpenInChat: () => ({ getChatHref, openChat }),
}));

jest.mock('../../../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: {
      application: { capabilities: { agentBuilder: { isAdmin: isAgentBuilderAdmin } } },
      http: { basePath: { get: () => '/s/default' }, delete: httpDelete },
      notifications: { toasts: { addSuccess, addError } },
    },
  }),
}));

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    copyToClipboard: jest.fn(() => true),
  };
});

const investigation: InvestigationSummary = {
  id: 'investigation-1',
  title: 'Checkout errors',
  title_pending: false,
  created_at: '2026-09-11T09:00:00.000Z',
  updated_at: '2026-09-11T09:00:00.000Z',
  agent_id: 'nightshift.investigation',
  metadata: { status: 'open', severity: 'critical', summary: 'Checkout errors are elevated' },
  in_progress: false,
  subjects: [],
};

let queryClient: QueryClient;

const renderActions = (assignees?: React.ReactNode) =>
  render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <InvestigationCardActions investigation={investigation} assignees={assignees} />
      </I18nProvider>
    </QueryClientProvider>
  );

describe('InvestigationCardActions', () => {
  beforeEach(() => {
    queryClient = new QueryClient();
    openChat.mockReset();
    getChatHref.mockClear();
    addSuccess.mockReset();
    addError.mockReset();
    httpDelete.mockReset().mockResolvedValue({ success: true });
    isAgentBuilderAdmin = true;
    (copyToClipboard as jest.Mock).mockReturnValue(true);
  });

  it('opens the investigation chat when the robot control is clicked', () => {
    renderActions();

    fireEvent.click(screen.getByTestId('nightshiftInvestigationCardOpenInChat'));

    expect(openChat).toHaveBeenCalledWith('investigation-1', 'nightshift.investigation');
  });

  it('shows the assignees before the other actions', () => {
    renderActions(<span data-test-subj="assigneesControl" />);

    expect(screen.getByTestId('nightshiftInvestigationCardAssignees')).toContainElement(
      screen.getByTestId('assigneesControl')
    );
    expect(
      screen
        .getAllByTestId(/^nightshiftInvestigationCard(Assignees|OpenInChat|Actions)$/)
        .map((element) => element.getAttribute('data-test-subj'))
    ).toEqual([
      'nightshiftInvestigationCardAssignees',
      'nightshiftInvestigationCardOpenInChat',
      'nightshiftInvestigationCardActions',
    ]);
  });

  it('leaves the assignees out when none are given', () => {
    renderActions();

    expect(screen.queryByTestId('nightshiftInvestigationCardAssignees')).not.toBeInTheDocument();
  });

  it('copies the Nightshift flyout share URL from the overflow menu', () => {
    renderActions();

    fireEvent.click(screen.getByTestId('nightshiftInvestigationCardActions'));
    fireEvent.click(screen.getByTestId('nightshiftInvestigationCardCopyLink'));

    expect(copyToClipboard).toHaveBeenCalledWith(
      expect.stringContaining('investigationId=investigation-1')
    );
    expect(addSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Copied link to clipboard' })
    );
  });

  it('deletes the investigation conversation after confirmation and refreshes the lists', async () => {
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');
    renderActions();

    fireEvent.click(screen.getByTestId('nightshiftInvestigationCardActions'));
    fireEvent.click(screen.getByTestId('nightshiftInvestigationCardDelete'));
    expect(httpDelete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));

    await waitFor(() =>
      expect(addSuccess).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Investigation deleted' })
      )
    );
    expect(httpDelete).toHaveBeenCalledWith('/api/agent_builder/conversations/investigation-1', {
      version: '2023-10-31',
    });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['nightshift.investigations'] });
  });

  it('shows an error toast when the delete fails', async () => {
    const error = new Error('Not found');
    httpDelete.mockRejectedValue(error);
    renderActions();

    fireEvent.click(screen.getByTestId('nightshiftInvestigationCardActions'));
    fireEvent.click(screen.getByTestId('nightshiftInvestigationCardDelete'));
    fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));

    await waitFor(() =>
      expect(addError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({ title: 'Could not delete the investigation' })
      )
    );
    expect(addSuccess).not.toHaveBeenCalled();
  });

  it('hides Delete from users who are not Agent Builder admins', () => {
    isAgentBuilderAdmin = false;
    renderActions();

    fireEvent.click(screen.getByTestId('nightshiftInvestigationCardActions'));

    expect(screen.getByTestId('nightshiftInvestigationCardCopyLink')).toBeInTheDocument();
    expect(screen.queryByTestId('nightshiftInvestigationCardDelete')).not.toBeInTheDocument();
  });
});
