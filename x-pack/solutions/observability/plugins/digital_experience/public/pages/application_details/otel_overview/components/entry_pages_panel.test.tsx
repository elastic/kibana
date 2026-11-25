/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import type { EntryPage } from '../../../../../common/types/overview';
import { useKibanaServices } from '../../../../hooks/use_kibana_services';
import { createUiSettingsMock } from '../../../../test_utils/ui_settings_mock';
import { EntryPagesPanel } from './entry_pages_panel';

jest.mock('../../../../hooks/use_kibana_services');

const ENTRY_PAGES: EntryPage[] = [
  { page: '/', sessions: 1200, bounceRate: 0.4 },
  { page: '/products/{slug}', sessions: 30, bounceRate: 0 },
];

const sessionsHref = jest.fn((query: { entryPage?: string }) => `/sessions?e=${query.entryPage}`);

const renderPanel = (entryPages = ENTRY_PAGES, isLoading = false) =>
  render(
    <EntryPagesPanel entryPages={entryPages} isLoading={isLoading} sessionsHref={sessionsHref} />,
    { wrapper: EuiProvider }
  );

beforeEach(() => {
  jest.mocked(useKibanaServices).mockReturnValue({
    uiSettings: createUiSettingsMock(),
  } as unknown as ReturnType<typeof useKibanaServices>);
});

describe('EntryPagesPanel', () => {
  it('shows a row per page with its sessions and bounce rate', () => {
    renderPanel();

    expect(screen.getByRole('heading', { level: 2, name: 'Entry pages' })).toBeInTheDocument();
    expect(screen.getByTitle('/')).toBeInTheDocument();
    expect(screen.getByText('1,200')).toBeInTheDocument();
    expect(screen.getByText('40%')).toBeInTheDocument();
    expect(screen.getByTitle('/products/{slug}')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('opens the Sessions tab on the sessions that started on the page', () => {
    renderPanel();

    const [first] = screen.getAllByTestId('digitalExperienceOverviewEntryPageSessionsLink');
    expect(first).toHaveAttribute('href', '/sessions?e=/');
    expect(sessionsHref).toHaveBeenCalledWith({ entryPage: '/' });
  });

  it('says what narrows it', () => {
    renderPanel();

    expect(screen.getByText(/leave this table whole/)).toBeInTheDocument();
  });

  it('shows an empty message without sessions, and a spinner while loading', () => {
    const { rerender } = renderPanel([]);
    expect(screen.getByTestId('digitalExperienceOverviewEntryPagesEmpty')).toBeInTheDocument();

    rerender(<EntryPagesPanel entryPages={[]} isLoading sessionsHref={sessionsHref} />);
    expect(screen.getByTestId('digitalExperienceOverviewEntryPagesLoading')).toBeInTheDocument();
  });
});
