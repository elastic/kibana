/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ScoutPage, Locator } from '@kbn/scout';

const PAGE_URL = 'security/entity_analytics';

export class EntityAnalyticsPage {
  public enableRiskEngineBtn: Locator;

  constructor(private readonly page: ScoutPage) {
    this.enableRiskEngineBtn = this.page.testSubj.locator('enable_risk_score');
  }

  async navigate() {
    await this.page.gotoApp(PAGE_URL);
  }

  async enableRiskEngine() {
    await this.enableRiskEngineBtn.click();
  }
}
