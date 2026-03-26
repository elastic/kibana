/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { AttacksTrendsPanel } from './attacks_trends_panel';
import { useAttacksKpiState } from './common/use_attacks_kpi_state';
import { useEuiComboBoxReset } from '../../../../common/components/use_combo_box_reset';

// Mock dependencies
jest.mock('./common/use_attacks_kpi_state', () => ({
  useAttacksKpiState: jest.fn(),
}));

jest.mock('../../../../common/components/use_combo_box_reset', () => ({
  useEuiComboBoxReset: jest.fn(),
}));

jest.mock('../../alerts_kpis/alerts_histogram_panel', () => ({
  AlertsHistogramPanel: jest.fn(() => <div data-test-subj="alerts-histogram-panel" />),
}));

jest.mock('../../user_info', () => ({
  useUserData: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
}));

import { useUserData } from '../../user_info';
import { useDispatch } from 'react-redux';

describe('AttacksTrendsPanel', () => {
  const mockSetStackBy0 = jest.fn();
  const mockSetIsExpanded = jest.fn();
  const mockUseUserData = useUserData as jest.Mock;
  const mockDispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useAttacksKpiState as jest.Mock).mockReturnValue({
      stackBy0: 'test.field',
      setStackBy0: mockSetStackBy0,
    });

    (useEuiComboBoxReset as jest.Mock).mockReturnValue({
      comboboxRef: { current: null },
      setComboboxInputRef: jest.fn(),
    });

    mockUseUserData.mockReturnValue([{ signalIndexName: 'test-index' }]);
    (useDispatch as jest.Mock).mockReturnValue(mockDispatch);
  });

  it('renders AlertsHistogramPanel with correct props', () => {
    const props = {
      filters: [],
      title: 'Test Title',
      isExpanded: false,
      setIsExpanded: mockSetIsExpanded,
    };

    const { getByTestId } = render(<AttacksTrendsPanel {...props} />);

    expect(getByTestId('alerts-histogram-panel')).toBeInTheDocument();
  });
});
