/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { CellActionsMode, SecurityCellActions } from '.';
import { CellActions } from '@kbn/cell-actions';
import { SECURITY_CELL_ACTIONS_DEFAULT } from '@kbn/ui-actions-plugin/common/trigger_ids';

jest.mock('../../../data_view_manager/hooks/use_data_view', () => ({
  useDataView: jest.fn(() => ({
    dataView: { id: 'security-default-dataview-id', fields: { getByName: jest.fn() } },
  })),
}));

jest.mock('../../hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn(() => false),
}));

const MockCellActions = CellActions as jest.Mocked<typeof CellActions>;
jest.mock('@kbn/cell-actions', () => ({
  ...jest.requireActual('@kbn/cell-actions'),
  CellActions: jest.fn(() => <div data-test-subj="cell-actions-component" />),
}));

const mockFieldSpec = { someFieldSpec: 'theFieldSpec' };
const mockGetFieldSpec = jest.fn((_: string) => mockFieldSpec);
const mockUseGetFieldSpec = jest.fn((_: unknown) => mockGetFieldSpec);
jest.mock('../../hooks/use_get_field_spec', () => ({
  useGetFieldSpec: (param: unknown) => mockUseGetFieldSpec(param),
}));
const mockDataViewId = 'security-default-dataview-id';
const mockUseDataViewId = jest.fn((_: unknown) => mockDataViewId);
jest.mock('../../hooks/use_data_view_id', () => ({
  useDataViewId: (param: unknown) => mockUseDataViewId(param),
}));

const defaultProps = {
  triggerId: SECURITY_CELL_ACTIONS_DEFAULT,
  mode: CellActionsMode.INLINE,
};
const mockData = [{ field: 'fieldName', value: 'fieldValue' }];
const mockMetadata = { someMetadata: 'value' };

describe('SecurityCellActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render CellActions component when data is not empty', () => {
    const result = render(
      <SecurityCellActions {...defaultProps} data={mockData}>
        <div />
      </SecurityCellActions>
    );

    expect(result.queryByTestId('cell-actions-component')).toBeInTheDocument();
  });

  it('should render children without CellActions component when data is empty', () => {
    const result = render(
      <SecurityCellActions {...defaultProps} data={[]}>
        <div>{'Test Children'}</div>
      </SecurityCellActions>
    );

    expect(result.queryByTestId('cell-actions-component')).not.toBeInTheDocument();
    expect(result.queryByText('Test Children')).toBeInTheDocument();
  });

  it('should render CellActions component with correct props', () => {
    render(
      <SecurityCellActions {...defaultProps} data={mockData}>
        <div />
      </SecurityCellActions>
    );

    expect(MockCellActions).toHaveBeenCalledWith(expect.objectContaining(defaultProps), {});
  });

  it('should render CellActions with the correct field spec in the data', () => {
    render(
      <SecurityCellActions {...defaultProps} data={mockData}>
        <div />
      </SecurityCellActions>
    );

    expect(MockCellActions).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [{ field: mockFieldSpec, value: 'fieldValue' }],
      }),
      {}
    );
  });

  it('should render CellActions with the correct dataViewId in the metadata', () => {
    render(
      <SecurityCellActions {...defaultProps} data={mockData} metadata={mockMetadata}>
        <div />
      </SecurityCellActions>
    );

    expect(MockCellActions).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { ...mockMetadata, dataViewId: mockDataViewId },
      }),
      {}
    );
  });
});
