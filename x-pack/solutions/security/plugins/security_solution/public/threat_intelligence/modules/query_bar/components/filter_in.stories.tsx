/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { StoryFn } from '@storybook/react';
import type { EuiDataGridColumn } from '@elastic/eui';
import { EuiContextMenuPanel, EuiDataGrid } from '@elastic/eui';
import type { EuiDataGridColumnVisibility } from '@elastic/eui/src/components/datagrid/data_grid_types';
import { mockIndicatorsFiltersContext } from '../../../mocks/mock_indicators_filters_context';
import { IndicatorsFiltersContext } from '../../indicators/hooks/use_filters_context';
import type { Indicator } from '../../../../../common/threat_intelligence/types/indicator';
import { generateMockIndicator } from '../../../../../common/threat_intelligence/types/indicator';
import { FilterInButtonIcon, FilterInCellAction, FilterInContextMenu } from './filter_in';

export default {
  title: 'FilterIn',
};

export const ButtonIcon: StoryFn = () => {
  const mockIndicator: Indicator = generateMockIndicator();
  const mockField: string = 'threat.feed.name';

  return (
    <IndicatorsFiltersContext.Provider value={mockIndicatorsFiltersContext}>
      <FilterInButtonIcon data={mockIndicator} field={mockField} />
    </IndicatorsFiltersContext.Provider>
  );
};

export const ContextMenu: StoryFn = () => {
  const mockIndicator: Indicator = generateMockIndicator();
  const mockField: string = 'threat.feed.name';
  const items = [<FilterInContextMenu data={mockIndicator} field={mockField} />];

  return (
    <IndicatorsFiltersContext.Provider value={mockIndicatorsFiltersContext}>
      <EuiContextMenuPanel items={items} />
    </IndicatorsFiltersContext.Provider>
  );
};

export const DataGrid: StoryFn = () => {
  const mockIndicator: Indicator = generateMockIndicator();
  const mockField: string = 'threat.feed.name';
  const columnId: string = '1';
  const columns: EuiDataGridColumn[] = [
    {
      id: columnId,
      cellActions: [
        ({ Component }) => (
          <FilterInCellAction data={mockIndicator} field={mockField} Component={Component} />
        ),
      ],
    },
  ];
  const columnVisibility: EuiDataGridColumnVisibility = {
    visibleColumns: [columnId],
    setVisibleColumns: () => window.alert('setVisibleColumns'),
  };
  const rowCount: number = 1;
  const renderCellValue = () => <></>;

  return (
    <IndicatorsFiltersContext.Provider value={mockIndicatorsFiltersContext}>
      <EuiDataGrid
        aria-labelledby="test"
        columns={columns}
        columnVisibility={columnVisibility}
        rowCount={rowCount}
        renderCellValue={renderCellValue}
      />
    </IndicatorsFiltersContext.Provider>
  );
};
