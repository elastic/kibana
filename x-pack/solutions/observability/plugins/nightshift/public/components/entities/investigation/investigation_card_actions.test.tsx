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
import {
  archiveDemoInvestigation,
  isDemoArchived,
  unarchiveDemoInvestigation,
} from '../../../data/investigations/demo_archive_store';
import { InvestigationCardActions } from './investigation_card_actions';

const mockIsDemoArchived = isDemoArchived as jest.MockedFunction<typeof isDemoArchived>;
const mockArchiveDemoInvestigation = archiveDemoInvestigation as jest.MockedFunction<
  typeof archiveDemoInvestigation
>;
const mockUnarchiveDemoInvestigation = unarchiveDemoInvestigation as jest.MockedFunction<
  typeof unarchiveDemoInvestigation
>;

const openChat = jest.fn();
const getChatHref = jest.fn(
  (id: string, agentId?: string) => `/mock/chat/${agentId ?? 'none'}/${id}`
);
const addSuccess = jest.fn();
const addError = jest.fn();
const httpDelete = jest.fn();
const httpPut = jest.fn();
let canManage = true;

jest.mock('@kbn/agentic-investigations-plugin/public', () => ({
  useOpenInChat: () => ({ getChatHref, openChat }),
  useCanManageInvestigations: () => canManage,
}));

jest.mock('../../../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: {
      http: {
        basePath: { get: () => '/s/default' },
        delete: httpDelete,
        put: httpPut,
      },
      notifications: { toasts: { addSuccess, addError } },
    },
  }),
}));

jest.mock('../../../data/investigations/demo_archive_store', () => ({
  archiveDemoInvestigation: jest.fn(),
  isDemoArchived: jest.fn(() => false),
  unarchiveDemoInvestigation: jest.fn(),
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

const renderActions = (
  assignees?: React.ReactNode,
  nextInvestigation: InvestigationSummary = investigation
) =>
  render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <InvestigationCardActions investigation={nextInvestigation} assignees={assignees} />
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
    httpPut.mockReset().mockResolvedValue({ status: 'closed' });
    canManage = true;
    mockIsDemoArchived.mockReturnValue(false);
    mockArchiveDemoInvestigation.mockReset();
    mockUnarchiveDemoInvestigation.mockReset();
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

  it('closes an open investigation from the overflow menu', async () => {
    renderActions();

    fireEvent.click(screen.getByTestId('nightshiftInvestigationCardActions'));
    fireEvent.click(screen.getByTestId('nightshiftInvestigationCardClose'));

    await waitFor(() =>
      expect(addSuccess).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Investigation closed' })
      )
    );
    expect(httpPut).toHaveBeenCalledWith(
      expect.stringContaining('/investigations/investigation-1/status'),
      expect.objectContaining({
        body: JSON.stringify({ status: 'closed' }),
      })
    );
  });

  it('reopens a closed investigation from the overflow menu', async () => {
    renderActions(undefined, {
      ...investigation,
      metadata: { ...investigation.metadata, status: 'closed' },
    });

    fireEvent.click(screen.getByTestId('nightshiftInvestigationCardActions'));
    expect(screen.getByTestId('nightshiftInvestigationCardOpen')).toHaveTextContent('Open');
    expect(screen.getByTestId('nightshiftInvestigationCardArchive')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('nightshiftInvestigationCardOpen'));

    await waitFor(() =>
      expect(addSuccess).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Investigation reopened' })
      )
    );
    expect(httpPut).toHaveBeenCalledWith(
      expect.stringContaining('/investigations/investigation-1/status'),
      expect.objectContaining({
        body: JSON.stringify({ status: 'open' }),
      })
    );
    expect(mockUnarchiveDemoInvestigation).toHaveBeenCalledWith('/s/default', 'investigation-1');
  });

  it('offers Re-open on archived cards and hides Archive', async () => {
    mockIsDemoArchived.mockReturnValue(true);
    httpPut.mockResolvedValue({ status: 'open' });
    renderActions(undefined, {
      ...investigation,
      metadata: { ...investigation.metadata, status: 'closed' },
    });

    fireEvent.click(screen.getByTestId('nightshiftInvestigationCardActions'));

    expect(screen.getByTestId('nightshiftInvestigationCardOpen')).toHaveTextContent('Re-open');
    expect(screen.queryByTestId('nightshiftInvestigationCardArchive')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('nightshiftInvestigationCardOpen'));

    await waitFor(() =>
      expect(addSuccess).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Investigation reopened' })
      )
    );
    expect(httpPut).toHaveBeenCalledWith(
      expect.stringContaining('/investigations/investigation-1/status'),
      expect.objectContaining({
        body: JSON.stringify({ status: 'open' }),
      })
    );
    expect(mockUnarchiveDemoInvestigation).toHaveBeenCalledWith('/s/default', 'investigation-1');
  });

  it('archives a closed investigation from the overflow menu', () => {
    renderActions(undefined, {
      ...investigation,
      metadata: { ...investigation.metadata, status: 'closed' },
    });

    fireEvent.click(screen.getByTestId('nightshiftInvestigationCardActions'));
    fireEvent.click(screen.getByTestId('nightshiftInvestigationCardArchive'));

    expect(mockArchiveDemoInvestigation).toHaveBeenCalledWith('/s/default', 'investigation-1');
    expect(addSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Investigation archived' })
    );
  });

  it('hides Delete, Close and Open from users who cannot manage investigations', () => {
    canManage = false;
    renderActions();

    fireEvent.click(screen.getByTestId('nightshiftInvestigationCardActions'));

    expect(screen.getByTestId('nightshiftInvestigationCardCopyLink')).toBeInTheDocument();
    expect(screen.queryByTestId('nightshiftInvestigationCardDelete')).not.toBeInTheDocument();
    expect(screen.queryByTestId('nightshiftInvestigationCardClose')).not.toBeInTheDocument();
    expect(screen.queryByTestId('nightshiftInvestigationCardOpen')).not.toBeInTheDocument();
  });
});
