/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { ALERTZERO_ENABLED_SETTING_ID } from '@kbn/alertzero-common';
import { createRulesCreatedTriggerGate } from './rules_created_trigger_gate';

const settingValue = (value: unknown) => ({ get: jest.fn().mockResolvedValue(value) });

describe('createRulesCreatedTriggerGate', () => {
  it('is on when the AlertZero plugin is enabled and the space setting is on', async () => {
    const uiSettingsClient = settingValue(true);

    const gate = createRulesCreatedTriggerGate({
      alertZero: { isEnabled: true },
      uiSettingsClient,
    });

    await expect(gate()).resolves.toBe(true);
    expect(uiSettingsClient.get).toHaveBeenCalledWith(ALERTZERO_ENABLED_SETTING_ID);
  });

  it.each([
    { name: 'the plugin is missing', alertZero: undefined },
    { name: 'the plugin is disabled', alertZero: { isEnabled: false } },
  ])(
    'is off without reading the setting when $name, even if the space setting was saved as on',
    async ({ alertZero }) => {
      const uiSettingsClient = settingValue(true);

      const gate = createRulesCreatedTriggerGate({ alertZero, uiSettingsClient });

      await expect(gate()).resolves.toBe(false);
      expect(uiSettingsClient.get).not.toHaveBeenCalled();
    }
  );

  it.each([
    { name: 'off', value: false },
    { name: 'never saved', value: undefined },
    { name: 'not a boolean', value: 'true' },
  ])('is off when the space setting is $name', async ({ value }) => {
    const gate = createRulesCreatedTriggerGate({
      alertZero: { isEnabled: true },
      uiSettingsClient: settingValue(value),
    });

    await expect(gate()).resolves.toBe(false);
  });

  // The gate runs inside rule creation, so a settings failure must read as "off", not as an error.
  it('is off and logs a warning when the setting cannot be read', async () => {
    const logger = loggingSystemMock.createLogger();
    const gate = createRulesCreatedTriggerGate({
      alertZero: { isEnabled: true },
      uiSettingsClient: { get: jest.fn().mockRejectedValue(new Error('saved objects down')) },
      logger,
    });

    await expect(gate()).resolves.toBe(false);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('saved objects down'));
  });
});
