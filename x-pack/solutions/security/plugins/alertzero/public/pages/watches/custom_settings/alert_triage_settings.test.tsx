/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  ALERT_TRIAGE_DEFAULT_EXTRAS,
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

const FIELDS = [
  {
    fieldName: 'budget per hour',
    testSubj: 'alertZeroBudgetPerHour',
    saved: SAVED_EXTRAS.budgetPerHour,
    valid: 1300,
    outOfRange: 5001,
    key: 'budgetPerHour',
  },
  {
    fieldName: 'lookback',
    testSubj: 'alertZeroLookbackHours',
    saved: SAVED_EXTRAS.lookbackHours,
    valid: 24,
    outOfRange: 169,
    key: 'lookbackHours',
  },
] as const;

describe('AlertTriageSettings', () => {
  it.each(FIELDS)('shows the saved $fieldName', ({ testSubj, saved }) => {
    renderSettings();

    expect(screen.getByTestId(testSubj)).toHaveValue(saved);
  });

  it.each(FIELDS)(
    'hands back the complete extras, including the confidence floor, when a valid $fieldName is committed',
    ({ testSubj, valid, key }) => {
      const onExtrasChange = jest.fn();
      renderSettings(onExtrasChange);
      const field = screen.getByTestId(testSubj);

      fireEvent.change(field, { target: { value: String(valid) } });
      fireEvent.blur(field);

      // The server replaces extras whole and rejects a replacement missing a field, so a change to
      // one setting must carry the others.
      expect(onExtrasChange).toHaveBeenCalledTimes(1);
      expect(onExtrasChange).toHaveBeenCalledWith({ ...SAVED_EXTRAS, [key]: valid });
    }
  );

  it.each(FIELDS)(
    'reverts an out-of-range $fieldName on blur instead of emitting it',
    ({ testSubj, saved, outOfRange }) => {
      const onExtrasChange = jest.fn();
      renderSettings(onExtrasChange);
      const field = screen.getByTestId(testSubj);

      fireEvent.change(field, { target: { value: String(outOfRange) } });
      fireEvent.blur(field);

      expect(onExtrasChange).not.toHaveBeenCalled();
      expect(field).toHaveValue(saved);
    }
  );

  it('raises the least budget with a shorter schedule, since each run must fund a batch', () => {
    const onExtrasChange = jest.fn();
    render(
      <AlertTriageSettings
        worker={alertTriage}
        settings={{ ...alertTriage.settings, scheduleInterval: '5m' }}
        onExtrasChange={onExtrasChange}
      />
    );
    const field = screen.getByTestId('alertZeroBudgetPerHour');

    // 50 is valid on the 15 minute schedule (least 24) but one run of 5 minutes would get 4 units.
    fireEvent.change(field, { target: { value: '50' } });
    fireEvent.blur(field);

    expect(onExtrasChange).not.toHaveBeenCalled();
    expect(field).toHaveValue(SAVED_EXTRAS.budgetPerHour);

    fireEvent.change(field, { target: { value: '72' } });
    fireEvent.blur(field);

    expect(onExtrasChange).toHaveBeenCalledWith({ ...SAVED_EXTRAS, budgetPerHour: 72 });
  });

  it('falls back to the defaults when extras are missing', () => {
    render(
      <AlertTriageSettings
        worker={alertTriage}
        settings={{ ...alertTriage.settings, extras: undefined }}
        onExtrasChange={jest.fn()}
      />
    );

    expect(screen.getByTestId('alertZeroBudgetPerHour')).toHaveValue(
      ALERT_TRIAGE_DEFAULT_EXTRAS.budgetPerHour
    );
    expect(screen.getByTestId('alertZeroLookbackHours')).toHaveValue(
      ALERT_TRIAGE_DEFAULT_EXTRAS.lookbackHours
    );
  });
});
