/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { fromKueryExpression, KQLSyntaxError } from '@kbn/es-query';
import { useUnifiedSearchContext } from '../hooks/use_unified_search';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import { HostsContent } from './hosts_content';

jest.mock('../hooks/use_unified_search');
jest.mock('../../../../hooks/use_kibana');
jest.mock('../hooks/use_hosts_view', () => ({
  HostsViewProvider: ({ children }: React.PropsWithChildren) => children,
}));
jest.mock('../hooks/use_hosts_table', () => ({
  HostsTableProvider: ({ children }: React.PropsWithChildren) => children,
}));
jest.mock('../hooks/use_host_count', () => ({
  HostCountProvider: ({ children }: React.PropsWithChildren) => children,
}));
jest.mock('../hooks/use_alerts_query', () => ({
  AlertsQueryProvider: ({ children }: React.PropsWithChildren) => children,
}));
jest.mock('./kpis/kpi_grid', () => ({
  KPIGrid: () => <div data-test-subj="hostsKpiGrid" />,
}));
jest.mock('./hosts_table', () => ({
  HostsTable: () => <div data-test-subj="hostsTable" />,
}));
jest.mock('./tabs/tabs', () => ({
  Tabs: () => <div data-test-subj="hostsTabs" />,
}));

const mockUseUnifiedSearchContext = useUnifiedSearchContext as jest.MockedFunction<
  typeof useUnifiedSearchContext
>;
const mockUseKibanaContextForPlugin = useKibanaContextForPlugin as jest.MockedFunction<
  typeof useKibanaContextForPlugin
>;

const renderContent = () =>
  render(
    <I18nProvider>
      <HostsContent />
    </I18nProvider>
  );

describe('HostsContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKibanaContextForPlugin.mockReturnValue({
      services: { notifications: { showErrorDialog: jest.fn() } },
    } as unknown as ReturnType<typeof useKibanaContextForPlugin>);
  });

  it('renders the hosts content when the query is valid', () => {
    mockUseUnifiedSearchContext.mockReturnValue({
      error: null,
    } as ReturnType<typeof useUnifiedSearchContext>);

    renderContent();

    expect(screen.getByTestId('hostsKpiGrid')).toBeInTheDocument();
    expect(screen.getByTestId('hostsTable')).toBeInTheDocument();
    expect(screen.getByTestId('hostsTabs')).toBeInTheDocument();
    expect(screen.queryByTestId('hostsViewErrorCallout')).not.toBeInTheDocument();
  });

  it('renders an invalid KQL callout instead of the hosts content', () => {
    let error: KQLSyntaxError;
    try {
      fromKueryExpression('host.name: (');
      throw new Error('Expected fromKueryExpression to throw');
    } catch (e) {
      if (!(e instanceof KQLSyntaxError)) {
        throw e;
      }
      error = e;
    }
    mockUseUnifiedSearchContext.mockReturnValue({
      error,
    } as unknown as ReturnType<typeof useUnifiedSearchContext>);

    renderContent();

    expect(screen.getByTestId('hostsViewErrorCallout')).toBeInTheDocument();
    expect(screen.getByText('Invalid KQL expression')).toBeInTheDocument();
    expect(screen.getByTestId('hostsViewErrorDetailsButton')).toBeInTheDocument();
    expect(screen.queryByTestId('hostsKpiGrid')).not.toBeInTheDocument();
    expect(screen.queryByTestId('hostsTable')).not.toBeInTheDocument();
    expect(screen.queryByTestId('hostsTabs')).not.toBeInTheDocument();
  });
});
