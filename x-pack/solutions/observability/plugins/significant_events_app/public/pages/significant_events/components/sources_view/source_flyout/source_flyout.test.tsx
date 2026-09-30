/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { NightshiftSource } from '@kbn/nightshift-shared';
import { SourceFlyout } from './source_flyout';

const mockCreateSource = { mutateAsync: jest.fn() };
const mockUpdateSource = { mutateAsync: jest.fn() };
const mockAddError = jest.fn();

jest.mock('../../../../../hooks/use_kibana', () => ({
  useKibana: () => ({ core: { notifications: { toasts: { addError: mockAddError } } } }),
}));
jest.mock('../../../../../hooks/use_sources_api', () => ({
  useSourcesApi: () => ({ createSource: mockCreateSource, updateSource: mockUpdateSource }),
}));
jest.mock('./source_preview', () => ({ SourcePreview: () => null }));
jest.mock('@kbn/esql/public', () => ({
  ESQLLangEditor: ({
    query,
    onTextLangQueryChange,
    dataTestSubj,
  }: {
    query: { esql: string };
    onTextLangQueryChange: (query: { esql: string }) => void;
    dataTestSubj: string;
  }) => (
    <textarea
      data-test-subj={dataTestSubj}
      value={query.esql}
      onChange={(event) => onTextLangQueryChange({ esql: event.target.value })}
    />
  ),
}));

const nginxSource: NightshiftSource = {
  id: 'source-1',
  title: 'Nginx errors',
  description: 'All 5xx from nginx',
  tags: ['web'],
  esql: 'FROM logs-nginx-* | WHERE status >= 500',
  slug: 'nginx-errors',
  view_name: '$.nightshift.sources.default.nginx-errors',
  enabled: true,
  created_by: 'marco',
  created_at: '2026-09-01T00:00:00.000Z',
  updated_at: '2026-09-01T00:00:00.000Z',
  esql_updated_at: '2026-09-01T00:00:00.000Z',
};

const onClose = jest.fn();

const setup = (source?: NightshiftSource) =>
  render(
    <I18nProvider>
      <SourceFlyout source={source} onClose={onClose} />
    </I18nProvider>
  );

const fillNewSource = ({ title, esql }: { title: string; esql: string }) => {
  fireEvent.change(screen.getByTestId('significantEventsAppSourceFlyoutTitleInput'), {
    target: { value: title },
  });
  fireEvent.change(screen.getByTestId('significantEventsAppSourceFlyoutQueryEditor'), {
    target: { value: esql },
  });
};

describe('SourceFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateSource.mutateAsync.mockResolvedValue(nginxSource);
    mockUpdateSource.mutateAsync.mockResolvedValue(nginxSource);
  });

  it('creates the source with the form values and closes', async () => {
    setup();
    fillNewSource({ title: 'Nginx errors', esql: 'FROM logs-nginx-*' });

    fireEvent.click(screen.getByTestId('significantEventsAppSourceFlyoutSaveButton'));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(mockCreateSource.mutateAsync).toHaveBeenCalledWith({
      title: 'Nginx errors',
      description: undefined,
      tags: [],
      esql: 'FROM logs-nginx-*',
    });
  });

  it('rejects a query with commands other than WHERE before calling the API', async () => {
    setup();
    fillNewSource({ title: 'Nginx errors', esql: 'FROM logs-nginx-* | STATS c = COUNT(*)' });

    fireEvent.click(screen.getByTestId('significantEventsAppSourceFlyoutSaveButton'));

    expect(await screen.findByText(/only WHERE may follow FROM or TS/)).toBeInTheDocument();
    expect(mockCreateSource.mutateAsync).not.toHaveBeenCalled();
  });

  it('shows a validation error from the sources API under the query', async () => {
    mockCreateSource.mutateAsync.mockRejectedValue({
      body: {
        statusCode: 400,
        message: 'ES|QL query cannot be executed: Unknown column [status]',
      },
    });
    setup();
    fillNewSource({ title: 'Nginx errors', esql: 'FROM logs-nginx-* | WHERE status >= 500' });

    fireEvent.click(screen.getByTestId('significantEventsAppSourceFlyoutSaveButton'));

    expect(
      await screen.findByText('ES|QL query cannot be executed: Unknown column [status]')
    ).toBeInTheDocument();
    expect(mockAddError).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('replaces every editable field when saving an edited source', async () => {
    setup(nginxSource);
    fireEvent.change(screen.getByTestId('significantEventsAppSourceFlyoutTitleInput'), {
      target: { value: 'Nginx 5xx' },
    });

    fireEvent.click(screen.getByTestId('significantEventsAppSourceFlyoutSaveButton'));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(mockUpdateSource.mutateAsync).toHaveBeenCalledWith({
      sourceId: 'source-1',
      body: {
        title: 'Nginx 5xx',
        description: 'All 5xx from nginx',
        tags: ['web'],
        esql: 'FROM logs-nginx-* | WHERE status >= 500',
      },
    });
  });
});
