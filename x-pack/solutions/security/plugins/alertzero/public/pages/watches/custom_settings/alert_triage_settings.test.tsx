/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  type Worker,
} from '@kbn/alertzero-common';
import { AlertTriageSettings } from './alert_triage_settings';

const SAVED_EXTRAS = {
  autoCloseConfidenceScoreMinThreshold: 0.9,
  budgetPerHour: 600,
  lookbackHours: 48,
};

const alertTriage: Worker = {
  id: SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  name: 'Alert Triage',
  watchIds: [SYSTEM_SECURITY_WATCH_FLOOR_ID],
  enabled: true,
  lastRun: null,
  state: 'ok',
  settingsRevision: 1,
  workflowId: `${SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID}-default`,
  blockingReasons: [],
  settings: {
    workerId: SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
    autonomy: 'manual',
    scheduleInterval: '15m',
    extras: SAVED_EXTRAS,
  },
};

const renderSettings = (onExtrasChange = jest.fn()) => {
  render(
    <AlertTriageSettings
      worker={alertTriage}
      settings={alertTriage.settings}
      onExtrasChange={onExtrasChange}
    />
  );
  return { onExtrasChange };
};

describe('AlertTriageSettings', () => {
  it('shows the minimum confidence score', () => {
    renderSettings();

    expect(screen.getByTestId('alertZeroMinimumConfidenceScoreRow')).toBeInTheDocument();
  });

  // Budget and lookback are internal levers: a user cranking them can push the worker into a bad
  // state, so the MVP ships the defaults only.
  it.each(['alertZeroBudgetPerHourRow', 'alertZeroLookbackHoursRow'])(
    'does not expose the internal %s setting',
    (testSubj) => {
      renderSettings();

      expect(screen.queryByTestId(testSubj)).not.toBeInTheDocument();
    }
  );
});
