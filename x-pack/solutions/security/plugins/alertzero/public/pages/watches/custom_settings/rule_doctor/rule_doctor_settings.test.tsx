/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  SYSTEM_SECURITY_WATCH_DETECTION_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_DOCTOR_ID,
  type Worker,
} from '@kbn/alertzero-common';
import { RuleDoctorSettings } from './rule_doctor_settings';

const ruleDoctor: Worker = {
  id: SYSTEM_SECURITY_WORKER_DETECTION_RULE_DOCTOR_ID,
  name: 'Rule Doctor',
  watchIds: [SYSTEM_SECURITY_WATCH_DETECTION_ID],
  enabled: true,
  lastRun: null,
  state: 'ok',
  settingsRevision: 1,
  workflowId: `${SYSTEM_SECURITY_WORKER_DETECTION_RULE_DOCTOR_ID}-default`,
  workflowOutdated: false,
  blockingReasons: [],
  settings: {
    workerId: SYSTEM_SECURITY_WORKER_DETECTION_RULE_DOCTOR_ID,
    autonomy: 'manual',
    scheduleInterval: '1h',
    extras: { ruleOutcomes: 'failed' },
  },
};

const renderSettings = (settings = ruleDoctor.settings, isDisabled = false) => {
  const onExtrasChange = jest.fn();
  render(
    <RuleDoctorSettings
      worker={ruleDoctor}
      settings={settings}
      isDisabled={isDisabled}
      onExtrasChange={onExtrasChange}
    />
  );
  return onExtrasChange;
};

describe('RuleDoctorSettings', () => {
  it('shows the saved choice', () => {
    renderSettings();
    expect(screen.getByTestId('alertZeroRuleOutcomesSelect')).toHaveValue('failed');
  });

  it('hands back the complete extras on change', () => {
    const onExtrasChange = renderSettings();
    fireEvent.change(screen.getByTestId('alertZeroRuleOutcomesSelect'), {
      target: { value: 'warning' },
    });
    expect(onExtrasChange).toHaveBeenCalledWith({ ruleOutcomes: 'warning' });
  });

  it('falls back to both outcomes when the stored extras are invalid', () => {
    renderSettings({ ...ruleDoctor.settings, extras: { ruleOutcomes: 'everything' } });
    expect(screen.getByTestId('alertZeroRuleOutcomesSelect')).toHaveValue('failed_and_warning');
  });

  it('disables the control', () => {
    renderSettings(ruleDoctor.settings, true);
    expect(screen.getByTestId('alertZeroRuleOutcomesSelect')).toBeDisabled();
  });
});
