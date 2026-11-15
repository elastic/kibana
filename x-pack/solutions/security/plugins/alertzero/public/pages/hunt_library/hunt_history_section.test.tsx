/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { HuntHistoryEntry } from '../../../common/hunt_library';
import { useHuntHistory } from '../../hooks/use_hunt_library_api';
import { HuntHistorySection } from './hunt_history_section';

jest.mock('../../hooks/use_hunt_library_api');
jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({
    services: {
      application: {
        getUrlForApp: (_app: string, { path }: { path: string }) =>
          `http://kibana/app/alertzero${path}`,
      },
    },
  }),
}));

const mockHistory = (state: Record<string, unknown>) =>
  jest.mocked(useHuntHistory).mockReturnValue(state as never);

const entry = (overrides: Partial<HuntHistoryEntry> = {}): HuntHistoryEntry => ({
  kind: 'manual_session',
  sessionId: 's1',
  executionId: 'e1',
  definitionVersion: 1,
  outcome: 'exploratory',
  startedAt: '2026-11-03T10:00:00.000Z',
  startedBy: 'analyst',
  ...overrides,
});

const renderSection = () =>
  render(
    <I18nProvider>
      <HuntHistorySection huntId="rare_lsass_process_access" />
    </I18nProvider>
  );

describe('HuntHistorySection', () => {
  it('lists each session with who started it and its exploratory outcome', () => {
    mockHistory({
      data: { history: [entry(), entry({ sessionId: 's2', startedBy: undefined })] },
      isLoading: false,
      isError: false,
    });
    renderSection();

    const table = screen.getByTestId('alertZeroHuntFlyoutHistoryTable');
    expect(table).toHaveTextContent('analyst');
    expect(table).toHaveTextContent('Manual session');
    expect(screen.getAllByText('Exploratory')).toHaveLength(2);
  });

  it('reads the outcome in words and links a session to its Investigation', () => {
    mockHistory({
      data: {
        history: [
          entry({ outcome: 'investigation_created', investigationId: 'inv-1' }),
          entry({ sessionId: 's2' }),
        ],
      },
      isLoading: false,
      isError: false,
    });
    renderSection();

    expect(screen.getByText('Investigation created')).toBeInTheDocument();
    expect(screen.queryByText('investigation_created')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('alertZeroHuntHistoryInvestigationLink')).toHaveLength(1);
    expect(screen.getByTestId('alertZeroHuntHistoryInvestigationLink')).toHaveAttribute(
      'href',
      'http://kibana/app/alertzero?selectedConversationId=inv-1'
    );
  });

  it('says so when the hunt has not been run', () => {
    mockHistory({ data: { history: [] }, isLoading: false, isError: false });
    renderSection();

    expect(screen.getByTestId('alertZeroHuntFlyoutHistoryEmpty')).toBeInTheDocument();
  });

  it('offers a retry when the history cannot be loaded', () => {
    const refetch = jest.fn();
    mockHistory({ data: undefined, isLoading: false, isError: true, refetch });
    renderSection();

    fireEvent.click(screen.getByTestId('alertZeroHuntFlyoutHistoryRetry'));

    expect(refetch).toHaveBeenCalled();
  });

  it('shows a spinner while loading', () => {
    mockHistory({ data: undefined, isLoading: true, isError: false });
    renderSection();

    expect(screen.getByLabelText('Loading hunt…')).toBeInTheDocument();
  });
});
