/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { waitForPageReady } from '../../common/page_utils';
import { GET_STARTED_URL_PATH } from '../../common/urls';

export class SiemMigrationsPage {
  constructor(private readonly page: ScoutPage) {}

  async goto() {
    await this.page.goto(GET_STARTED_URL_PATH);
    await waitForPageReady(this.page);
  }

  public get onboardingSiemMigrationsList() {
    return this.page.testSubj.locator('onboarding-siem-migrations-list');
  }

  public get ruleMigrationsGroupPanel() {
    return this.page.testSubj.locator('rule-migrations-group-panel');
  }

  public get migrationPanelName() {
    return this.page.testSubj.locator('migration-panel-name');
  }

  public get uploadRulesBtn() {
    return this.page.testSubj.locator('upload-rules-btn');
  }

  public get uploadRulesFlyout() {
    return this.page.testSubj.locator('upload-rules-flyout');
  }
}
