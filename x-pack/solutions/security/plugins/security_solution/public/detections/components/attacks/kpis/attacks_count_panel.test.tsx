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
import { AttacksCountPanel } from './attacks_count_panel';
import { AlertsCountPanel } from '../../alerts_kpis/alerts_count_panel';
import { useAttacksKpiState } from './common/use_attacks_kpi_state';
import { useEuiComboBoxReset } from '../../../../common/components/use_combo_box_reset';
import { useUserData } from '../../user_info';

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

vi.mock('../../alerts_kpis/alerts_count_panel', () => {
  const mocked = {
    AlertsCountPanel: vi.fn(() => <div data-test-subj="alerts-count-panel" />),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../user_info', () => {
  const mocked = {
    useUserData: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

describe('AttacksCountPanel', () => {
  const mockSetStackBy0 = vi.fn();
  const mockSetStackBy1 = vi.fn();
  const mockSetIsExpanded = vi.fn();
  const mockUseUserData = useUserData as Mock;

  beforeEach(() => {
    vi.clearAllMocks();

    (useAttacksKpiState as Mock).mockReturnValue({
      stackBy0: 'test.field.0',
      setStackBy0: mockSetStackBy0,
      stackBy1: 'test.field.1',
      setStackBy1: mockSetStackBy1,
    });

    (useEuiComboBoxReset as Mock).mockReturnValue({
      comboboxRef: { current: null },
      setComboboxInputRef: vi.fn(),
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

  it('passes chartOptionsContextMenu to AlertsCountPanel to hide the inspect button', () => {
    const props = {
      filters: [],
      title: 'Test Title',
      isExpanded: true,
      setIsExpanded: mockSetIsExpanded,
    };

    render(<AttacksCountPanel {...props} />);

    const mockedAlertsCountPanel = AlertsCountPanel as unknown as Mock;
    expect(mockedAlertsCountPanel).toHaveBeenCalledWith(
      expect.objectContaining({ chartOptionsContextMenu: expect.any(Function) }),
      expect.anything()
    );
  });
});
