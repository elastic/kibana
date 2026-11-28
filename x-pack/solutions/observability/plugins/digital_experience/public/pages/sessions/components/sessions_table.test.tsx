/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { emptyFrustration } from '../../../../common/frustration';
import { emptyWebVitals, type SessionSummary } from '../../../../common/sessions';
import { createFormatters } from '../../../hooks/use_formatters';
import { createUiSettingsMock } from '../../../test_utils/ui_settings_mock';
import { sessionsListStateOf, type SessionsListState } from '../hooks/use_sessions_list_query';
import {
  SESSIONS_HIDDEN_BY_DEFAULT,
  SESSIONS_OPTIONAL_COLUMN_IDS,
  SessionsTable,
} from './sessions_table';

const SESSION: SessionSummary = {
  sessionId: 'session-1',
  serviceName: 'shop',
  startTime: '2026-10-20T10:00:00.000Z',
  endTime: '2026-10-20T10:03:20.000Z',
  durationMs: 200_000,
  eventCount: 40,
  pageViewCount: 3,
  pageLoadCount: 1,
  clickCount: 7,
  jsErrorCount: 2,
  httpRequestCount: 12,
  failedRequestCount: 1,
  frustration: emptyFrustration(),
  bounced: false,
  entryPage: '/',
  exitPage: '/cart',
  journey: ['/', '/products', '/cart'],
  environment: 'production',
  user: 'jane@example.com',
  userAgent: { browser: 'Chrome', browserVersion: '130', os: 'macOS', device: null },
  geo: { countryIso: 'NL', region: null, city: 'Amsterdam' },
  webVitals: emptyWebVitals(),
};

const DEFAULT_COLUMNS = new Set(
  SESSIONS_OPTIONAL_COLUMN_IDS.filter((id) => !SESSIONS_HIDDEN_BY_DEFAULT.includes(id))
);

const formatters = createFormatters(createUiSettingsMock());

const onChange = jest.fn();

const renderTable = (state: Partial<SessionsListState> = {}) =>
  render(
    <SessionsTable
      sessions={[SESSION]}
      total={60}
      state={{ ...sessionsListStateOf({}), ...state }}
      isLoading={false}
      noItemsMessage="No sessions"
      formatters={formatters}
      sessionHref={(sessionId) => `/sessions/${sessionId}`}
      visibleColumns={DEFAULT_COLUMNS}
      onChange={onChange}
    />,
    {
      wrapper: ({ children }) => (
        <I18nProvider>
          <EuiProvider>{children}</EuiProvider>
        </I18nProvider>
      ),
    }
  );

const columnHeaderButton = (name: RegExp) =>
  within(screen.getByTestId('digitalExperienceSessionsTable')).getByRole('button', { name });

beforeEach(() => {
  onChange.mockClear();
});

describe('SessionsTable', () => {
  it.each([
    [/^Duration/, 'duration_ms'],
    [/^JS errors/, 'js_error_count'],
    [/^Frustration/, 'frustration_count'],
  ])('sorts by %s, ascending first', (name, sortField) => {
    renderTable();

    fireEvent.click(columnHeaderButton(name));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ sortField, sortDirection: 'asc' });
  });

  it('marks the column it is sorted by', () => {
    renderTable({ sortField: 'frustration_count', sortDirection: 'asc' });

    expect(screen.getByRole('columnheader', { name: /^Frustration/ })).toHaveAttribute(
      'aria-sort',
      'ascending'
    );
  });

  it('pages', () => {
    renderTable({ sortField: 'duration_ms', sortDirection: 'asc' });

    fireEvent.click(screen.getByTestId('pagination-button-1'));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ page: '1' });
  });

  it('leaves the first page out of the URL, as it is the default', () => {
    renderTable({ page: 1 });

    fireEvent.click(screen.getByTestId('pagination-button-0'));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ page: undefined });
  });
});
