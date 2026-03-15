/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout';
import { waitForPageReady } from '../../common/page_utils';

/** Asset Criticality upload page */
export class EntityAnalyticsAssetCriticalityPage {
  constructor(private readonly page: ScoutPage) {}

  public get pageTitle(): Locator {
    return this.page.testSubj.locator('entityStoreManagementPage');
  }

  public get filePicker(): Locator {
    return this.page.testSubj.locator('asset-criticality-file-picker');
  }

  public get assignButton(): Locator {
    return this.page.testSubj.locator('asset-criticality-assign-button');
  }

  public get resultStep(): Locator {
    return this.page.testSubj.locator('asset-criticality-result-step-success');
  }

  public get validLinesMessage(): Locator {
    return this.page.testSubj.locator('asset-criticality-validLinesMessage');
  }

  public get invalidLinesMessage(): Locator {
    return this.page.testSubj.locator('asset-criticality-invalidLinesMessage');
  }

  async navigate(): Promise<void> {
    await this.page.gotoApp('security/entity_analytics_asset_criticality');
    await waitForPageReady(this.page);
  }

  async uploadFile(buffer: Buffer, fileName = 'asset_criticality.csv'): Promise<void> {
    await this.filePicker.first().setInputFiles({
      name: fileName,
      mimeType: 'text/csv',
      buffer,
    });
  }

  async clickAssign(): Promise<void> {
    await this.assignButton.first().click();
  }
}
