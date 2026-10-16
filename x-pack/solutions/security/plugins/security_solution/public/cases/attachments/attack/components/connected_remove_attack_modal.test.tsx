/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { ConnectedRemoveAttackModal } from './connected_remove_attack_modal';
import { fetchCaseAttachments, FETCH_CASE_ATTACHMENTS_QUERY_KEY } from '../api';
import type { CaseAttachment } from '../utils';

jest.mock('../../../../common/lib/kibana');

jest.mock('../api', () => ({
  FETCH_CASE_ATTACHMENTS_QUERY_KEY: ['GET', 'attack-attachment-case-attachments'],
  fetchCaseAttachments: jest.fn(),
}));

// Stands in for the real resolution: every attachment's alert counts, which is enough to tell
// which snapshot of the case the prompt counted.
jest.mock('../hooks/use_removable_alert_attachments', () => ({
  useRemovableAlertAttachments: ({ comments }: { comments: CaseAttachment[] }) => ({
    alertIds: comments.map(
      (comment) => (comment as unknown as { attachmentId: string }).attachmentId
    ),
    isResolvable: true,
    isLoading: false,
  }),
}));

jest.mock('./remove_attack_modal', () => ({
  RemoveAttackModal: ({ alertCount, isLoading }: { alertCount: number; isLoading: boolean }) => (
    <div data-test-subj="modal">{isLoading ? 'loading' : `count:${alertCount}`}</div>
  ),
}));

const fetchCaseAttachmentsMock = fetchCaseAttachments as jest.Mock;

const attachmentsWith = (alertIds: string[]): CaseAttachment[] =>
  alertIds.map((alertId) => ({ attachmentId: alertId } as unknown as CaseAttachment));

describe('ConnectedRemoveAttackModal', () => {
  let queryClient: QueryClient;

  const renderModal = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <ConnectedRemoveAttackModal
          caseId="case-1"
          attackIds={['attack-1']}
          attackTitle="an attack"
          onCancel={jest.fn()}
          onConfirm={jest.fn()}
        />
      </QueryClientProvider>
    );

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it('counts the alerts of the attachments the case returns', async () => {
    fetchCaseAttachmentsMock.mockResolvedValue(attachmentsWith(['alert-1']));

    renderModal();

    await waitFor(() => expect(screen.getByTestId('modal')).toHaveTextContent('count:1'));
  });

  it('waits rather than counting a cached response that a refetch has already superseded', async () => {
    fetchCaseAttachmentsMock.mockResolvedValue(attachmentsWith(['alert-1']));

    const first = renderModal();
    await waitFor(() => expect(screen.getByTestId('modal')).toHaveTextContent('count:1'));
    first.unmount();

    // A removal elsewhere changed the case, so what the cache holds no longer matches it.
    let release: (attachments: CaseAttachment[]) => void = () => {};
    fetchCaseAttachmentsMock.mockReturnValue(
      new Promise<CaseAttachment[]>((resolve) => {
        release = resolve;
      })
    );
    queryClient.invalidateQueries([...FETCH_CASE_ATTACHMENTS_QUERY_KEY, 'case-1']);

    renderModal();

    // The analyst consents to this number, so the superseded one must never be on screen.
    await waitFor(() => expect(screen.getByTestId('modal')).toHaveTextContent('loading'));

    release(attachmentsWith(['alert-1', 'alert-2']));

    await waitFor(() => expect(screen.getByTestId('modal')).toHaveTextContent('count:2'));
  });
});
