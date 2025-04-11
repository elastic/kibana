/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { SummaryTable } from './summary_table';
import type { ProcessListAPIResponse } from '../../../../../common/http_api';

const renderSummaryTable = ({
  processSummary,
}: {
  processSummary: ProcessListAPIResponse['summary'];
}) =>
  render(
    <IntlProvider locale="en">
      <SummaryTable processSummary={processSummary} isLoading={false} />
    </IntlProvider>
  );

describe('Processes Table', () => {
  it('should return process table with 5 processes', () => {
    const processSummary = {
      running: 10,
      sleeping: 10,
      stopped: 10,
      dead: 10,
      idle: 10,
      zombie: 10,
      unknown: 10,
      total: 70,
    };
    const result = renderSummaryTable({ processSummary });

    expect(result.queryAllByTestId('infraAssetDetailsProcessesSummaryTableItem')).toHaveLength(8);
    expect(result.getByText('70')).toBeInTheDocument();
    const summaryElements = result.getAllByText('10');
    expect(summaryElements).toHaveLength(7);
  });

  it('should return N/A for the elements that are not available and values if available', () => {
    const processSummary = { running: 10, total: 10 };
    const result = renderSummaryTable({ processSummary });
    expect(result.queryAllByTestId('infraAssetDetailsProcessesSummaryTableItem')).toHaveLength(8);
    const summaryNaElements = result.getAllByText('N/A');
    expect(summaryNaElements).toHaveLength(6);
  });

  it('should return N/A for all the elements is summary is not available', () => {
    const processSummary = {};
    const result = renderSummaryTable({ processSummary });
    expect(result.queryAllByTestId('infraAssetDetailsProcessesSummaryTableItem')).toHaveLength(8);
    const summaryNaElements = result.getAllByText('N/A');
    expect(summaryNaElements).toHaveLength(8);
  });
});
