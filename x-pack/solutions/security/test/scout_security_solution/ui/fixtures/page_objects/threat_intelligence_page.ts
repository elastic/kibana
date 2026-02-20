/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';

const INDICATORS_URL = '/app/security/threat_intelligence/indicators';

export class ThreatIntelligencePage {
  constructor(private readonly page: ScoutPage) {}

  async goto() {
    await this.page.goto(INDICATORS_URL);
  }

  get indicatorsTable() {
    return this.page.testSubj.locator('tiIndicatorsTable');
  }

  get breadcrumbs() {
    return this.page.testSubj.locator('breadcrumbs');
  }

  get defaultLayoutTitle() {
    return this.page.testSubj.locator('default-layout-page-title');
  }

  get emptyState() {
    return this.page.testSubj.locator('tiIndicatorsEmptyState');
  }

  get addIntegrationsButton() {
    return this.page.testSubj.locator('add-integrations-button');
  }

  get fieldBrowser() {
    return this.page.testSubj.locator('show-field-browser');
  }

  get inspectorButton() {
    return this.page.testSubj.locator('inspectButton');
  }

  get queryInput() {
    return this.page.testSubj.locator('queryInput');
  }
}
