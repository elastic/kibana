/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { GetCustomContextResponse } from '@kbn/nightshift-investigations-plugin/common';
import { useKibana } from '../hooks/use_kibana';
import { CustomContextFlyout } from './custom_context_flyout';

jest.mock('../hooks/use_kibana', () => ({ useKibana: jest.fn() }));
jest.mock('../common/format_timestamp', () => ({
  useFormatTimestamp: () => (timestamp: string) => timestamp,
}));

const mockUseKibana = useKibana as jest.Mock;

const SNIPPET = {
  id: 'snippet-1',
  text: 'While debugging alerts, always rule out a release regression.',
  author_name: 'Sameer Agarwal',
  created_at: '2026-01-01T00:00:00.000Z',
};

const setup = ({
  getResponse,
  canEdit = true,
}: {
  getResponse: GetCustomContextResponse;
  canEdit?: boolean;
}) => {
  const fetch = jest.fn(async (endpoint: string, options?: { params?: { body: unknown } }) => {
    if (endpoint.startsWith('GET ')) return getResponse;
    const { snippets } = options?.params?.body as {
      snippets: Array<{ id?: string; text: string }>;
    };
    return {
      snippets: snippets.map((snippet, index) => ({
        ...SNIPPET,
        id: snippet.id ?? `new-${index}`,
        text: snippet.text,
      })),
      version: 'next',
    };
  });
  const notifications = { toasts: { addError: jest.fn(), addWarning: jest.fn() } };
  mockUseKibana.mockReturnValue({
    services: { notifications, nightshiftInvestigations: { investigationsClient: { fetch } } },
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <CustomContextFlyout canEdit={canEdit} onClose={jest.fn()} />
      </QueryClientProvider>
    </I18nProvider>
  );
  const getPutBody = () => fetch.mock.calls.find(([endpoint]) => endpoint.startsWith('PUT '))?.[1];
  return { fetch, getPutBody };
};

describe('CustomContextFlyout', () => {
  it('lists snippets with their author', async () => {
    setup({ getResponse: { snippets: [SNIPPET], version: 'v1' } });

    expect(await screen.findByTestId('nightshiftCustomContextSnippetText')).toHaveTextContent(
      SNIPPET.text
    );
    expect(screen.getByTestId('nightshiftCustomContextSnippetAuthor')).toHaveTextContent(
      'Sameer Agarwal'
    );
  });

  it('shows an empty state when no snippets exist', async () => {
    setup({ getResponse: { snippets: [] } });

    expect(await screen.findByTestId('nightshiftCustomContextEmpty')).toBeInTheDocument();
  });

  it('appends a new snippet to the existing ones on save', async () => {
    const { getPutBody } = setup({ getResponse: { snippets: [SNIPPET], version: 'v1' } });

    fireEvent.click(await screen.findByTestId('nightshiftCustomContextAdd'));
    fireEvent.change(screen.getByTestId('nightshiftCustomContextDraft'), {
      target: { value: 'Payments runs in us-east-1.' },
    });
    fireEvent.click(screen.getByTestId('nightshiftCustomContextSave'));

    await waitFor(() =>
      expect(getPutBody()).toEqual({
        params: {
          body: {
            snippets: [
              { id: SNIPPET.id, text: SNIPPET.text },
              { text: 'Payments runs in us-east-1.' },
            ],
            version: 'v1',
          },
        },
        signal: null,
      })
    );
    await waitFor(() =>
      expect(screen.getAllByTestId('nightshiftCustomContextSnippet')).toHaveLength(2)
    );
    expect(screen.queryByTestId('nightshiftCustomContextDraft')).not.toBeInTheDocument();
  });

  it('saves an edited snippet in place, keeping its id', async () => {
    const { getPutBody } = setup({ getResponse: { snippets: [SNIPPET], version: 'v1' } });

    fireEvent.click(await screen.findByTestId('nightshiftCustomContextEdit'));
    const draft = screen.getByTestId('nightshiftCustomContextDraft');
    expect(draft).toHaveValue(SNIPPET.text);
    expect(screen.getByTestId('nightshiftCustomContextSave')).toBeDisabled();

    fireEvent.change(draft, { target: { value: 'Rule out config regressions first.' } });
    fireEvent.click(screen.getByTestId('nightshiftCustomContextSave'));

    await waitFor(() =>
      expect(getPutBody()).toEqual({
        params: {
          body: {
            snippets: [{ id: SNIPPET.id, text: 'Rule out config regressions first.' }],
            version: 'v1',
          },
        },
        signal: null,
      })
    );
    await waitFor(() =>
      expect(screen.getByTestId('nightshiftCustomContextSnippetText')).toHaveTextContent(
        'Rule out config regressions first.'
      )
    );
  });

  it('marks edited snippets', async () => {
    setup({
      getResponse: {
        snippets: [{ ...SNIPPET, updated_by: 'Jane', updated_at: '2026-01-02T00:00:00.000Z' }],
        version: 'v1',
      },
    });

    expect(await screen.findByTestId('nightshiftCustomContextEdited')).toHaveTextContent('Edited');
  });

  it('removes a snippet when it is deleted', async () => {
    const { getPutBody } = setup({ getResponse: { snippets: [SNIPPET], version: 'v1' } });

    fireEvent.click(await screen.findByTestId('nightshiftCustomContextDelete'));

    await waitFor(() =>
      expect(getPutBody()).toEqual({
        params: { body: { snippets: [], version: 'v1' } },
        signal: null,
      })
    );
  });

  it('hides add, edit, and delete for users who cannot manage Nightshift', async () => {
    setup({ getResponse: { snippets: [SNIPPET], version: 'v1' }, canEdit: false });

    await screen.findByTestId('nightshiftCustomContextSnippet');
    expect(screen.queryByTestId('nightshiftCustomContextAdd')).not.toBeInTheDocument();
    expect(screen.queryByTestId('nightshiftCustomContextEdit')).not.toBeInTheDocument();
    expect(screen.queryByTestId('nightshiftCustomContextDelete')).not.toBeInTheDocument();
  });
});
