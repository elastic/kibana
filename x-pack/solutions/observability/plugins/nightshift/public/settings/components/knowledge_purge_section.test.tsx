/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { KnowledgePurgePreview } from '@kbn/nightshift-investigations-plugin/common';
import { KnowledgePurgeSection } from './knowledge_purge_section';
import { usePurgeKnowledge, usePurgePreview } from './use_knowledge_purge';

jest.mock('./use_knowledge_purge');

const purge = jest.fn();
const refetch = jest.fn();

const preview: KnowledgePurgePreview = {
  since: '2026-01-10T00:00:00.000Z',
  counts: { memory_pages: 2, cortex_pages: 1, decision_trees: 4, investigations: 1 },
  investigations: [
    { id: 'inv-1', title: 'Poisoned checkout run', updated_at: '2026-01-11T00:00:00.000Z' },
  ],
  investigations_capped: false,
};

const mockPreview = (data: KnowledgePurgePreview | undefined) => {
  jest.mocked(usePurgePreview).mockReturnValue({
    data,
    isLoading: false,
    isFetching: false,
    isError: false,
    refetch,
  } as unknown as ReturnType<typeof usePurgePreview>);
};

const renderSection = (canManage = true) =>
  render(
    <I18nProvider>
      <KnowledgePurgeSection canManage={canManage} />
    </I18nProvider>
  );

describe('KnowledgePurgeSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPreview(undefined);
    jest.mocked(usePurgeKnowledge).mockReturnValue({
      mutate: purge,
      isLoading: false,
    } as unknown as ReturnType<typeof usePurgeKnowledge>);
  });

  it('counts every store and names the investigations a purge would delete', () => {
    mockPreview(preview);
    renderSection();

    fireEvent.click(screen.getByTestId('nightshiftPurgePreviewButton'));

    const shown = screen.getAllByTestId('nightshiftPurgePreview')[0];
    expect(shown).toHaveTextContent('2 Semantic Memory pages');
    expect(shown).toHaveTextContent('1 Cortex page');
    expect(shown).toHaveTextContent('4 decision tree documents');
    expect(shown).toHaveTextContent('1 investigation');
    expect(shown).toHaveTextContent('Poisoned checkout run');
  });

  it('requires the exact confirmation before it purges', () => {
    mockPreview(preview);
    renderSection();

    fireEvent.click(screen.getByTestId('nightshiftPurgeButton'));
    const modal = screen.getByTestId('nightshiftPurgeModal');
    const confirm = within(modal).getByRole('button', { name: 'Purge permanently' });
    const input = screen.getByTestId('nightshiftPurgeConfirmation');

    for (const phrase of ['', 'purge', 'Purge', 'PURGE ', ' PURGE']) {
      fireEvent.change(input, { target: { value: phrase } });
      expect(confirm).toBeDisabled();
    }
    expect(modal).toHaveTextContent('only the current Kibana space');
    expect(modal).toHaveTextContent('not a secure erase');

    fireEvent.change(input, { target: { value: 'PURGE' } });
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);

    expect(purge).toHaveBeenCalledWith({ since: expect.any(String) });
  });

  it('says so when nothing was learned after the cutoff', () => {
    mockPreview({
      ...preview,
      counts: { memory_pages: 0, cortex_pages: 0, decision_trees: 0, investigations: 0 },
      investigations: [],
    });
    renderSection();

    fireEvent.click(screen.getByTestId('nightshiftPurgePreviewButton'));

    expect(screen.getAllByTestId('nightshiftPurgePreviewEmpty')[0]).toHaveTextContent(
      'There is nothing to purge.'
    );
  });

  it('disables the destructive controls without the manage and configure privileges', () => {
    renderSection(false);

    expect(screen.getByTestId('nightshiftPurgeButton')).toBeDisabled();
    expect(screen.getByTestId('nightshiftPurgePreviewButton')).toBeDisabled();
  });
});
