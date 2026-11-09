/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { LogViewStatus } from '@kbn/logs-shared-plugin/common';
import { CategoriesPageTemplate } from './page_content';

const mockUseLogViewContext = jest.fn();

jest.mock('@kbn/logs-shared-plugin/public', () => ({
  ...jest.requireActual('@kbn/logs-shared-plugin/public'),
  useLogViewContext: () => mockUseLogViewContext(),
}));

// `LogsPageTemplate` decides between the onboarding no-data page and the page body from `hasData`
// (covered by `../shared/page_template.test.tsx`), so here we only check the value we pass to it.
jest.mock('../shared/page_template', () => ({
  LogsPageTemplate: ({ hasData, children }: { hasData?: boolean; children?: React.ReactNode }) => (
    <div data-test-subj="logsPageTemplate" data-has-data={String(hasData)}>
      {children}
    </div>
  ),
}));

const renderWithLogViewStatus = (logViewStatus?: LogViewStatus) => {
  mockUseLogViewContext.mockReturnValue({ logViewStatus });

  render(
    <CategoriesPageTemplate>
      <div data-test-subj="categoriesPageBody" />
    </CategoriesPageTemplate>
  );
};

describe('CategoriesPageTemplate', () => {
  it('reports no data when the log view indices are missing', () => {
    renderWithLogViewStatus({ index: 'missing' });

    expect(screen.getByTestId('logsPageTemplate')).toHaveAttribute('data-has-data', 'false');
  });

  it.each(['empty', 'available'] as const)(
    'reports data when the log view indices are %s',
    (index) => {
      renderWithLogViewStatus({ index });

      expect(screen.getByTestId('logsPageTemplate')).toHaveAttribute('data-has-data', 'true');
      expect(screen.getByTestId('categoriesPageBody')).toBeInTheDocument();
    }
  );

  it('reports data while the log view status is still unknown', () => {
    renderWithLogViewStatus(undefined);

    expect(screen.getByTestId('logsPageTemplate')).toHaveAttribute('data-has-data', 'true');
  });

  it('lets an explicit hasData prop override the log view status', () => {
    mockUseLogViewContext.mockReturnValue({ logViewStatus: { index: 'available' } });

    render(<CategoriesPageTemplate hasData={false} />);

    expect(screen.getByTestId('logsPageTemplate')).toHaveAttribute('data-has-data', 'false');
  });
});
