/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '../../../utils/test_helper';
import { ALERT_CASE_IDS } from '@kbn/rule-data-utils';
import { CaseLinks } from './case_links';

const cases = [
  { id: 'case-1', title: 'Case One', url: '/app/observability/cases/case-1' },
  { id: 'case-2', title: 'Case Two', url: '/app/observability/cases/case-2' },
];

jest.mock('../hooks/use_case_links', () => ({
  useCaseLinks: jest.fn(() => ({
    firstCaseLink: '/app/observability/cases/case-1',
    casesOverviewLink: '/app/observability/cases',
  })),
}));

jest.mock('../../../hooks/use_fetch_bulk_cases', () => ({
  useFetchBulkCases: jest.fn(() => ({
    cases,
  })),
}));

import { useFetchBulkCases } from '../../../hooks/use_fetch_bulk_cases';

describe('CaseLinks', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders a list of case links', () => {
    const { getByText, getAllByRole } = render(
      <CaseLinks
        alert={{
          // @ts-expect-error incomplete impelmentation
          fields: {
            [ALERT_CASE_IDS]: ['case-1', 'case-2'],
          },
        }}
      />
    );
    expect(getByText('Case One')).toBeInTheDocument();
    expect(getByText('+ 1 more')).toBeInTheDocument();
    expect(getAllByRole('link')).toHaveLength(2);
    expect(getByText('Case One').closest('a')).toHaveAttribute(
      'href',
      '/app/observability/cases/case-1'
    );
    expect(getByText('+ 1 more').closest('a')).toHaveAttribute('href', '/app/observability/cases');
  });

  it('renders nothing if cases is empty', () => {
    (useFetchBulkCases as jest.Mock).mockReset();
    (useFetchBulkCases as jest.Mock).mockReturnValue({
      cases: [],
      isLoading: false,
    });
    const { container } = render(
      <CaseLinks
        alert={{
          // @ts-expect-error incomplete impelmentation
          fields: {
            [ALERT_CASE_IDS]: ['case-1', 'case-2'],
          },
        }}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing if cases is undefined', () => {
    (useFetchBulkCases as jest.Mock).mockReset();
    (useFetchBulkCases as jest.Mock).mockReturnValue({
      cases: undefined,
      isLoading: false,
    });
    // @ts-expect-error
    const { container } = render(<CaseLinks />);
    expect(container).toBeEmptyDOMElement();
  });
});
