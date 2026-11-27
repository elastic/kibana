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
import type { DataView } from '@kbn/data-views-plugin/public';
import { PageScope } from '../../../data_view_manager/constants';
import { useDataView } from '../../../data_view_manager/hooks/use_data_view';

jest.mock('../../../data_view_manager/hooks/use_data_view', () => ({
  useDataView: jest.fn(() => ({
    dataView: {
      id: 'security-default-dataview-id',
      fields: {
        getByName: jest.fn().mockReturnValue({
          toSpec: jest.fn().mockReturnValue({
            searchable: true,
            aggregatable: true,
          }),
        }),
      },
    },
  })),
}));

jest.mock('../../hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn(() => false),
}));

const mockUseDataView = useDataView as jest.Mock;
const MockCellActions = CellActions as jest.Mocked<typeof CellActions>;
jest.mock('@kbn/cell-actions', () => ({
  ...jest.requireActual('@kbn/cell-actions'),
  CellActions: jest.fn(() => <div data-test-subj="cell-actions-component" />),
}));

/** The props CellActions was rendered with, on its first call */
const firstCellActionsProps = () => (CellActions as unknown as jest.Mock).mock.calls[0][0];

const mockDataViewId = 'security-default-dataview-id';

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
        data: [{ field: { aggregatable: true, searchable: true }, value: 'fieldValue' }],
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

  describe('data view', () => {
    const providedDataViewId = 'provided-data-view-id';
    const providedDataView = {
      id: providedDataViewId,
      fields: {
        getByName: jest.fn().mockReturnValue({
          toSpec: jest.fn().mockReturnValue({ searchable: true, aggregatable: false }),
        }),
      },
    } as unknown as DataView;

    describe('when a data view is provided', () => {
      it('should not retrieve a data view', () => {
        render(
          <SecurityCellActions {...defaultProps} data={mockData} dataView={providedDataView}>
            <div />
          </SecurityCellActions>
        );

        expect(mockUseDataView).not.toHaveBeenCalled();
      });

      it('should use the provided data view for the field spec and the metadata', () => {
        render(
          <SecurityCellActions
            {...defaultProps}
            data={mockData}
            metadata={mockMetadata}
            dataView={providedDataView}
          >
            <div />
          </SecurityCellActions>
        );

        expect(MockCellActions).toHaveBeenCalledWith(
          expect.objectContaining({
            data: [{ field: { aggregatable: false, searchable: true }, value: 'fieldValue' }],
            metadata: { ...mockMetadata, dataViewId: providedDataViewId },
          }),
          {}
        );
      });

      it('should render CellActions from the first render', () => {
        const result = render(
          <SecurityCellActions {...defaultProps} data={mockData} dataView={providedDataView}>
            <div />
          </SecurityCellActions>
        );

        expect(result.queryByTestId('cell-actions-component')).toBeInTheDocument();
        expect(MockCellActions).toHaveBeenCalledTimes(1);
      });

      it('should render the children without CellActions when the field is not in the data view', () => {
        const dataViewWithoutField = {
          id: providedDataViewId,
          fields: { getByName: jest.fn().mockReturnValue(undefined) },
        } as unknown as DataView;

        const result = render(
          <SecurityCellActions {...defaultProps} data={mockData} dataView={dataViewWithoutField}>
            <div>{'Test Children'}</div>
          </SecurityCellActions>
        );

        expect(result.queryByTestId('cell-actions-component')).not.toBeInTheDocument();
        expect(result.queryByText('Test Children')).toBeInTheDocument();
      });

      it('should not pass the data view or the scope down to CellActions', () => {
        render(
          <SecurityCellActions
            {...defaultProps}
            data={mockData}
            dataView={providedDataView}
            sourcererScopeId={PageScope.alerts}
          >
            <div />
          </SecurityCellActions>
        );

        const props = firstCellActionsProps();
        expect(props).not.toHaveProperty('dataView');
        expect(props).not.toHaveProperty('sourcererScopeId');
      });
    });

    describe('when no data view is provided', () => {
      it('should retrieve the data view of the default scope', () => {
        render(
          <SecurityCellActions {...defaultProps} data={mockData}>
            <div />
          </SecurityCellActions>
        );

        expect(mockUseDataView).toHaveBeenCalledWith(PageScope.default);
      });

      it('should retrieve the data view of the given scope', () => {
        render(
          <SecurityCellActions
            {...defaultProps}
            data={mockData}
            sourcererScopeId={PageScope.alerts}
          >
            <div />
          </SecurityCellActions>
        );

        expect(mockUseDataView).toHaveBeenCalledWith(PageScope.alerts);
      });

      it('should not pass the scope down to CellActions', () => {
        render(
          <SecurityCellActions
            {...defaultProps}
            data={mockData}
            sourcererScopeId={PageScope.alerts}
          >
            <div />
          </SecurityCellActions>
        );

        expect(firstCellActionsProps()).not.toHaveProperty('sourcererScopeId');
      });
    });
  });
});
