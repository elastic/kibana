/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { InvestigationList } from './investigation_list';

const renderList = ({
  isInitialLoading = false,
  page = 1,
  onPageChange = jest.fn(),
}: {
  isInitialLoading?: boolean;
  page?: number;
  onPageChange?: (page: number) => void;
} = {}) =>
  render(
    <I18nProvider>
      <InvestigationList
        investigations={[]}
        total={0}
        isInitialLoading={isInitialLoading}
        page={page}
        onPageChange={onPageChange}
      />
    </I18nProvider>
  );

describe('InvestigationList', () => {
  it('shows a skeleton instead of the empty state during the initial load', () => {
    renderList({ isInitialLoading: true });

    expect(screen.getByTestId('nightshiftInvestigationListSkeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('nightshiftInvestigationsCount')).not.toBeInTheDocument();
    expect(screen.queryByText('No investigations found')).not.toBeInTheDocument();
  });

  it('shows the empty state after an empty initial response', () => {
    renderList();

    expect(screen.queryByTestId('nightshiftInvestigationListSkeleton')).not.toBeInTheDocument();
    expect(screen.getByTestId('nightshiftInvestigationsCount')).toHaveTextContent('0');
    expect(screen.getByText('No investigations found')).toBeInTheDocument();
  });

  it('allows returning from an empty later page', () => {
    const onPageChange = jest.fn();
    renderList({ page: 2, onPageChange });

    fireEvent.click(screen.getByTestId('nightshiftInvestigationsPrevPageButton'));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });
});
