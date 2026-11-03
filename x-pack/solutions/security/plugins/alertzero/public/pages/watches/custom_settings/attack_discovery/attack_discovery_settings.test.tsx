/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  ATTACK_DISCOVERY_ADDITIONAL_CONTEXT_MAX_LENGTH,
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  type Worker,
} from '@kbn/alertzero-common';
import { AttackDiscoverySettings } from './attack_discovery_settings';
import { getWorkerCustomSettingsComponent } from '../registry';

const SAVED_CONTEXT = 'Payment hosts are named pay-*.';

const attackDiscovery: Worker = {
  id: SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  name: 'Attack Discovery',
  watchIds: [SYSTEM_SECURITY_WATCH_FLOOR_ID],
  enabled: true,
  lastRun: null,
  state: 'ok',
  settingsRevision: 1,
  workflowId: SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  blockingReasons: [],
  settings: {
    workerId: SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
    autonomy: 'manual',
    scheduleInterval: '24h',
    extras: { additionalContext: SAVED_CONTEXT },
  },
};

const renderSettings = (
  settings = attackDiscovery.settings,
  onExtrasChange = jest.fn(),
  isDisabled?: boolean,
  onValidityChange?: (isValid: boolean) => void
) => {
  const element = (resetKey?: number) => (
    <AttackDiscoverySettings
      worker={attackDiscovery}
      settings={settings}
      isDisabled={isDisabled}
      onExtrasChange={onExtrasChange}
      onValidityChange={onValidityChange}
      resetKey={resetKey}
    />
  );
  const { rerender } = render(element());
  return Object.assign(onExtrasChange, {
    discard: (resetKey: number) => rerender(element(resetKey)),
  });
};

describe('AttackDiscoverySettings', () => {
  it('is registered for the Attack Discovery Worker', () => {
    expect(getWorkerCustomSettingsComponent(SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID)).toBe(
      AttackDiscoverySettings
    );
  });

  it('shows the saved additional context', () => {
    renderSettings();

    expect(screen.getByTestId('alertZeroAdditionalContext')).toHaveValue(SAVED_CONTEXT);
  });

  it('is empty when no extras are stored', () => {
    renderSettings({ ...attackDiscovery.settings, extras: undefined });

    expect(screen.getByTestId('alertZeroAdditionalContext')).toHaveValue('');
  });

  it('is empty when the stored extras do not match the schema', () => {
    renderSettings({ ...attackDiscovery.settings, extras: { additionalContext: 42 } });

    expect(screen.getByTestId('alertZeroAdditionalContext')).toHaveValue('');
  });

  it('hands back the complete extras object as text is typed', () => {
    const onExtrasChange = renderSettings();

    fireEvent.change(screen.getByTestId('alertZeroAdditionalContext'), {
      target: { value: 'Focus on domain controllers.' },
    });

    expect(onExtrasChange).toHaveBeenLastCalledWith({
      additionalContext: 'Focus on domain controllers.',
    });
  });

  it.each(['', '   \n '])('removes the key instead of saving %j', (value) => {
    const onExtrasChange = renderSettings();

    fireEvent.change(screen.getByTestId('alertZeroAdditionalContext'), { target: { value } });

    expect(onExtrasChange).toHaveBeenLastCalledWith({});
  });

  it('keeps whitespace typed into the empty box instead of dropping it', () => {
    renderSettings({ ...attackDiscovery.settings, extras: {} });

    fireEvent.change(screen.getByTestId('alertZeroAdditionalContext'), { target: { value: ' ' } });

    expect(screen.getByTestId('alertZeroAdditionalContext')).toHaveValue(' ');
  });

  it('keeps the surrounding spaces while typing a word after them', () => {
    const onExtrasChange = renderSettings({ ...attackDiscovery.settings, extras: {} });
    const box = screen.getByTestId('alertZeroAdditionalContext');

    fireEvent.change(box, { target: { value: ' ' } });
    fireEvent.change(box, { target: { value: ' a' } });

    expect(box).toHaveValue(' a');
    expect(onExtrasChange).toHaveBeenLastCalledWith({ additionalContext: ' a' });
  });

  it('settles the box back to the stored value on blur when the typed text is valid', () => {
    renderSettings({ ...attackDiscovery.settings, extras: {} });
    const box = screen.getByTestId('alertZeroAdditionalContext');

    fireEvent.change(box, { target: { value: '  ' } });
    expect(box).toHaveValue('  ');
    fireEvent.blur(box);

    expect(box).toHaveValue('');
  });

  it('keeps flagged text in the box on blur so it can be corrected', () => {
    renderSettings({ ...attackDiscovery.settings, extras: {} });
    const box = screen.getByTestId('alertZeroAdditionalContext');

    fireEvent.change(box, { target: { value: 'Hosts use {{ braces }}' } });
    fireEvent.blur(box);

    expect(box).toHaveValue('Hosts use {{ braces }}');
    expect(screen.getByTestId('alertZeroAdditionalContextError')).toBeInTheDocument();
  });

  describe('a value with template syntax', () => {
    const TEMPLATE = 'Hosts use {{ braces }}';

    it('shows the error, does not publish the value, and reports the draft invalid', () => {
      const onValidityChange = jest.fn();
      const onExtrasChange = renderSettings(undefined, jest.fn(), undefined, onValidityChange);

      fireEvent.change(screen.getByTestId('alertZeroAdditionalContext'), {
        target: { value: TEMPLATE },
      });

      expect(screen.getByTestId('alertZeroAdditionalContextError')).toBeInTheDocument();
      expect(screen.getByTestId('alertZeroAdditionalContext')).toHaveValue(TEMPLATE);
      expect(onExtrasChange).not.toHaveBeenCalled();
      expect(onValidityChange).toHaveBeenLastCalledWith(false);
    });

    it('clears the error and publishes once the template syntax is removed', () => {
      const onValidityChange = jest.fn();
      const onExtrasChange = renderSettings(undefined, jest.fn(), undefined, onValidityChange);
      const box = screen.getByTestId('alertZeroAdditionalContext');

      fireEvent.change(box, { target: { value: TEMPLATE } });
      fireEvent.change(box, { target: { value: 'Hosts use braces' } });

      expect(screen.queryByTestId('alertZeroAdditionalContextError')).not.toBeInTheDocument();
      expect(onExtrasChange).toHaveBeenLastCalledWith({ additionalContext: 'Hosts use braces' });
      expect(onValidityChange).toHaveBeenLastCalledWith(true);
    });

    it('drops the flagged value on Discard', () => {
      const onValidityChange = jest.fn();
      const onExtrasChange = renderSettings(undefined, jest.fn(), undefined, onValidityChange);

      fireEvent.change(screen.getByTestId('alertZeroAdditionalContext'), {
        target: { value: TEMPLATE },
      });
      onExtrasChange.discard(1);

      expect(screen.getByTestId('alertZeroAdditionalContext')).toHaveValue(SAVED_CONTEXT);
      expect(screen.queryByTestId('alertZeroAdditionalContextError')).not.toBeInTheDocument();
      expect(onValidityChange).toHaveBeenLastCalledWith(true);
    });
  });

  it('limits the text to the schema maximum', () => {
    renderSettings();

    expect(screen.getByTestId('alertZeroAdditionalContext')).toHaveAttribute(
      'maxlength',
      String(ATTACK_DISCOVERY_ADDITIONAL_CONTEXT_MAX_LENGTH)
    );
  });

  it('is disabled when the page disables the settings', () => {
    renderSettings(attackDiscovery.settings, jest.fn(), true);

    expect(screen.getByTestId('alertZeroAdditionalContext')).toBeDisabled();
  });
});
