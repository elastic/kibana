/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { DARK_THEME } from '@elastic/charts';
import { render, screen } from '@testing-library/react';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import React from 'react';

import { TestExternalProviders } from './mock/test_providers/test_providers';
import { mockUseResultsRollup } from './mock/use_results_rollup/mock_use_results_rollup';
import { getCheckStateStub } from './stub/get_check_state_stub';
import * as useResultsRollup from './hooks/use_results_rollup';
import * as useIndicesCheck from './hooks/use_indices_check';
import { DataQualityPanel } from '.';

vi.mock('./data_quality_details/indices_details/pattern/hooks/use_stats', () => {
  const mocked = {
    useStats: vi.fn(() => ({
      stats: {},
      error: null,
      loading: false,
    })),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./data_quality_details/indices_details/pattern/hooks/use_ilm_explain', () => {
  const mocked = {
    useIlmExplain: vi.fn(() => ({
      error: null,
      ilmExplain: {},
      loading: false,
    })),
  };
  return { ...mocked, default: mocked };
});

vi.spyOn(useResultsRollup, 'useResultsRollup').mockImplementation(() => mockUseResultsRollup);

vi.spyOn(useIndicesCheck, 'useIndicesCheck').mockImplementation(() => ({
  checkIndex: vi.fn(),
  checkState: {
    ...getCheckStateStub('auditbeat-*'),
  },
}));

const { toasts } = notificationServiceMock.createSetupContract();

const patterns = ['auditbeat-*'];

describe('DataQualityPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    render(
      <TestExternalProviders>
        <DataQualityPanel
          canUserCreateAndReadCases={vi.fn()}
          defaultBytesFormat={''}
          defaultNumberFormat={''}
          httpFetch={vi.fn()}
          isAssistantEnabled={true}
          isILMAvailable={true}
          lastChecked={''}
          openCreateCaseFlyout={vi.fn()}
          patterns={patterns}
          reportDataQualityIndexChecked={vi.fn()}
          reportDataQualityCheckAllCompleted={vi.fn()}
          setLastChecked={vi.fn()}
          baseTheme={DARK_THEME}
          toasts={toasts}
          defaultStartTime={'now-7d'}
          defaultEndTime={'now'}
        />
      </TestExternalProviders>
    );
  });

  it('renders the data quality summary', () => {
    expect(screen.getByTestId('dataQualitySummary')).toBeInTheDocument();
  });

  it(`renders the '${patterns.join(', ')}' patterns`, () => {
    for (const pattern of patterns) {
      expect(screen.getByTestId(`${pattern}PatternPanel`)).toBeInTheDocument();
    }
  });
});
