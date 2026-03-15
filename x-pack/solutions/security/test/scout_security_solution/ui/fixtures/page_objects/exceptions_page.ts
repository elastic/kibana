/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout';
import { waitForPageReady } from '../../common/page_utils';

export class ExceptionsPage {
  readonly addExceptionBtn: Locator;
  readonly addEndpointExceptionBtn: Locator;
  readonly exceptionFlyout: Locator;
  readonly exceptionFlyoutTitle: Locator;
  readonly exceptionItemCard: Locator;
  readonly exceptionFieldInput: Locator;
  readonly exceptionOperatorInput: Locator;
  readonly exceptionValuesInput: Locator;
  readonly addExceptionConditionBtn: Locator;
  readonly confirmExceptionBtn: Locator;
  readonly closeExceptionFlyoutBtn: Locator;
  readonly exceptionListsTable: Locator;
  readonly exceptionListsSearchInput: Locator;
  readonly exceptionListNameInput: Locator;
  readonly exceptionListDescriptionInput: Locator;
  readonly createSharedListBtn: Locator;
  readonly importListBtn: Locator;
  readonly exportListBtn: Locator;
  readonly deleteListBtn: Locator;
  readonly duplicateListBtn: Locator;
  readonly linkRuleBtn: Locator;
  readonly exceptionItemsCount: Locator;
  readonly exceptionListDetailHeader: Locator;
  readonly exceptionCommentInput: Locator;

  constructor(private readonly page: ScoutPage) {
    this.addExceptionBtn = this.page.testSubj.locator('addExceptionListItemButton');
    this.addEndpointExceptionBtn = this.page.testSubj.locator('addEndpointExceptionBtn');
    this.exceptionFlyout = this.page.testSubj.locator('addExceptionFlyout');
    this.exceptionFlyoutTitle = this.page.testSubj.locator('exceptionFlyoutTitle');
    this.exceptionItemCard = this.page.testSubj.locator('exceptionItemCard');
    this.exceptionFieldInput = this.page.testSubj.locator('fieldAutocompleteComboBox');
    this.exceptionOperatorInput = this.page.testSubj.locator('operatorAutocompleteComboBox');
    this.exceptionValuesInput = this.page.testSubj.locator('valuesAutocompleteMatch');
    this.addExceptionConditionBtn = this.page.testSubj.locator('exceptionsAndButton');
    this.confirmExceptionBtn = this.page.testSubj.locator('addExceptionConfirmButton');
    this.closeExceptionFlyoutBtn = this.page.testSubj.locator('euiFlyoutCloseButton');
    this.exceptionListsTable = this.page.testSubj.locator('exceptions-list-table');
    this.exceptionListsSearchInput = this.page.testSubj.locator('exceptionsHeaderSearch');
    this.exceptionListNameInput = this.page.testSubj.locator('exceptionListNameInput');
    this.exceptionListDescriptionInput = this.page.testSubj.locator(
      'exceptionListDescriptionInput'
    );
    this.createSharedListBtn = this.page.testSubj.locator('exceptionsCreateSharedListButton');
    this.importListBtn = this.page.testSubj.locator('importExceptionListButton');
    this.exportListBtn = this.page.testSubj.locator('exportExceptionListButton');
    this.deleteListBtn = this.page.testSubj.locator('deleteExceptionListButton');
    this.duplicateListBtn = this.page.testSubj.locator('duplicateExceptionListButton');
    this.linkRuleBtn = this.page.testSubj.locator('linkExceptionListToRuleButton');
    this.exceptionItemsCount = this.page.testSubj.locator('exceptionItemsCount');
    this.exceptionListDetailHeader = this.page.testSubj.locator('exceptionListDetailHeader');
    this.exceptionCommentInput = this.page.testSubj.locator('exceptionCommentInput');
  }

  async gotoSharedExceptionLists(): Promise<void> {
    await this.page.goto('/app/security/exceptions');
    await waitForPageReady(this.page);
  }

  async gotoExceptionListDetail(listId: string): Promise<void> {
    await this.page.goto(`/app/security/exceptions/shared/${listId}`);
    await waitForPageReady(this.page);
  }

  async searchExceptionLists(query: string): Promise<void> {
    await this.exceptionListsSearchInput.fill(query);
    await this.exceptionListsSearchInput.press('Enter');
  }

  async openAddExceptionFlyout(): Promise<void> {
    await this.addExceptionBtn.click();
    await this.exceptionFlyout.waitFor({ state: 'visible', timeout: 10_000 });
  }

  async fillExceptionEntry(field: string, operator: string, value: string): Promise<void> {
    await this.exceptionFieldInput.click();
    await this.exceptionFieldInput.locator('input').fill(field);
    await this.page.getByRole('option', { name: field }).click();

    await this.exceptionOperatorInput.click();
    await this.page.getByRole('option', { name: operator }).click();

    await this.exceptionValuesInput.locator('input').fill(value);
    await this.exceptionValuesInput.locator('input').press('Enter');
  }

  async submitException(): Promise<void> {
    await this.confirmExceptionBtn.click();
  }

  async addComment(comment: string): Promise<void> {
    await this.exceptionCommentInput.fill(comment);
  }

  async closeExceptionFlyout(): Promise<void> {
    await this.page.keyboard.press('Escape');
  }

  async waitForExceptionListsToLoad(): Promise<void> {
    await this.exceptionListsTable.waitFor({ state: 'visible', timeout: 30_000 });
  }
}
