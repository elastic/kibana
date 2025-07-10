/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AdditionalToolbarControls } from './additional_toolbar_controls';
import { TableId } from '@kbn/securitysolution-data-table';
import { fireEvent, render, screen } from '@testing-library/react';
import { createMockStore, mockGlobalState, TestProviders } from '../../../../common/mock';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import type { DataView } from '@kbn/data-views-plugin/common';
import { createStubDataView } from '@kbn/data-views-plugin/common/data_views/data_view.stub';

const mockDispatch = jest.fn();
jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');
  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});
jest.mock('../../../../common/hooks/use_selector');

const dataView: DataView = createStubDataView({ spec: {} });
const mockOptions = [
  { label: 'ruleName', key: 'kibana.alert.rule.name' },
  { label: 'userName', key: 'user.name' },
  { label: 'hostName', key: 'host.name' },
  { label: 'sourceIP', key: 'source.ip' },
];
const tableId = TableId.alertsOnAlertSummaryPage;

const groups = {
  [tableId]: { options: mockOptions, activeGroups: ['kibana.alert.rule.name'] },
};

describe('AdditionalToolbarControls', () => {
  beforeEach(() => {
    (useDeepEqualSelector as jest.Mock).mockImplementation(() => groups[tableId]);
  });

  test('should render the group selector component and allow the user to select a grouping field', () => {
    const store = createMockStore({
      ...mockGlobalState,
      groups,
    });
    render(
      <TestProviders store={store}>
        <AdditionalToolbarControls dataView={dataView} />
      </TestProviders>
    );

    fireEvent.click(screen.getByTestId('group-selector-dropdown'));
    fireEvent.click(screen.getByTestId('panel-user.name'));
    expect(mockDispatch.mock.calls[0][0].payload).toEqual({
      activeGroups: ['user.name'],
      tableId,
    });
  });
});
