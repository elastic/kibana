/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { CustomCellRenderer } from '@kbn/unified-data-table';
import { ThreatHuntingEntitiesTable } from './threat_hunting_entities_table';
import { TestProviders } from '../../../common/mock';
import type { AssetInventoryURLStateResult } from '../../../asset_inventory/hooks/use_asset_inventory_url_state/use_asset_inventory_url_state';
import { useInvestigateInTimeline } from '../../../common/hooks/timeline/use_investigate_in_timeline';
import { useUserPrivileges } from '../../../common/components/user_privileges';

jest.mock('../../../asset_inventory/components/asset_inventory_data_table', () => ({
  AssetInventoryDataTable: ({
    additionalCustomRenderers,
    state,
  }: {
    additionalCustomRenderers?: (rows: DataTableRecord[]) => CustomCellRenderer;
    state: AssetInventoryURLStateResult;
  }) => {
    // Mock implementation to test that additionalCustomRenderers is passed
    // Using string literals instead of ASSET_FIELDS constants to avoid Jest ESM transformation issues
    const entityNameField = 'entity.name';
    const entityRiskField = 'entity.risk';
    const assetCriticalityField = 'asset.criticality';

    const mockRows = [
      {
        flattened: {
          [entityNameField]: 'test-entity',
          [entityRiskField]: 75,
          [assetCriticalityField]: 'high_impact',
          'user.risk.calculated_score_norm': 75,
          'user.risk.calculated_level': 'High',
        },
        raw: {
          _source: {
            entity: {
              name: 'test-entity',
              EngineMetadata: { Type: 'user' },
              id: 'entity-123',
            },
          },
        },
      },
    ];
    const renderers = additionalCustomRenderers ? additionalCustomRenderers(mockRows) : {};
    return (
      <div data-test-subj="asset-inventory-data-table">
        {renderers[entityNameField] && (
          <div data-test-subj="entity-name-with-timeline">
            {renderers[entityNameField]({ rowIndex: 0, rows: mockRows })}
          </div>
        )}
        {renderers[entityRiskField] && (
          <div data-test-subj="risk-score-cell">
            {renderers[entityRiskField]({ rowIndex: 0, rows: mockRows })}
          </div>
        )}
      </div>
    );
  },
}));

jest.mock('../../../common/hooks/timeline/use_investigate_in_timeline', () => ({
  useInvestigateInTimeline: jest.fn(() => ({
    investigateInTimeline: jest.fn(),
  })),
}));

jest.mock('../../../common/components/user_privileges', () => ({
  useUserPrivileges: jest.fn(() => ({
    timelinePrivileges: { read: true },
  })),
}));

const mockUseInvestigateInTimeline = useInvestigateInTimeline as jest.Mock;
const mockUseUserPrivileges = useUserPrivileges as jest.Mock;

describe('ThreatHuntingEntitiesTable', () => {
  const mockState: AssetInventoryURLStateResult = {
    setUrlQuery: jest.fn(),
    sort: [],
    filters: [],
    pageFilters: [],
    query: { bool: { must: [], must_not: [], filter: [], should: [] } },
    pageIndex: 0,
    urlQuery: {
      query: { query: '', language: 'kuery' },
      filters: [],
    },
    setTableOptions: jest.fn(),
    handleUpdateQuery: jest.fn(),
    pageSize: 25,
    setPageSize: jest.fn(),
    onChangeItemsPerPage: jest.fn(),
    onChangePage: jest.fn(),
    onSort: jest.fn(),
    onResetFilters: jest.fn(),
    columnsLocalStorageKey: 'test',
    getRowsFromPages: jest.fn(() => []),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseInvestigateInTimeline.mockReturnValue({
      investigateInTimeline: jest.fn(),
    });
    mockUseUserPrivileges.mockReturnValue({
      timelinePrivileges: { read: true },
    });
  });

  it('should render the AssetInventoryDataTable', () => {
    render(
      <TestProviders>
        <ThreatHuntingEntitiesTable state={mockState} />
      </TestProviders>
    );

    expect(screen.getByTestId('asset-inventory-data-table')).toBeInTheDocument();
  });

  it('should add timeline icon to entity name column', () => {
    render(
      <TestProviders>
        <ThreatHuntingEntitiesTable state={mockState} />
      </TestProviders>
    );

    expect(screen.getByTestId('entity-name-with-timeline')).toBeInTheDocument();
    expect(screen.getByTestId('threat-hunting-timeline-icon')).toBeInTheDocument();
  });

  it('should render risk score with correct color scheme', () => {
    render(
      <TestProviders>
        <ThreatHuntingEntitiesTable state={mockState} />
      </TestProviders>
    );

    expect(screen.getByTestId('risk-score-cell')).toBeInTheDocument();
  });

  it('should call investigateInTimeline when timeline icon is clicked', () => {
    const mockInvestigateInTimeline = jest.fn();
    mockUseInvestigateInTimeline.mockReturnValue({
      investigateInTimeline: mockInvestigateInTimeline,
    });

    render(
      <TestProviders>
        <ThreatHuntingEntitiesTable state={mockState} />
      </TestProviders>
    );

    const timelineIcon = screen.getByTestId('threat-hunting-timeline-icon');
    fireEvent.click(timelineIcon);

    expect(mockInvestigateInTimeline).toHaveBeenCalled();
  });

  it('should not show timeline icon when user does not have timeline privileges', () => {
    mockUseUserPrivileges.mockReturnValue({
      timelinePrivileges: { read: false },
    });

    render(
      <TestProviders>
        <ThreatHuntingEntitiesTable state={mockState} />
      </TestProviders>
    );

    expect(screen.queryByTestId('threat-hunting-timeline-icon')).not.toBeInTheDocument();
  });
});
