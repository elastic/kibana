/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AnomalyRowActionsMenu } from './anomaly_row_actions_menu';
import { useBehavioralAnomalyRowActions } from '../hooks/use_behavioral_anomaly_row_actions';
import type { BehavioralAnomalyTableRow } from '../types';
import {
  BEHAVIORAL_ANOMALIES_TABLE_ROW_ACTIONS_BUTTON_TEST_ID,
  BEHAVIORAL_ANOMALIES_TABLE_ROW_ACTIONS_MENU_TEST_ID,
  BEHAVIORAL_ANOMALIES_TABLE_ROW_ACTION_ADD_TO_CASE_TEST_ID,
  BEHAVIORAL_ANOMALIES_TABLE_ROW_ACTION_ADD_TO_CHAT_TEST_ID,
} from '../test_ids';

jest.mock('../hooks/use_behavioral_anomaly_row_actions');

const useActionsMock = useBehavioralAnomalyRowActions as jest.Mock;

const row: BehavioralAnomalyTableRow = {
  id: 'anomaly-row-0',
  jobId: 'auth_high_count_logon',
  jobDisplayName: 'Failed authentication spike',
  timestamp: 1717074000000,
  baseline: '~2 events/min',
  anomaly: '84 events/min',
  anomalyScore: 92,
  underlyingEvents: [{ _id: 'evt-1', _index: 'logs-*' }],
};

const addToCaseClick = jest.fn();
const addToChatClick = jest.fn();

describe('AnomalyRowActionsMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useActionsMock.mockReturnValue({
      actions: [
        {
          key: 'add-to-case',
          label: 'Add to case',
          icon: 'briefcase',
          onClick: addToCaseClick,
          dataTestSubj: BEHAVIORAL_ANOMALIES_TABLE_ROW_ACTION_ADD_TO_CASE_TEST_ID,
        },
      ],
      addToChat: {
        label: 'Add to chat',
        onClick: addToChatClick,
        dataTestSubj: BEHAVIORAL_ANOMALIES_TABLE_ROW_ACTION_ADD_TO_CHAT_TEST_ID,
      },
    });
  });

  it('renders the trigger button collapsed by default', () => {
    render(<AnomalyRowActionsMenu row={row} />);

    expect(
      screen.getByTestId(BEHAVIORAL_ANOMALIES_TABLE_ROW_ACTIONS_BUTTON_TEST_ID)
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId(BEHAVIORAL_ANOMALIES_TABLE_ROW_ACTIONS_MENU_TEST_ID)
    ).not.toBeInTheDocument();
  });

  it('opens the menu on button click and renders panel items + add-to-chat button', async () => {
    render(<AnomalyRowActionsMenu row={row} />);

    await userEvent.click(
      screen.getByTestId(BEHAVIORAL_ANOMALIES_TABLE_ROW_ACTIONS_BUTTON_TEST_ID)
    );

    expect(
      screen.getByTestId(BEHAVIORAL_ANOMALIES_TABLE_ROW_ACTIONS_MENU_TEST_ID)
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(BEHAVIORAL_ANOMALIES_TABLE_ROW_ACTION_ADD_TO_CASE_TEST_ID)
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(BEHAVIORAL_ANOMALIES_TABLE_ROW_ACTION_ADD_TO_CHAT_TEST_ID)
    ).toBeInTheDocument();
    expect(screen.getByText('Add to chat')).toBeInTheDocument();
  });

  it('fires the add-to-chat handler when its button is clicked', async () => {
    render(<AnomalyRowActionsMenu row={row} />);

    await userEvent.click(
      screen.getByTestId(BEHAVIORAL_ANOMALIES_TABLE_ROW_ACTIONS_BUTTON_TEST_ID)
    );
    await userEvent.click(
      screen.getByTestId(BEHAVIORAL_ANOMALIES_TABLE_ROW_ACTION_ADD_TO_CHAT_TEST_ID)
    );

    expect(addToChatClick).toHaveBeenCalledTimes(1);
  });
});
