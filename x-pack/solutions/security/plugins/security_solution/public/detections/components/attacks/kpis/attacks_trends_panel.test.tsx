/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { render } from '@testing-library/react';
import { AttacksTrendsPanel } from './attacks_trends_panel';
import { useAttacksKpiState } from './common/use_attacks_kpi_state';
import { useEuiComboBoxReset } from '../../../../common/components/use_combo_box_reset';

// Mock dependencies
vi.mock('./common/use_attacks_kpi_state', () => {
      const mocked = {
      useAttacksKpiState: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../../common/components/use_combo_box_reset', () => {
      const mocked = {
      useEuiComboBoxReset: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../alerts_kpis/alerts_histogram_panel', () => {
      const mocked = {
      AlertsHistogramPanel: vi.fn(() => <div data-test-subj="alerts-histogram-panel" />),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../user_info', () => {
      const mocked = {
      useUserData: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('react-redux-v7', () => {
      const mocked = {
      useDispatch: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

import { useUserData } from '../../user_info';
import { useDispatch } from 'react-redux-v7';

describe('AttacksTrendsPanel', () => {
  const mockSetStackBy0 = vi.fn();
  const mockSetIsExpanded = vi.fn();
  const mockUseUserData = useUserData as Mock;
  const mockDispatch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (useAttacksKpiState as Mock).mockReturnValue({
      stackBy0: 'test.field',
      setStackBy0: mockSetStackBy0,
    });

    (useEuiComboBoxReset as Mock).mockReturnValue({
      comboboxRef: { current: null },
      setComboboxInputRef: vi.fn(),
    });

    mockUseUserData.mockReturnValue([{ signalIndexName: 'test-index' }]);
    (useDispatch as Mock).mockReturnValue(mockDispatch);
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
