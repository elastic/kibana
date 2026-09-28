/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import {
  RULE_TUNING_DEFAULT_EXTRAS,
  SYSTEM_SECURITY_WATCH_DETECTION_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  type Worker,
} from '@kbn/alertzero-common';
import { RuleTuningSettings } from './rule_tuning_settings';

const SAVED_EXTRAS = { analysisWindowDays: 21, fpCountThreshold: 4, fpRateThresholdPct: 80 };

const ruleTuning: Worker = {
  id: SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  name: 'Rule Tuning',
  watchIds: [SYSTEM_SECURITY_WATCH_DETECTION_ID],
  enabled: true,
  lastRun: null,
  state: 'ok',
  settingsRevision: 1,
  workflowId: `${SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID}-default`,
  settings: {
    workerId: SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
    autonomy: 'manual',
    scheduleInterval: '2h',
    extras: SAVED_EXTRAS,
  },
};

const renderSettings = (onExtrasChange = jest.fn()) => {
  const { rerender } = render(
    <RuleTuningSettings
      worker={ruleTuning}
      settings={ruleTuning.settings}
      onExtrasChange={onExtrasChange}
    />
  );
  return { onExtrasChange, rerender };
};

const expectDefaultsShown = () => {
  expect(screen.getByTestId('alertZeroAnalysisWindowDays')).toHaveValue(7);
  expect(screen.getByTestId('alertZeroFpCountThreshold')).toHaveValue(10);
  expect(screen.getByTestId('alertZeroFpRateThresholdPct')).toHaveValue(50);
};

/** Each control: its test subject, the saved value it shows, a valid edit, and an out-of-range one. */
const FIELDS = [
  {
    name: 'analysis window',
    testSubj: 'alertZeroAnalysisWindowDays',
    saved: SAVED_EXTRAS.analysisWindowDays,
    valid: 7,
    outOfRange: 31,
    key: 'analysisWindowDays',
  },
  {
    name: 'FP count threshold',
    testSubj: 'alertZeroFpCountThreshold',
    saved: SAVED_EXTRAS.fpCountThreshold,
    valid: 25,
    outOfRange: 101,
    key: 'fpCountThreshold',
  },
  {
    name: 'FP rate threshold',
    testSubj: 'alertZeroFpRateThresholdPct',
    saved: SAVED_EXTRAS.fpRateThresholdPct,
    valid: 30,
    outOfRange: 101,
    key: 'fpRateThresholdPct',
  },
] as const;

describe('RuleTuningSettings', () => {
  it.each(FIELDS)('shows the saved $name', ({ testSubj, saved }) => {
    renderSettings();

    expect(screen.getByTestId(testSubj)).toHaveValue(saved);
  });

  it.each(FIELDS)(
    'hands back the complete extras object when a valid $name is committed on blur',
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
    'reverts an out-of-range $name on blur instead of emitting it',
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

  it.each(FIELDS)(
    'holds incomplete $name input while typing and reverts it on blur',
    ({ testSubj, saved }) => {
      const onExtrasChange = jest.fn();
      renderSettings(onExtrasChange);
      const field = screen.getByTestId(testSubj);

      fireEvent.change(field, { target: { value: '' } });
      expect(onExtrasChange).not.toHaveBeenCalled();

      fireEvent.blur(field);

      expect(field).toHaveValue(saved);
    }
  );

  it('re-syncs every control when the parent resets the values', () => {
    const { rerender } = renderSettings();

    fireEvent.change(screen.getByTestId('alertZeroAnalysisWindowDays'), {
      target: { value: '7' },
    });
    rerender(
      <RuleTuningSettings
        worker={ruleTuning}
        settings={{ ...ruleTuning.settings, extras: RULE_TUNING_DEFAULT_EXTRAS }}
        onExtrasChange={jest.fn()}
      />
    );

    expectDefaultsShown();
  });

  // Generated ids are constant under Jest, so the rows are asserted structurally rather than by
  // accessible name: the control group points at the label and help elements of its own row.
  it('announces each row label and help for its controls', () => {
    renderSettings();

    const expectRowWiring = (rowTestSubj: string, label: string, help: RegExp) => {
      const row = screen.getByTestId(rowTestSubj);
      const group = within(row).getByRole('group');
      const labelEl = within(row).getByText(label);
      const helpEl = within(row).getByText(help);
      expect(group).toHaveAttribute('aria-labelledby', labelEl.id);
      expect(group).toHaveAttribute('aria-describedby', helpEl.id);
      return group;
    };

    const windowGroup = expectRowWiring(
      'alertZeroAnalysisWindowRow',
      'Analysis window (days)',
      /Between 1 and 30/
    );
    expect(windowGroup).toContainElement(screen.getByTestId('alertZeroAnalysisWindowDays'));

    expectRowWiring(
      'alertZeroQualifyingThresholdsRow',
      'Qualifying thresholds',
      /both are met within the analysis window/
    );

    // Both threshold inputs point at the shared help line that names their ranges.
    const help = screen.getByTestId('alertZeroQualifyingThresholdsHelp');
    expect(help).toHaveTextContent('Count between 2 and 100, rate between 0 and 100%.');
    for (const testSubj of ['alertZeroFpCountThreshold', 'alertZeroFpRateThresholdPct']) {
      expect(screen.getByTestId(testSubj)).toHaveAttribute('aria-describedby', help.id);
    }
  });

  it('falls back to the defaults when extras are missing', () => {
    render(
      <RuleTuningSettings
        worker={ruleTuning}
        settings={{ ...ruleTuning.settings, extras: undefined }}
        onExtrasChange={jest.fn()}
      />
    );

    expectDefaultsShown();
  });

  it('falls back to the defaults when stored extras are incomplete', () => {
    render(
      <RuleTuningSettings
        worker={ruleTuning}
        settings={{ ...ruleTuning.settings, extras: { analysisWindowDays: 21 } }}
        onExtrasChange={jest.fn()}
      />
    );

    expectDefaultsShown();
  });
});
