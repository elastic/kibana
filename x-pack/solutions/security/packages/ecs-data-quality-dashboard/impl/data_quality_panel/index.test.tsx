/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

jest.mock('./data_quality_details/indices_details/pattern/hooks/use_stats', () => ({
  useStats: jest.fn(() => ({
    stats: {},
    error: null,
    loading: false,
  })),
}));

jest.mock('./data_quality_details/indices_details/pattern/hooks/use_ilm_explain', () => ({
  useIlmExplain: jest.fn(() => ({
    error: null,
    ilmExplain: {},
    loading: false,
  })),
}));

jest.spyOn(useResultsRollup, 'useResultsRollup').mockImplementation(() => mockUseResultsRollup);

jest.spyOn(useIndicesCheck, 'useIndicesCheck').mockImplementation(() => ({
  checkIndex: jest.fn(),
  checkState: {
    ...getCheckStateStub('auditbeat-*'),
  },
}));

const { toasts } = notificationServiceMock.createSetupContract();

const patterns = ['auditbeat-*'];

describe('DataQualityPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    render(
      <TestExternalProviders>
        <DataQualityPanel
          canUserCreateAndReadCases={jest.fn()}
          defaultBytesFormat={''}
          defaultNumberFormat={''}
          httpFetch={jest.fn()}
          isAssistantEnabled={true}
          isILMAvailable={true}
          lastChecked={''}
          openCreateCaseFlyout={jest.fn()}
          patterns={patterns}
          reportDataQualityIndexChecked={jest.fn()}
          reportDataQualityCheckAllCompleted={jest.fn()}
          setLastChecked={jest.fn()}
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
