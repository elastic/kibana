/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { WikiPageView } from './page_view';
import { useArchiveWikiPage, useRestoreWikiPage, useWikiPage } from './use_wiki';
import type { WikiPage } from './types';

jest.mock('./use_wiki');

const mockArchive = jest.fn(
  (_variables: { id: string; version: string }, options?: { onSuccess?: () => void }) =>
    options?.onSuccess?.()
);
const mockOnArchived = jest.fn();
const wikiPage: WikiPage = {
  id: 'wiki_checkout',
  slug: 'checkout',
  title: 'Checkout service',
  entity_type: 'service',
  status: 'established',
  corroborations: 2,
  updated_at: '2026-01-01T00:00:00.000Z',
  content: 'Handles payments.',
  version: 'v1',
};

describe('WikiPageView archive confirmation', () => {
  beforeEach(() => {
    mockArchive.mockClear();
    mockOnArchived.mockClear();
    (useWikiPage as jest.Mock).mockReturnValue({
      data: { page: wikiPage },
      isLoading: false,
      isError: false,
    });
    (useArchiveWikiPage as jest.Mock).mockReturnValue({ mutate: mockArchive, isLoading: false });
    (useRestoreWikiPage as jest.Mock).mockReturnValue({ mutate: jest.fn(), isLoading: false });
  });

  const openConfirm = async () => {
    render(
      <I18nProvider>
        <WikiPageView pageId={wikiPage.id} canManage onArchived={mockOnArchived} />
      </I18nProvider>
    );
    await userEvent.click(screen.getByTestId('nightshiftWikiPageArchive'));
  };

  it('closes without archiving when the user cancels', async () => {
    await openConfirm();
    await userEvent.click(screen.getByTestId('nightshiftWikiPageViewCancelButton'));

    expect(screen.queryByTestId('nightshiftWikiArchiveConfirm')).not.toBeInTheDocument();
    expect(mockArchive).not.toHaveBeenCalled();
  });

  it('archives the page with its version and reports it when the user confirms', async () => {
    await openConfirm();
    await userEvent.click(screen.getByTestId('nightshiftWikiPageViewArchiveButton'));

    expect(mockArchive).toHaveBeenCalledWith(
      { id: wikiPage.id, version: 'v1' },
      expect.any(Object)
    );
    expect(mockOnArchived).toHaveBeenCalledTimes(1);
  });
});
