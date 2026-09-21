/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { ALERTZERO_ENABLED_SETTING_ID } from '@kbn/alertzero-common';
import { registerUiSettings } from './ui_settings';

describe('registerUiSettings', () => {
  const register = () => {
    const { uiSettings } = coreMock.createSetup();
    registerUiSettings(uiSettings);
    return (uiSettings.register as jest.Mock).mock.calls[0][0];
  };

  it('registers the AlertZero enablement setting', () => {
    expect(register()).toHaveProperty(ALERTZERO_ENABLED_SETTING_ID);
  });

  it('registers it off by default, per space, and requiring a page reload', () => {
    expect(register()[ALERTZERO_ENABLED_SETTING_ID]).toEqual(
      expect.objectContaining({
        type: 'boolean',
        value: false,
        category: ['securitySolution'],
        solutionViews: ['classic', 'security'],
        experimental: true,
        requiresPageReload: true,
      })
    );
  });

  it('registers it as editable', () => {
    expect(register()[ALERTZERO_ENABLED_SETTING_ID].readonly).toBeUndefined();
  });
});
