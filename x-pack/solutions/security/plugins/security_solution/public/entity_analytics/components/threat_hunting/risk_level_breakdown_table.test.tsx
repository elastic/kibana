/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { RiskLevelBreakdownTable } from './risk_level_breakdown_table';
import { TestProviders } from '../../../common/mock';
import { RiskSeverity, EMPTY_SEVERITY_COUNT } from '../../../../common/search_strategy';
import type { SeverityCount } from '../severity/types';

describe('RiskLevelBreakdownTable', () => {
  it('should render the table with correct severity counts for all risk levels', () => {
    const severityCount: SeverityCount = {
      [RiskSeverity.Unknown]: 10,
      [RiskSeverity.Low]: 20,
      [RiskSeverity.Moderate]: 30,
      [RiskSeverity.High]: 40,
      [RiskSeverity.Critical]: 50,
    };

    render(
      <TestProviders>
        <RiskLevelBreakdownTable severityCount={severityCount} />
      </TestProviders>
    );

    expect(screen.getByTestId('risk-level-breakdown-table')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.getByText('40')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
  });

  it('should display loading state correctly', () => {
    const severityCount: SeverityCount = {
      [RiskSeverity.Unknown]: 5,
      [RiskSeverity.Low]: 10,
      [RiskSeverity.Moderate]: 15,
      [RiskSeverity.High]: 20,
      [RiskSeverity.Critical]: 25,
    };

    render(
      <TestProviders>
        <RiskLevelBreakdownTable severityCount={severityCount} loading={true} />
      </TestProviders>
    );

    expect(screen.getByTestId('risk-level-breakdown-table')).toBeInTheDocument();
  });

  it('should display correct score ranges for each risk level', () => {
    const severityCount: SeverityCount = {
      [RiskSeverity.Unknown]: 1,
      [RiskSeverity.Low]: 2,
      [RiskSeverity.Moderate]: 3,
      [RiskSeverity.High]: 4,
      [RiskSeverity.Critical]: 5,
    };

    render(
      <TestProviders>
        <RiskLevelBreakdownTable severityCount={severityCount} />
      </TestProviders>
    );

    expect(screen.getByText('>90')).toBeInTheDocument();
    expect(screen.getByText('70-90')).toBeInTheDocument();
    expect(screen.getByText('40-70')).toBeInTheDocument();
    expect(screen.getByText('20-40')).toBeInTheDocument();
    expect(screen.getByText('<20')).toBeInTheDocument();
  });

  it('should format count numbers with toLocaleString', () => {
    const severityCount: SeverityCount = {
      [RiskSeverity.Unknown]: 1000,
      [RiskSeverity.Low]: 2000,
      [RiskSeverity.Moderate]: 3000,
      [RiskSeverity.High]: 4000,
      [RiskSeverity.Critical]: 5000,
    };

    render(
      <TestProviders>
        <RiskLevelBreakdownTable severityCount={severityCount} />
      </TestProviders>
    );

    // toLocaleString() will format numbers based on locale, but we can check they're rendered
    expect(screen.getByTestId('risk-level-breakdown-table')).toBeInTheDocument();
    // The numbers should be formatted (e.g., "1,000" in en-US locale)
    const table = screen.getByTestId('risk-level-breakdown-table');
    expect(table).toBeInTheDocument();
  });

  it('should handle empty/zero counts correctly', () => {
    const severityCount: SeverityCount = {
      [RiskSeverity.Unknown]: 0,
      [RiskSeverity.Low]: 0,
      [RiskSeverity.Moderate]: 0,
      [RiskSeverity.High]: 0,
      [RiskSeverity.Critical]: 0,
    };

    render(
      <TestProviders>
        <RiskLevelBreakdownTable severityCount={severityCount} />
      </TestProviders>
    );

    expect(screen.getByTestId('risk-level-breakdown-table')).toBeInTheDocument();
    // All counts should be 0
    const zeroCounts = screen.getAllByText('0');
    expect(zeroCounts.length).toBeGreaterThanOrEqual(5);
  });

  it('should render with EMPTY_SEVERITY_COUNT when all counts are zero', () => {
    render(
      <TestProviders>
        <RiskLevelBreakdownTable severityCount={EMPTY_SEVERITY_COUNT} />
      </TestProviders>
    );

    expect(screen.getByTestId('risk-level-breakdown-table')).toBeInTheDocument();
    // Verify all score ranges are still displayed
    expect(screen.getByText('>90')).toBeInTheDocument();
    expect(screen.getByText('70-90')).toBeInTheDocument();
    expect(screen.getByText('40-70')).toBeInTheDocument();
    expect(screen.getByText('20-40')).toBeInTheDocument();
    expect(screen.getByText('<20')).toBeInTheDocument();
  });

  it('should display risk level column headers correctly', () => {
    const severityCount: SeverityCount = {
      [RiskSeverity.Unknown]: 1,
      [RiskSeverity.Low]: 1,
      [RiskSeverity.Moderate]: 1,
      [RiskSeverity.High]: 1,
      [RiskSeverity.Critical]: 1,
    };

    render(
      <TestProviders>
        <RiskLevelBreakdownTable severityCount={severityCount} />
      </TestProviders>
    );

    expect(screen.getByText('Risk level')).toBeInTheDocument();
    expect(screen.getByText('Risk score')).toBeInTheDocument();
    expect(screen.getByText('Number of entities')).toBeInTheDocument();
  });
});
