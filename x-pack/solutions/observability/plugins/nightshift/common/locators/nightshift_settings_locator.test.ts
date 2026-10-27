/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NIGHTSHIFT_APP_ID } from '@kbn/deeplinks-observability';
import { NightshiftSettingsLocatorDefinition } from './nightshift_settings_locator';

describe('NightshiftSettingsLocatorDefinition', () => {
  const locator = new NightshiftSettingsLocatorDefinition();

  it('links to Settings without duplicating the default-tab rule', async () => {
    await expect(locator.getLocation()).resolves.toEqual({
      app: NIGHTSHIFT_APP_ID,
      path: '/settings',
      state: {},
    });
  });

  it('links to a requested Settings tab', async () => {
    await expect(locator.getLocation({ tab: 'detections' })).resolves.toEqual({
      app: NIGHTSHIFT_APP_ID,
      path: '/settings/detections',
      state: {},
    });
  });
});
