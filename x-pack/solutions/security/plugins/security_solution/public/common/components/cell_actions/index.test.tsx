/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mocked } from 'vitest';

import React from 'react';
import { render } from '@testing-library/react';
import { CellActionsMode, SecurityCellActions } from '.';
import { CellActions } from '@kbn/cell-actions';
import { SECURITY_CELL_ACTIONS_DEFAULT } from '@kbn/ui-actions-plugin/common/trigger_ids';

vi.mock('../../../data_view_manager/hooks/use_data_view', () => {
  const mocked = {
    useDataView: vi.fn(() => ({
      dataView: {
        id: 'security-default-dataview-id',
        fields: {
          getByName: vi.fn().mockReturnValue({
            toSpec: vi.fn().mockReturnValue({
              searchable: true,
              aggregatable: true,
            }),
          }),
        },
      },
    })),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../hooks/use_experimental_features', () => {
  const mocked = {
    useIsExperimentalFeatureEnabled: vi.fn(() => false),
  };
  return { ...mocked, default: mocked };
});

const MockCellActions = CellActions as Mocked<typeof CellActions>;
vi.mock('@kbn/cell-actions', async () => {
  const mocked = {
    ...(await vi.importActual('@kbn/cell-actions')),
    CellActions: vi.fn(() => <div data-test-subj="cell-actions-component" />),
  };
  return { ...mocked, default: mocked };
});

const mockDataViewId = 'security-default-dataview-id';

const defaultProps = {
  triggerId: SECURITY_CELL_ACTIONS_DEFAULT,
  mode: CellActionsMode.INLINE,
};
const mockData = [{ field: 'fieldName', value: 'fieldValue' }];
const mockMetadata = { someMetadata: 'value' };

describe('SecurityCellActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
