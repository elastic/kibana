/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { waitForPageReady } from '../../common/page_utils';

const ASSET_INVENTORY_URL = '/app/security/asset_inventory';

export class AssetInventoryPage {
  constructor(private readonly page: ScoutPage) {}

  async goto() {
    await this.page.goto(ASSET_INVENTORY_URL);
    await waitForPageReady(this.page);
  }

  public get allAssetsTitle() {
    return this.page.testSubj.locator('asset-inventory-test-subj-page-title');
  }

  public get dataGridColumnSelector() {
    return this.page.testSubj.locator('dataGridColumnSelectorButton');
  }

  public get dataGridSorting() {
    return this.page.testSubj.locator('dataGridColumnSortingButton');
  }

  public get dataGridHeader() {
    return this.page.testSubj.locator('dataGridHeader');
  }

  public get flyoutRightPanel() {
    return this.page.testSubj.locator('rightSection');
  }

  public get flyoutCards() {
    return this.page.testSubj.locator('responsive-data-card');
  }

  public get takeActionButton() {
    return this.page.testSubj.locator('take-action-button');
  }

  public get investigateInTimelineButton() {
    return this.page.testSubj.locator('investigate-in-timeline-take-action-button');
  }

  public get timelineBody() {
    return this.page.testSubj.locator('timeline-body');
  }

  public get typeFilterBox() {
    return this.page.testSubj.locator('optionsList-control-0');
  }

  public get nameFilterBox() {
    return this.page.testSubj.locator('optionsList-control-1');
  }

  public get idFilterBox() {
    return this.page.testSubj.locator('optionsList-control-2');
  }

  filterValueLocator(value: string) {
    return this.page.testSubj.locator(`optionsList-control-selection-${value}`);
  }

  public get docTableExpandToggle() {
    return this.page.testSubj.locator('docTableExpandToggleColumn');
  }

  public get noPrivilegesBox() {
    return this.page.testSubj.locator('noPrivilegesPage');
  }
}
