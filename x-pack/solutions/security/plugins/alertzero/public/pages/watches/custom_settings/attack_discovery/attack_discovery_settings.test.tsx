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
  isDisabled?: boolean
) => {
  render(
    <AttackDiscoverySettings
      worker={attackDiscovery}
      settings={settings}
      isDisabled={isDisabled}
      onExtrasChange={onExtrasChange}
    />
  );
  return onExtrasChange;
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
