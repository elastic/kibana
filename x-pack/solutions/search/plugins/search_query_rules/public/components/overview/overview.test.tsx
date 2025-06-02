/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { QueryRulesOverview } from './overview';
import { I18nProvider } from '@kbn/i18n-react';
import { useFetchQueryRulesSets } from '../../hooks/use_fetch_query_rules_sets';

jest.mock('../../hooks/use_fetch_query_rules_sets', () => ({
  useFetchQueryRulesSets: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    isError: true,
    error: { body: { statusCode: 500 } },
  })),
}));

describe('Query Rules Overview', () => {
  const queryClient = new QueryClient();
  const Wrapper = ({ children }: { children?: React.ReactNode }) => (
    <I18nProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </I18nProvider>
  );
  it('should show error prompt when we get a generic error', () => {
    render(
      <Wrapper>
        <QueryRulesOverview />
      </Wrapper>
    );

    expect(screen.getByText('An error occurred')).toBeInTheDocument();
  });

  it('should show error prompt when we get a missing permissions error', () => {
    (useFetchQueryRulesSets as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: { body: { statusCode: 403 } },
    });

    render(
      <Wrapper>
        <QueryRulesOverview />
      </Wrapper>
    );

    expect(screen.getByText('Missing permissions')).toBeInTheDocument();
  });
});
