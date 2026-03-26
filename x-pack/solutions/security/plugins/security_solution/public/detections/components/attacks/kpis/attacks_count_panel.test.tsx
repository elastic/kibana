/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { AttacksCountPanel } from './attacks_count_panel';
import { useAttacksKpiState } from './common/use_attacks_kpi_state';
import { useEuiComboBoxReset } from '../../../../common/components/use_combo_box_reset';
import { useUserData } from '../../user_info';

// Mock dependencies
jest.mock('./common/use_attacks_kpi_state', () => ({
  useAttacksKpiState: jest.fn(),
}));

jest.mock('../../../../common/components/use_combo_box_reset', () => ({
  useEuiComboBoxReset: jest.fn(),
}));

jest.mock('../../alerts_kpis/alerts_count_panel', () => ({
  AlertsCountPanel: jest.fn(() => <div data-test-subj="alerts-count-panel" />),
}));

jest.mock('../../user_info', () => ({
  useUserData: jest.fn(),
}));

describe('AttacksCountPanel', () => {
  const mockSetStackBy0 = jest.fn();
  const mockSetStackBy1 = jest.fn();
  const mockSetIsExpanded = jest.fn();
  const mockUseUserData = useUserData as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    (useAttacksKpiState as jest.Mock).mockReturnValue({
      stackBy0: 'test.field.0',
      setStackBy0: mockSetStackBy0,
      stackBy1: 'test.field.1',
      setStackBy1: mockSetStackBy1,
    });

    (useEuiComboBoxReset as jest.Mock).mockReturnValue({
      comboboxRef: { current: null },
      setComboboxInputRef: jest.fn(),
    });

    mockUseUserData.mockReturnValue([{ signalIndexName: 'test-index' }]);
  });

  it('renders AlertsCountPanel with correct props', () => {
    const props = {
      filters: [],
      title: 'Test Title',
      isExpanded: false,
      setIsExpanded: mockSetIsExpanded,
    };

    const { getByTestId } = render(<AttacksCountPanel {...props} />);

    expect(getByTestId('alerts-count-panel')).toBeInTheDocument();
  });
});
