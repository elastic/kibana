/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ALERTZERO_ENABLED_SETTING } from '@kbn/alertzero-common';
import { alertzeroAdvancedSettings } from './advanced_settings';

describe('alertzero:enabled advanced setting', () => {
  it('is read-only in the UI so enablement cannot bypass the transaction', () => {
    const setting = alertzeroAdvancedSettings[ALERTZERO_ENABLED_SETTING];
    // Saving the boolean from Advanced Settings writes it alone: it installs nothing and
    // removes nothing, which desyncs the setting from the workers it is supposed to
    // describe. Only the enable/disable routes flip it, inside the transaction.
    expect(setting.readonly).toBe(true);
    // 'ui' keeps the setting writable by the server-side routes — how the transaction
    // persists it — while hiding it from user edits.
    expect(setting.readonlyMode).toBe('ui');
  });
});