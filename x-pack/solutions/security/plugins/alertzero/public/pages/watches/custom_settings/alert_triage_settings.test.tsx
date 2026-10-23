/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  EXCLUDED_RULE_TAG_MAX_LENGTH,
  EXCLUDED_RULE_TAGS_MAX_COUNT,
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  type Worker,
} from '@kbn/alertzero-common';
import { AlertTriageSettings } from './alert_triage_settings';

const SAVED_EXTRAS = {
  autoCloseConfidenceScoreMinThreshold: 0.9,
  budgetPerHour: 600,
  lookbackHours: 48,
  minSeverity: 'medium' as const,
  excludeBuildingBlocks: true,
  excludedRuleTags: ['SEND_TO_DEV'],
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

const renderSettings = (
  onExtrasChange = jest.fn(),
  extras: Record<string, unknown> = SAVED_EXTRAS
) => {
  render(
    <AlertTriageSettings
      worker={alertTriage}
      settings={{ ...alertTriage.settings, extras }}
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

  it('shows the saved minimum severity and emits the whole extras object when it changes', async () => {
    const { onExtrasChange } = renderSettings();

    const select = screen.getByTestId('alertZeroMinimumSeveritySelect');
    expect(select).toHaveValue('medium');
    await userEvent.selectOptions(select, 'critical');

    expect(onExtrasChange).toHaveBeenCalledWith({ ...SAVED_EXTRAS, minSeverity: 'critical' });
  });

  it('turns building-block exclusion off while keeping the other extras', async () => {
    const { onExtrasChange } = renderSettings();

    await userEvent.click(screen.getByTestId('alertZeroExcludeBuildingBlocksSwitch'));

    expect(onExtrasChange).toHaveBeenCalledWith({ ...SAVED_EXTRAS, excludeBuildingBlocks: false });
  });

  it('adds a trimmed rule tag once and ignores a duplicate', async () => {
    const { onExtrasChange } = renderSettings();
    const input = within(screen.getByTestId('alertZeroExcludedRuleTagsInput')).getByRole(
      'combobox'
    );

    await userEvent.type(input, ' noisy {enter}');
    await userEvent.type(input, 'SEND_TO_DEV{enter}');

    expect(onExtrasChange).toHaveBeenCalledTimes(1);
    expect(onExtrasChange).toHaveBeenCalledWith({
      ...SAVED_EXTRAS,
      excludedRuleTags: ['SEND_TO_DEV', 'noisy'],
    });
  });

  // The combo box used to accept any tag, so a 257th character made the whole draft invalid and
  // every control snapped back to its default while the draft kept the user's values.
  it('rejects a tag over the length limit with a message and leaves the draft alone', async () => {
    const { onExtrasChange } = renderSettings();
    const input = within(screen.getByTestId('alertZeroExcludedRuleTagsInput')).getByRole(
      'combobox'
    );

    await userEvent.click(input);
    await userEvent.paste('a'.repeat(EXCLUDED_RULE_TAG_MAX_LENGTH + 1));
    await userEvent.keyboard('{enter}');

    expect(onExtrasChange).not.toHaveBeenCalled();
    expect(screen.getByTestId('alertZeroExcludedRuleTagsError')).toBeInTheDocument();
  });

  it('rejects a tag beyond the tag count limit', async () => {
    const tags = Array.from({ length: EXCLUDED_RULE_TAGS_MAX_COUNT }, (_, i) => `tag-${i}`);
    const { onExtrasChange } = renderSettings(jest.fn(), {
      ...SAVED_EXTRAS,
      excludedRuleTags: tags,
    });
    const input = within(screen.getByTestId('alertZeroExcludedRuleTagsInput')).getByRole(
      'combobox'
    );

    await userEvent.type(input, 'one-too-many{enter}');

    expect(onExtrasChange).not.toHaveBeenCalled();
    expect(screen.getByTestId('alertZeroExcludedRuleTagsError')).toBeInTheDocument();
  });

  it('keeps the other controls when one field of the draft is invalid', () => {
    renderSettings(jest.fn(), {
      ...SAVED_EXTRAS,
      excludedRuleTags: ['a'.repeat(EXCLUDED_RULE_TAG_MAX_LENGTH + 1)],
    });

    expect(screen.getByTestId('alertZeroMinimumSeveritySelect')).toHaveValue('medium');
    expect(screen.getByTestId('alertZeroExcludeBuildingBlocksSwitch')).toBeChecked();
  });

  // Tags are matched exactly in Elasticsearch, so the UI has to let both `Dev` and `dev` be listed.
  it('adds a tag that differs from an existing one only by case', async () => {
    const { onExtrasChange } = renderSettings();
    const input = within(screen.getByTestId('alertZeroExcludedRuleTagsInput')).getByRole(
      'combobox'
    );

    await userEvent.type(input, 'send_to_dev{enter}');

    expect(onExtrasChange).toHaveBeenCalledWith({
      ...SAVED_EXTRAS,
      excludedRuleTags: ['SEND_TO_DEV', 'send_to_dev'],
    });
  });

  // EUI keys the selected pills by lowercased label, so two case variants rendered with the same
  // React key and every re-render (such as typing) logged a duplicate-key error.
  it('renders tags that differ only by case without duplicate React keys', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    renderSettings(jest.fn(), { ...SAVED_EXTRAS, excludedRuleTags: ['dev', 'Dev'] });
    const input = within(screen.getByTestId('alertZeroExcludedRuleTagsInput')).getByRole(
      'combobox'
    );

    await userEvent.type(input, 'abc');

    const duplicateKeyErrors = spy.mock.calls.filter(([message]) =>
      String(message).includes('same key')
    );
    spy.mockRestore();
    expect(duplicateKeyErrors).toHaveLength(0);
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
