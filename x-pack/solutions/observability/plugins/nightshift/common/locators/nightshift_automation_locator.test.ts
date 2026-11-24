/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NIGHTSHIFT_APP_ID } from '@kbn/deeplinks-observability';
import { NightshiftAutomationLocatorDefinition } from './nightshift_automation_locator';

describe('NightshiftAutomationLocatorDefinition', () => {
  const locator = new NightshiftAutomationLocatorDefinition();

  it("links to the automation's details page", async () => {
    await expect(locator.getLocation({ automationId: 'automation-1' })).resolves.toEqual({
      app: NIGHTSHIFT_APP_ID,
      path: '/automations/automation-1',
      state: {},
    });
  });

  it('escapes the automation id', async () => {
    await expect(locator.getLocation({ automationId: 'a/b?c' })).resolves.toMatchObject({
      path: '/automations/a%2Fb%3Fc',
    });
  });
});
