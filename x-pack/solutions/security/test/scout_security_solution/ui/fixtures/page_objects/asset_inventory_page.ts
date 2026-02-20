/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';

const ASSET_INVENTORY_URL = '/app/security/asset_inventory';

export class AssetInventoryPage {
  constructor(private readonly page: ScoutPage) {}

  async goto() {
    await this.page.goto(ASSET_INVENTORY_URL);
  }

  get allAssetsTitle() {
    return this.page.testSubj.locator('asset-inventory-test-subj-page-title');
  }

  get dataGridColumnSelector() {
    return this.page.testSubj.locator('dataGridColumnSelectorButton');
  }

  get dataGridSorting() {
    return this.page.testSubj.locator('dataGridColumnSortingButton');
  }

  get dataGridHeader() {
    return this.page.testSubj.locator('dataGridHeader');
  }

  get flyoutRightPanel() {
    return this.page.testSubj.locator('rightSection');
  }

  get flyoutCards() {
    return this.page.testSubj.locator('responsive-data-card');
  }

  get takeActionButton() {
    return this.page.testSubj.locator('take-action-button');
  }

  get investigateInTimelineButton() {
    return this.page.testSubj.locator('investigate-in-timeline-take-action-button');
  }

  get timelineBody() {
    return this.page.testSubj.locator('timeline-body');
  }

  get typeFilterBox() {
    return this.page.testSubj.locator('optionsList-control-0');
  }

  get nameFilterBox() {
    return this.page.testSubj.locator('optionsList-control-1');
  }

  get idFilterBox() {
    return this.page.testSubj.locator('optionsList-control-2');
  }

  filterValueLocator(value: string) {
    return this.page.testSubj.locator(`optionsList-control-selection-${value}`);
  }

  get docTableExpandToggle() {
    return this.page.testSubj.locator('docTableExpandToggleColumn');
  }

  get noPrivilegesBox() {
    return this.page.testSubj.locator('noPrivilegesPage');
  }
}
