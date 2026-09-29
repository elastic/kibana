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
import { AttacksTreemapPanel } from './attacks_treemap_panel';
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

vi.mock('../../alerts_kpis/alerts_treemap_panel', () => {
  const mocked = {
    AlertsTreemapPanel: vi.fn(() => <div data-test-subj="alerts-treemap-panel" />),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../user_info', () => {
  const mocked = {
    useUserData: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

describe('AttacksTreemapPanel', () => {
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

  it('renders AlertsTreemapPanel with correct props', () => {
    const props = {
      filters: [],
      query: { query: 'test', language: 'kuery' },
      title: 'Test Title',
      isExpanded: false,
      setIsExpanded: mockSetIsExpanded,
    };

    const { getByTestId } = render(<AttacksTreemapPanel {...props} />);

    expect(getByTestId('alerts-treemap-panel')).toBeInTheDocument();
  });
});
