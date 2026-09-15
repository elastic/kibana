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
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  type Worker,
} from '@kbn/alertzero-common';
import { RuleTuningSettings } from './detection_watch_settings';

const ruleTuning: Worker = {
  id: SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  name: 'Rule Tuning',
  watchIds: [SYSTEM_SECURITY_WATCH_DETECTION_ID],
  enabled: true,
  lastRun: null,
  state: 'ok',
  settingsRevision: 1,
  settings: {
    workerId: SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
    autonomy: 'manual',
    scheduleInterval: '2h',
    extras: { analysisWindowDays: 21 },
  },
};

const renderSettings = (onExtrasChange = jest.fn()) => {
  render(
    <RuleTuningSettings
      worker={ruleTuning}
      settings={ruleTuning.settings}
      onExtrasChange={onExtrasChange}
    />
  );
  return { onExtrasChange, field: screen.getByTestId('alertZeroAnalysisWindowDays') };
};

describe('RuleTuningSettings', () => {
  it('shows the saved analysis window', () => {
    const { field } = renderSettings();

    expect(field).toHaveValue(21);
  });

  it('hands back the complete extras object on blur', () => {
    const { onExtrasChange, field } = renderSettings();

    fireEvent.change(field, { target: { value: '7' } });
    expect(onExtrasChange).not.toHaveBeenCalled();

    fireEvent.blur(field);

    expect(onExtrasChange).toHaveBeenCalledTimes(1);
    expect(onExtrasChange).toHaveBeenCalledWith({ analysisWindowDays: 7 });
  });

  it('reverts an out-of-range value instead of emitting it', () => {
    const { onExtrasChange, field } = renderSettings();

    fireEvent.change(field, { target: { value: '31' } });
    fireEvent.blur(field);

    expect(onExtrasChange).not.toHaveBeenCalled();
    expect(field).toHaveValue(21);
  });

  it('falls back to the default window when extras are missing', () => {
    render(
      <RuleTuningSettings
        worker={ruleTuning}
        settings={{ ...ruleTuning.settings, extras: undefined }}
        onExtrasChange={jest.fn()}
      />
    );

    expect(screen.getByTestId('alertZeroAnalysisWindowDays')).toHaveValue(14);
  });
});
