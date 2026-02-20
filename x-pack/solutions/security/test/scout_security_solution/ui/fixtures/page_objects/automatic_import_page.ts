/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';

const CREATE_INTEGRATION_LANDING_PAGE = '/app/integrations/create';
const ASSISTANT_BUTTON = 'assistantButton';

export class AutomaticImportPage {
  constructor(private readonly page: ScoutPage) {}

  async gotoCreateIntegration() {
    await this.page.goto(CREATE_INTEGRATION_LANDING_PAGE);
  }

  get assistantButton() {
    return this.page.locator(`[data-test-subj="${ASSISTANT_BUTTON}"]`);
  }

  async expectAssistantButtonNotExist() {
    await this.assistantButton.waitFor({ state: 'detached', timeout: 5000 }).catch(() => {});
  }
}
