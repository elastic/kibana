/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { waitForPageReady } from '../../common/page_utils';

const INDICATORS_URL = '/app/security/threat_intelligence/indicators';

export class ThreatIntelligencePage {
  constructor(private readonly page: ScoutPage) {}

  async goto() {
    await this.page.goto(INDICATORS_URL);
    await waitForPageReady(this.page);
  }

  public get indicatorsTable() {
    return this.page.testSubj.locator('tiIndicatorsTable');
  }

  public get breadcrumbs() {
    return this.page.testSubj.locator('breadcrumbs');
  }

  public get defaultLayoutTitle() {
    return this.page.testSubj.locator('default-layout-page-title');
  }

  public get emptyState() {
    return this.page.testSubj.locator('tiIndicatorsEmptyState');
  }

  public get addIntegrationsButton() {
    return this.page.testSubj.locator('add-integrations-button');
  }

  public get fieldBrowser() {
    return this.page.testSubj.locator('show-field-browser');
  }

  public get inspectorButton() {
    return this.page.testSubj.locator('inspectButton');
  }

  public get queryInput() {
    return this.page.testSubj.locator('queryInput');
  }
}
