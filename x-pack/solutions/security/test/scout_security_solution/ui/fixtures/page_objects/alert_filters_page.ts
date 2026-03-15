/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout';

export class AlertFiltersPage {
  readonly page: ScoutPage;

  readonly filterGroupWrapper: Locator;
  readonly filterGroupLoading: Locator;
  readonly contextMenuButton: Locator;
  readonly contextMenu: Locator;
  readonly resetButton: Locator;
  readonly editControlsButton: Locator;
  readonly discardChangesButton: Locator;
  readonly addControlButton: Locator;
  readonly saveChangesButton: Locator;
  readonly controlEditorFlyout: Locator;
  readonly changedBanner: Locator;

  /* Control editor panel */
  readonly fieldSearchInput: Locator;
  readonly fieldLabelInput: Locator;
  readonly controlEditorSaveButton: Locator;
  readonly controlEditorCancelButton: Locator;
  readonly fieldTypeFilterButton: Locator;

  constructor(page: ScoutPage) {
    this.page = page;

    this.filterGroupWrapper = page.locator('.filter-group__wrapper');
    this.filterGroupLoading = page.testSubj.locator('filter-group__loading');
    this.contextMenuButton = page.testSubj.locator('filter-group__context');
    this.contextMenu = page.testSubj.locator('filter-group__context-menu');
    this.resetButton = page.testSubj.locator('filter-group__context--reset');
    this.editControlsButton = page.testSubj.locator('filter-group__context--edit');
    this.discardChangesButton = page.testSubj.locator('filter-group__context--discard');
    this.addControlButton = page.testSubj.locator('filter-group__add-control');
    this.saveChangesButton = page.testSubj.locator('filter-group__save');
    this.controlEditorFlyout = page.testSubj.locator('control-editor-flyout');
    this.changedBanner = page.testSubj.locator('filter-group--changed-banner');

    /* Control editor panel */
    this.fieldSearchInput = page.testSubj.locator('field-search-input');
    this.fieldLabelInput = page.testSubj.locator('control-editor-title-input');
    this.controlEditorSaveButton = page.testSubj.locator('control-editor-save');
    this.controlEditorCancelButton = page.testSubj.locator('control-editor-cancel');
    this.fieldTypeFilterButton = page.testSubj.locator('toggleFieldFilterButton');
  }

  getControlFrame(index: number): Locator {
    return this.page.testSubj.locator('control-frame').nth(index);
  }

  getControlFrameTitle(index: number): Locator {
    return this.page.testSubj.locator('control-frame-title').nth(index);
  }

  getControlFrameCount(): Locator {
    return this.page.testSubj.locator('control-frame');
  }

  getOptionListControl(index: number): Locator {
    return this.page.testSubj.locator(`optionsList-control-${index}`);
  }

  getFieldPicker(fieldName: string): Locator {
    return this.page.testSubj.locator(`field-picker-select-${fieldName}`);
  }

  getDeleteAction(index: number): Locator {
    return this.page.testSubj
      .locator(`hover-actions-${index}`)
      .locator('[data-test-subj="embeddablePanelAction-deletePanel"]');
  }

  getEditAction(index: number): Locator {
    return this.page.testSubj
      .locator(`hover-actions-${index}`)
      .locator('[data-test-subj="embeddablePanelAction-editPanel"]');
  }

  async openContextMenu(): Promise<void> {
    await this.contextMenuButton.scrollIntoViewIfNeeded();
    await this.contextMenuButton.click();
    await this.contextMenu.waitFor({ state: 'visible' });
  }

  async switchToEditMode(): Promise<void> {
    await this.openContextMenu();
    await this.editControlsButton.click();
  }

  async discardChanges(): Promise<void> {
    await this.openContextMenu();
    await this.discardChangesButton.click();
  }

  async saveChanges(): Promise<void> {
    await this.saveChangesButton.click();
    await this.saveChangesButton.waitFor({ state: 'hidden' });
  }

  async resetControls(): Promise<void> {
    await this.openContextMenu();
    await this.resetButton.click();
  }

  async deleteControl(index: number): Promise<void> {
    await this.getControlFrameTitle(index).hover();
    await this.getDeleteAction(index).click();
  }

  async addControl(fieldName: string): Promise<void> {
    await this.addControlButton.click();
    await this.controlEditorFlyout.waitFor({ state: 'visible' });
    await this.getFieldPicker(fieldName).click();
    await this.controlEditorSaveButton.click();
    await this.controlEditorFlyout.waitFor({ state: 'hidden' });
  }

  async editControl(index: number, fieldName: string): Promise<void> {
    await this.getControlFrameTitle(index).hover();
    await this.getEditAction(index).click();
    await this.controlEditorFlyout.waitFor({ state: 'visible' });
    await this.fieldLabelInput.clear();
    await this.getFieldPicker(fieldName).click({ force: true });
    await this.controlEditorSaveButton.click();
    await this.controlEditorFlyout.waitFor({ state: 'hidden' });
  }

  async waitForFiltersToLoad(): Promise<void> {
    await this.filterGroupLoading.waitFor({ state: 'hidden', timeout: 30_000 });
  }
}
