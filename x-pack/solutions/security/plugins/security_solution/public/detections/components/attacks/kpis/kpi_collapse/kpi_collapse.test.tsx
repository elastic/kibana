/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { TestProviders } from '../../../../../common/mock';
import { KpiCollapse } from './kpi_collapse';
import * as i18n from '../kpi_view_select/translations';

describe('<KpiCollapse />', () => {
  it('renders Summary label when kpiViewSelection is summary', () => {
    render(
      <TestProviders>
        <KpiCollapse kpiViewSelection="summary" />
      </TestProviders>
    );

    expect(screen.getByTestId('kpi-collapse-view-label')).toHaveTextContent(i18n.SUMMARY);
  });

  it('renders Trends label when kpiViewSelection is trend', () => {
    render(
      <TestProviders>
        <KpiCollapse kpiViewSelection="trend" />
      </TestProviders>
    );

    expect(screen.getByTestId('kpi-collapse-view-label')).toHaveTextContent(i18n.TREND);
  });

  it('renders Count label when kpiViewSelection is count', () => {
    render(
      <TestProviders>
        <KpiCollapse kpiViewSelection="count" />
      </TestProviders>
    );

    expect(screen.getByTestId('kpi-collapse-view-label')).toHaveTextContent(i18n.COUNT);
  });

  it('renders Treemap label when kpiViewSelection is treemap', () => {
    render(
      <TestProviders>
        <KpiCollapse kpiViewSelection="treemap" />
      </TestProviders>
    );

    expect(screen.getByTestId('kpi-collapse-view-label')).toHaveTextContent(i18n.TREEMAP);
  });
});
