/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import { useAnomalyTableRowActions } from '../../../api/hooks/use_anomaly_table_row_actions';
import {
  ANOMALIES_TABLE_ROW_ACTIONS_BUTTON_TEST_ID,
  ANOMALIES_TABLE_ROW_ACTION_TEST_ID_PREFIX,
} from '../test_ids';
import { AnomalyRowActionsMenu } from './anomaly_row_actions_menu';
import type { TableRow } from './types';
import { ANOMALY_ACTION_IDS } from './action_menu/definitions';

jest.mock('../../../api/hooks/use_anomaly_table_row_actions');

const mockUseAnomalyTableRowActions = useAnomalyTableRowActions as jest.Mock;
const mockAction = jest.fn();
const row: TableRow = {
  id: 'row-1',
  jobId: 'test-job',
  jobDisplayName: 'Test Job',
  recordId: 'record-123',
  mitreTactics: [],
  timestamp: 1700000000000,
  detectorIndex: 0,
  baseline: '',
  anomaly: '',
  anomalyScore: 75,
  description: '',
  anomalyCount: 1,
  keyFields: [],
};
const timeRange = {
  from: '2023-11-01T00:00:00.000Z',
  to: '2023-11-30T00:00:00.000Z',
};

describe('AnomalyRowActionsMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAnomalyTableRowActions.mockReturnValue({
      actions: [
        {
          key: 'view-in-discover',
          label: 'View in Discover',
          icon: 'productDiscover',
          onClick: mockAction,
        },
      ],
    });
  });

  it('preserves the row action selector and runs the action', () => {
    const { getByTestId } = render(
      <TestProviders>
        <AnomalyRowActionsMenu row={row} timeRange={timeRange} />
      </TestProviders>
    );

    fireEvent.click(getByTestId(ANOMALIES_TABLE_ROW_ACTIONS_BUTTON_TEST_ID));
    fireEvent.click(getByTestId(`${ANOMALIES_TABLE_ROW_ACTION_TEST_ID_PREFIX}view-in-discover`));

    expect(mockAction).toHaveBeenCalledTimes(1);
  });

  it('supports custom actions and action order overrides', () => {
    const { getByTestId } = render(
      <TestProviders>
        <AnomalyRowActionsMenu
          row={row}
          timeRange={timeRange}
          customActions={[
            {
              id: 'custom',
              items: [{ name: 'Custom action', 'data-test-subj': 'customAnomalyAction' }],
            },
          ]}
          actionOrder={['custom', ANOMALY_ACTION_IDS.navigationActions]}
        />
      </TestProviders>
    );

    fireEvent.click(getByTestId(ANOMALIES_TABLE_ROW_ACTIONS_BUTTON_TEST_ID));

    expect(getByTestId('customAnomalyAction')).toHaveTextContent('Custom action');
  });
});
