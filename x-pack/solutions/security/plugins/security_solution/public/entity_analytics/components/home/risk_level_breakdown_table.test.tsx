/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { CellActionsProps } from '@kbn/cell-actions';
import { ENTITY_RISK_LEVEL_FIELD, RiskLevelBreakdownTable } from './risk_level_breakdown_table';
import { TestProviders } from '../../../common/mock';
import { RiskSeverity, EMPTY_SEVERITY_COUNT } from '../../../../common/search_strategy';
import type { SeverityCount } from '../severity/types';

jest.mock('@kbn/cell-actions', () => {
  const actual = jest.requireActual('@kbn/cell-actions');
  return {
    ...actual,
    CellActions: ({ data, metadata }: CellActionsProps) => {
      const entry = Array.isArray(data) ? data[0] : data;
      return (
        <div
          data-test-subj="mock-cell-actions"
          data-field={entry?.field?.name}
          data-value={entry?.value as string}
          data-dataviewid={(metadata as { dataViewId?: string } | undefined)?.dataViewId}
        />
      );
    },
  };
});

const buildEntityDataView = (): DataView => {
  const fieldSpec = {
    name: ENTITY_RISK_LEVEL_FIELD,
    type: 'string',
    searchable: true,
    aggregatable: true,
  };
  return {
    id: 'entity-store-dv-id',
    fields: {
      getByName: jest.fn((name: string) => {
        if (name !== ENTITY_RISK_LEVEL_FIELD) return undefined;
        return {
          ...fieldSpec,
          toSpec: () => fieldSpec,
        };
      }),
    },
  } as unknown as DataView;
};

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

  it('should display the score range in a dedicated column for each risk level', () => {
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

    expect(screen.getAllByTestId('riskLevelBreakdownTable-scoreRange')).toHaveLength(5);
  });

  it('should format count numbers with getAbbreviatedNumber when they are >= 1000', () => {
    const severityCount: SeverityCount = {
      [RiskSeverity.Unknown]: 1000,
      [RiskSeverity.Low]: 2500,
      [RiskSeverity.Moderate]: 3000,
      [RiskSeverity.High]: 4000,
      [RiskSeverity.Critical]: 5000,
    };

    render(
      <TestProviders>
        <RiskLevelBreakdownTable severityCount={severityCount} />
      </TestProviders>
    );

    expect(screen.getByTestId('risk-level-breakdown-table')).toBeInTheDocument();
    expect(screen.getByText('1.0k')).toBeInTheDocument();
    expect(screen.getByText('2.5k')).toBeInTheDocument();
    expect(screen.getByText('3.0k')).toBeInTheDocument();
    expect(screen.getByText('4.0k')).toBeInTheDocument();
    expect(screen.getByText('5.0k')).toBeInTheDocument();
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
    expect(screen.getByText('>90')).toBeInTheDocument();
    expect(screen.getByText('70-90')).toBeInTheDocument();
    expect(screen.getByText('40-70')).toBeInTheDocument();
    expect(screen.getByText('20-40')).toBeInTheDocument();
    expect(screen.getByText('<20')).toBeInTheDocument();
  });

  it('should display Risk level, Risk score and Entities column headers', () => {
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
    expect(screen.getByText('Entities')).toBeInTheDocument();
  });

  it('should not render CellActions when no entityDataView is provided', () => {
    render(
      <TestProviders>
        <RiskLevelBreakdownTable severityCount={EMPTY_SEVERITY_COUNT} />
      </TestProviders>
    );

    expect(screen.queryAllByTestId('mock-cell-actions')).toHaveLength(0);
  });

  it('should not render CellActions when the entityDataView does not expose the risk level field', () => {
    const emptyDataView = {
      id: 'empty-dv',
      fields: {
        getByName: jest.fn().mockReturnValue(undefined),
      },
    } as unknown as DataView;

    render(
      <TestProviders>
        <RiskLevelBreakdownTable
          severityCount={EMPTY_SEVERITY_COUNT}
          entityDataView={emptyDataView}
        />
      </TestProviders>
    );

    expect(screen.queryAllByTestId('mock-cell-actions')).toHaveLength(0);
  });

  it('should render a CellActions cell per row using the resolved entity data view field spec', () => {
    const severityCount: SeverityCount = {
      [RiskSeverity.Unknown]: 1,
      [RiskSeverity.Low]: 2,
      [RiskSeverity.Moderate]: 3,
      [RiskSeverity.High]: 4,
      [RiskSeverity.Critical]: 5,
    };

    render(
      <TestProviders>
        <RiskLevelBreakdownTable
          severityCount={severityCount}
          entityDataView={buildEntityDataView()}
        />
      </TestProviders>
    );

    const cellActions = screen.getAllByTestId('mock-cell-actions');
    expect(cellActions).toHaveLength(5);

    cellActions.forEach((el) => {
      expect(el).toHaveAttribute('data-field', ENTITY_RISK_LEVEL_FIELD);
      expect(el).toHaveAttribute('data-dataviewid', 'entity-store-dv-id');
    });
    expect(cellActions.map((el) => el.getAttribute('data-value'))).toEqual(
      expect.arrayContaining([
        RiskSeverity.Critical,
        RiskSeverity.High,
        RiskSeverity.Moderate,
        RiskSeverity.Low,
        RiskSeverity.Unknown,
      ])
    );
  });
});
