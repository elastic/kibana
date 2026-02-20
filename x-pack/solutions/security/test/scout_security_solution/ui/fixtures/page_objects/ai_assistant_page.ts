/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';

const GET_STARTED_URL = '/app/security/get_started';

export class AiAssistantPage {
  constructor(private readonly page: ScoutPage) {}

  async gotoGetStarted() {
    await this.page.goto(GET_STARTED_URL);
  }

  get aiAssistantButton() {
    return this.page.testSubj.locator('assistantNavLink');
  }

  get upgradeCta() {
    return this.page.testSubj.locator('upgrade-cta');
  }

  get securitySolutionApp() {
    return this.page.locator('#security-solution-app');
  }
}
