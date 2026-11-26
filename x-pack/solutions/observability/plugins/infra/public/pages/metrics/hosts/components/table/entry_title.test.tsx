/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { focusEuiToolTipTrigger } from '@elastic/eui/lib/test/rtl';
import { I18nProvider } from '@kbn/i18n-react';
import { EntryTitle } from './entry_title';
import type { HostNodeRow } from '../../hooks/use_hosts_table';
import { useUnifiedSearchContext } from '../../hooks/use_unified_search';

jest.mock('../../hooks/use_unified_search');
jest.mock('@kbn/metrics-data-access-plugin/public', () => ({
  useAssetDetailsRedirect: () => ({
    getAssetDetailUrl: () => ({ href: '/host-details', onClick: jest.fn() }),
  }),
}));

const mockUseUnifiedSearchContext = useUnifiedSearchContext as jest.MockedFunction<
  typeof useUnifiedSearchContext
>;

const renderEntryTitle = (cloudProvider: HostNodeRow['title']['cloudProvider']) =>
  render(
    <EuiProvider>
      <I18nProvider>
        <EntryTitle onClick={jest.fn()} title={{ name: 'host-0', cloudProvider }} />
      </I18nProvider>
    </EuiProvider>
  );

describe('EntryTitle', () => {
  beforeEach(() => {
    mockUseUnifiedSearchContext.mockReturnValue({
      parsedDateRange: { from: '2024-01-01T00:00:00.000Z', to: '2024-01-01T01:00:00.000Z' },
      searchCriteria: {},
    } as unknown as ReturnType<typeof useUnifiedSearchContext>);
  });

  it('includes the host name and cloud provider in the link accessible name', () => {
    renderEntryTitle('aws');

    expect(
      screen.getByRole('link', { name: 'Open host details host-0, cloud provider aws' })
    ).toBeInTheDocument();
  });

  it('falls back to an unknown cloud provider', () => {
    renderEntryTitle(null);

    expect(
      screen.getByRole('link', { name: 'Open host details host-0, cloud provider Unknown' })
    ).toBeInTheDocument();
  });

  it('does not describe the link with the visible tooltip for screen readers', async () => {
    renderEntryTitle('aws');
    const link = screen.getByTestId('hostsViewTableEntryTitleLink');

    focusEuiToolTipTrigger(link);

    expect(await screen.findByText('aws: host-0')).toBeInTheDocument();
    expect(link).not.toHaveAttribute('aria-describedby');
  });
});
