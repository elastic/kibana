/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout-oblt';

export class SavedViews {
  public readonly selector: Locator;
  public readonly manageViewsButton: Locator;
  public readonly updateViewButton: Locator;
  public readonly saveNewViewButton: Locator;

  public readonly upsertModal: Locator;
  public readonly viewNameInput: Locator;
  public readonly includeTimeCheckbox: Locator;
  public readonly cancelUpsertButton: Locator;
  public readonly confirmUpsertButton: Locator;

  public readonly manageViewsFlyout: Locator;
  public readonly manageViewsFilterInput: Locator;
  public readonly manageViewsTable: Locator;

  constructor(private readonly page: ScoutPage) {
    this.selector = this.page.getByTestId('savedViews-openPopover-loaded');
    this.manageViewsButton = this.page.getByTestId('savedViews-manageViews');
    this.updateViewButton = this.page.getByTestId('savedViews-updateView');
    this.saveNewViewButton = this.page.getByTestId('savedViews-saveNewView');

    this.upsertModal = this.page.getByTestId('savedViews-upsertModal');
    this.viewNameInput = this.upsertModal.getByTestId('savedViewName');
    this.includeTimeCheckbox = this.upsertModal.getByTestId('savedViews-includeTimeCheckbox');
    this.cancelUpsertButton = this.upsertModal.getByTestId('infraSavedViewCreateModalCancelButton');
    this.confirmUpsertButton = this.upsertModal.getByTestId('createSavedViewButton');

    this.manageViewsFlyout = this.page.getByTestId('loadViewsFlyout');
    this.manageViewsFilterInput = this.manageViewsFlyout.getByRole('searchbox');
    this.manageViewsTable = this.manageViewsFlyout.getByTestId('savedViews-viewsTable');
  }

  public async waitForViewsToLoad() {
    await this.selector.waitFor();
  }

  public async createView(viewName: string, opts: { saveTime?: boolean } = {}) {
    await this.selector.click();
    await this.saveNewViewButton.click();
    await this.viewNameInput.fill(viewName);

    if (opts.saveTime) {
      await this.includeTimeCheckbox.click();
    }

    await this.confirmUpsertButton.click();
    await this.upsertModal.waitFor({ state: 'hidden' });
  }

  public async saveCurrentView(newName?: string) {
    await this.selector.click();
    await this.updateViewButton.click();

    if (newName) {
      await this.viewNameInput.clear();
      await this.viewNameInput.fill(newName);
    }

    await this.confirmUpsertButton.click();
    await this.upsertModal.waitFor({ state: 'hidden' });
  }
}
