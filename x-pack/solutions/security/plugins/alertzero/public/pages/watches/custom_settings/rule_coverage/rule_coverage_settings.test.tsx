/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  RULE_COVERAGE_DEFAULT_EXTRAS,
  SYSTEM_SECURITY_WATCH_DETECTION_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID,
  type Worker,
} from '@kbn/alertzero-common';
import { RuleCoverageSettings } from './rule_coverage_settings';

const SAVED_EXTRAS = { lookbackDays: 21, maxGapsPerRun: 10 };

const ruleCoverage: Worker = {
  id: SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID,
  name: 'Rule Coverage',
  watchIds: [SYSTEM_SECURITY_WATCH_DETECTION_ID],
  enabled: true,
  lastRun: null,
  state: 'ok',
  settingsRevision: 1,
  workflowId: `${SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID}-default`,
  settings: {
    workerId: SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID,
    autonomy: 'manual',
    scheduleInterval: '1h',
    extras: SAVED_EXTRAS,
  },
};

const renderSettings = (onExtrasChange = jest.fn()) => {
  const { rerender } = render(
    <RuleCoverageSettings
      worker={ruleCoverage}
      settings={ruleCoverage.settings}
      onExtrasChange={onExtrasChange}
    />
  );
  return { onExtrasChange, rerender };
};

const expectDefaultsShown = () => {
  expect(screen.getByTestId('alertZeroLookbackDays')).toHaveValue(14);
  expect(screen.getByTestId('alertZeroMaxGapsPerRun')).toHaveValue(5);
};

const FIELDS = [
  {
    fieldName: 'lookback',
    testSubj: 'alertZeroLookbackDays',
    saved: SAVED_EXTRAS.lookbackDays,
    valid: 30,
    outOfRange: 91,
    key: 'lookbackDays',
  },
  {
    fieldName: 'max gaps per run',
    testSubj: 'alertZeroMaxGapsPerRun',
    saved: SAVED_EXTRAS.maxGapsPerRun,
    valid: 20,
    outOfRange: 51,
    key: 'maxGapsPerRun',
  },
] as const;

describe('RuleCoverageSettings', () => {
  it.each(FIELDS)('shows the saved $fieldName', ({ testSubj, saved }) => {
    renderSettings();

    expect(screen.getByTestId(testSubj)).toHaveValue(saved);
  });

  it.each(FIELDS)(
    'hands back the complete extras object when a valid $fieldName is committed on blur',
    ({ testSubj, valid, key }) => {
      const onExtrasChange = jest.fn();
      renderSettings(onExtrasChange);
      const field = screen.getByTestId(testSubj);

      fireEvent.change(field, { target: { value: String(valid) } });
      expect(onExtrasChange).not.toHaveBeenCalled();
      fireEvent.blur(field);

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
      expect(onExtrasChange).not.toHaveBeenCalled();
      expect(field).toHaveValue(outOfRange);

      fireEvent.blur(field);

      expect(onExtrasChange).not.toHaveBeenCalled();
      expect(field).toHaveValue(saved);
    }
  );

  it('re-syncs every control when the parent resets the values', () => {
    // For example, when the user clicks the Discard button
    const { rerender } = renderSettings();

    fireEvent.change(screen.getByTestId('alertZeroLookbackDays'), { target: { value: '30' } });
    rerender(
      <RuleCoverageSettings
        worker={ruleCoverage}
        settings={{ ...ruleCoverage.settings, extras: RULE_COVERAGE_DEFAULT_EXTRAS }}
        onExtrasChange={jest.fn()}
      />
    );

    expectDefaultsShown();
  });

  it('falls back to the defaults when extras are missing', () => {
    // This is the case when the user has not yet saved the settings for this worker
    render(
      <RuleCoverageSettings
        worker={ruleCoverage}
        settings={{ ...ruleCoverage.settings, extras: undefined }}
        onExtrasChange={jest.fn()}
      />
    );

    expectDefaultsShown();
  });
});
