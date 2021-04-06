/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line max-classes-per-file
import { WebElementWrapper } from '../../../../test/functional/services/lib/web_element_wrapper';
import { FtrProviderContext } from '../ftr_provider_context';

interface FillTagFormFields {
  name?: string;
  color?: string;
  description?: string;
}

type TagFormValidation = FillTagFormFields;

export function TagManagementPageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const browser = getService('browser');
  const PageObjects = getPageObjects(['header', 'common', 'savedObjects', 'settings']);
  const retry = getService('retry');

  /**
   * Sub page object to manipulate the create/edit tag modal.
   */
  class TagModal {
    constructor(private readonly page: TagManagementPage) {}
    /**
     * Open the create tag modal, by clicking on the associated button.
     */
    async openCreate() {
      return await testSubjects.click('createTagButton');
    }

    /**
     * Open the edit tag modal for given tag name. The tag must be in the currently displayed tags.
     */
    async openEdit(tagName: string) {
      await this.page.clickEdit(tagName);
    }

    /**
     * Fills the given fields in the form.
     *
     * If a field is undefined, will not set the value (use a empty string for that)
     * If `submit` is true, will call `clickConfirm` once the fields have been filled.
     */
    async fillForm(fields: FillTagFormFields, { submit = false }: { submit?: boolean } = {}) {
      if (fields.name !== undefined) {
        await testSubjects.click('createModalField-name');
        await testSubjects.setValue('createModalField-name', fields.name);
      }
      if (fields.color !== undefined) {
        // EuiColorPicker does not allow to specify data-test-subj for the colorpicker input
        await testSubjects.setValue('colorPickerAnchor', fields.color);
      }
      if (fields.description !== undefined) {
        await testSubjects.click('createModalField-description');
        await testSubjects.setValue('createModalField-description', fields.description);
      }

      if (submit) {
        await this.clickConfirm();
      }
    }

    /**
     * Return the values currently displayed in the form.
     */
    async getFormValues(): Promise<Required<FillTagFormFields>> {
      return {
        name: await testSubjects.getAttribute('createModalField-name', 'value'),
        color: await testSubjects.getAttribute('colorPickerAnchor', 'value'),
        description: await testSubjects.getAttribute('createModalField-description', 'value'),
      };
    }

    /**
     * Return the validation errors currently displayed for each field.
     */
    async getValidationErrors(): Promise<TagFormValidation> {
      const errors: TagFormValidation = {};

      const getError = async (rowDataTestSubj: string) => {
        const row = await testSubjects.find(rowDataTestSubj);
        const errorElements = await row.findAllByClassName('euiFormErrorText');
        return errorElements.length ? await errorElements[0].getVisibleText() : undefined;
      };

      errors.name = await getError('createModalRow-name');
      errors.color = await getError('createModalRow-color');
      errors.description = await getError('createModalRow-description');

      return errors;
    }

    /**
     * Returns true if the form as at least one error displayed, false otherwise
     */
    async hasError() {
      const errors = await this.getValidationErrors();
      return Boolean(errors.name || errors.color || errors.description);
    }

    /**
     * Click on the 'cancel' button in the create/edit modal.
     */
    async clickCancel() {
      await testSubjects.click('createModalCancelButton');
    }

    /**
     * Click on the 'confirm' button in the create/edit modal if not disabled.
     */
    async clickConfirm() {
      await testSubjects.click('createModalConfirmButton');
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    /**
     * Return true if the confirm button is disabled, false otherwise.
     */
    async isConfirmDisabled() {
      const disabled = await testSubjects.getAttribute('createModalConfirmButton', 'disabled');
      return disabled === 'true';
    }

    /**
     * Return true if the modal is currently opened.
     */
    async isOpened() {
      return await testSubjects.exists('tagModalForm');
    }

    /**
     * Wait until the modal is closed.
     */
    async waitUntilClosed() {
      await retry.try(async () => {
        if (await this.isOpened()) {
          throw new Error('save modal still open');
        }
      });
    }

    /**
     * Close the modal if currently opened.
     */
    async closeIfOpened() {
      if (await this.isOpened()) {
        await this.clickCancel();
      }
    }
  }

  /**
   * Sub page object to manipulate the assign flyout.
   */
  class TagAssignmentFlyout {
    constructor(private readonly page: TagManagementPage) {}

    /**
     * Open the tag assignment flyout, by selected given `tagNames` in the table, then clicking on the `assign`
     * action in the bulk action menu.
     */
    async open(tagNames: string[]) {
      for (const tagName of tagNames) {
        await this.page.selectTagByName(tagName);
      }
      await this.page.clickOnBulkAction('assign');
      await this.waitUntilResultsAreLoaded();
    }

    /**
     * Click on the 'cancel' button in the assign flyout.
     */
    async clickCancel() {
      await testSubjects.click('assignFlyoutCancelButton');
      await this.page.waitUntilTableIsLoaded();
    }

    /**
     * Click on the 'confirm' button in the assign flyout.
     */
    async clickConfirm() {
      await testSubjects.click('assignFlyoutConfirmButton');
      await this.waitForFlyoutToClose();
      await this.page.waitUntilTableIsLoaded();
    }

    /**
     * Click on an assignable object result line in the flyout result list.
     */
    async clickOnResult(type: string, id: string) {
      await testSubjects.click(`assign-result-${type}-${id}`);
    }

    /**
     * Wait until the assignable object results are displayed in the flyout.
     */
    async waitUntilResultsAreLoaded() {
      return find.waitForDeletedByCssSelector(
        '*[data-test-subj="assignFlyoutResultList"] .euiLoadingSpinner'
      );
    }

    /**
     * Wait until the flyout is closed.
     */
    async waitForFlyoutToClose() {
      return testSubjects.waitForDeleted('assignFlyoutResultList');
    }
  }

  /**
   * Tag management page object.
   *
   * @remarks All the table manipulation helpers makes the assumption
   *          that all tags are displayed on a single page. Pagination
   *          and finding / interacting with a tag on another page is not supported.
   */
  class TagManagementPage {
    public readonly tagModal = new TagModal(this);
    public readonly assignFlyout = new TagAssignmentFlyout(this);

    /**
     * Navigate to the tag management section, by accessing the management app, then clicking
     * on the `tags` link.
     */
    async navigateTo() {
      await PageObjects.settings.navigateTo();
      await testSubjects.click('tags');
      await this.waitUntilTableIsLoaded();
    }

    /**
     * Wait until the tags table is displayed and is not in a the loading state
     */
    async waitUntilTableIsLoaded() {
      return retry.try(async () => {
        const isLoaded = await find.existsByDisplayedByCssSelector(
          '*[data-test-subj="tagsManagementTable"]:not(.euiBasicTable-loading)'
        );

        if (isLoaded) {
          return true;
        } else {
          throw new Error('Waiting');
        }
      });
    }

    /**
     * Type given `term` in the table's search bar
     */
    async searchForTerm(term: string) {
      const searchBox = await testSubjects.find('tagsManagementSearchBar');
      await searchBox.clearValue();
      await searchBox.type(term);
      await searchBox.pressKeys(browser.keys.ENTER);
      await PageObjects.header.waitUntilLoadingHasFinished();
      await this.waitUntilTableIsLoaded();
    }

    /**
     * Return true if the `Create new tag` button is visible, false otherwise.
     */
    async isCreateButtonVisible() {
      return await testSubjects.exists('createTagButton');
    }

    /**
     * Returns true if given action is available from the table action column
     */
    async isActionAvailable(action: string) {
      const rows = await testSubjects.findAll('tagsTableRow');
      const firstRow = rows[0];
      // if there is more than 2 actions, they are wrapped in a popover that opens from a new action.
      const menuActionPresent = await testSubjects.descendantExists(
        'euiCollapsedItemActionsButton',
        firstRow
      );
      if (menuActionPresent) {
        const actionButton = await testSubjects.findDescendant(
          'euiCollapsedItemActionsButton',
          firstRow
        );
        await actionButton.click();
        const actionPresent = await testSubjects.exists(`tagsTableAction-${action}`);
        await actionButton.click();
        return actionPresent;
      } else {
        return await testSubjects.exists(`tagsTableAction-${action}`);
      }
    }

    /**
     * Return the (table ordered) name of the tags currently displayed in the table.
     */
    async getDisplayedTagNames() {
      const tags = await this.getDisplayedTagsInfo();
      return tags.map((tag) => tag.name);
    }

    /**
     * Return true if the 'connections' link is displayed for given tag name.
     *
     * Having the link not displayed can either mean that the user don't have the view
     * permission to see the connections, or that the tag don't have any.
     */
    async isConnectionLinkDisplayed(tagName: string) {
      const tags = await this.getDisplayedTagsInfo();
      const tag = tags.find((t) => t.name === tagName);
      return tag ? tag.connectionCount !== undefined : false;
    }

    /**
     * Click the 'edit' action button in the table for given tag name.
     */
    async clickEdit(tagName: string) {
      const tagRow = await this.getRowByName(tagName);
      if (tagRow) {
        const editButton = await testSubjects.findDescendant('tagsTableAction-edit', tagRow);
        await editButton?.click();
      }
    }

    /**
     * Return the raw `WebElementWrapper` of the table's row for given tag name.
     */
    async getRowByName(tagName: string) {
      const tagNames = await this.getDisplayedTagNames();
      const tagIndex = tagNames.indexOf(tagName);
      const rows = await testSubjects.findAll('tagsTableRow');
      return rows[tagIndex];
    }

    /**
     * Click on the 'connections' link in the table for given tag name.
     */
    async clickOnConnectionsLink(tagName: string) {
      const tagRow = await this.getRowByName(tagName);
      const connectionLink = await testSubjects.findDescendant(
        'tagsTableRowConnectionsLink',
        tagRow
      );
      await connectionLink.click();
    }

    /**
     * Return true if the selection column is displayed on the table, false otherwise.
     */
    async isSelectionColumnDisplayed() {
      const firstRow = await testSubjects.find('tagsTableRow');
      const checkbox = await firstRow.findAllByCssSelector(
        '.euiTableRowCellCheckbox .euiCheckbox__input'
      );
      return Boolean(checkbox.length);
    }

    /**
     * Click on the selection checkbox of the tag matching given tag name.
     */
    async selectTagByName(tagName: string) {
      const tagRow = await this.getRowByName(tagName);
      const checkbox = await tagRow.findByCssSelector(
        '.euiTableRowCellCheckbox .euiCheckbox__input'
      );
      await checkbox.click();
    }

    /**
     * Returns true if the tag bulk action menu is displayed, false otherwise.
     */
    async isActionMenuButtonDisplayed() {
      return testSubjects.exists('actionBar-contextMenuButton');
    }

    /**
     * Open the bulk action menu if not already opened.
     */
    async openActionMenu() {
      if (!(await this.isActionMenuOpened())) {
        await this.toggleActionMenu();
      }
    }

    /**
     * Check if the action for given `actionId` is present in the bulk action menu.
     *
     * The menu will automatically be opened if not already, but the test must still
     * select tags to make the action menu button appear.
     */
    async isBulkActionPresent(actionId: string) {
      if (!(await this.isActionMenuButtonDisplayed())) {
        return false;
      }
      const menuWasOpened = await this.isActionMenuOpened();
      if (!menuWasOpened) {
        await this.openActionMenu();
      }

      const actionExists = await testSubjects.exists(`actionBar-button-${actionId}`);

      if (!menuWasOpened) {
        await this.toggleActionMenu();
      }

      return actionExists;
    }

    /**
     * Click on given bulk action button
     */
    async clickOnBulkAction(actionId: string) {
      await this.openActionMenu();
      await testSubjects.click(`actionBar-button-${actionId}`);
    }

    /**
     * Toggle (close if opened, open if closed) the bulk action menu.
     */
    async toggleActionMenu() {
      await testSubjects.click('actionBar-contextMenuButton');
    }

    /**
     * Return true if the bulk action menu is opened, false otherwise.
     */
    async isActionMenuOpened() {
      return testSubjects.exists('actionBar-contextMenuPopover');
    }

    /**
     * Return the info of all the tags currently displayed in the table (in table's order)
     */
    async getDisplayedTagsInfo() {
      const rows = await testSubjects.findAll('tagsTableRow');
      return Promise.all([...rows.map(parseTableRow)]);
    }

    async getDisplayedTagInfo(tagName: string) {
      const rows = await this.getDisplayedTagsInfo();
      return rows.find((row) => row.name === tagName);
    }

    /**
     * Converts the tagName to the format used in test subjects
     * @param tagName
     */
    testSubjFriendly(tagName: string) {
      return tagName.replace(' ', '_');
    }
  }

  const parseTableRow = async (row: WebElementWrapper) => {
    const dom = await row.parseDomContent();

    const connectionsText = dom.findTestSubject('tagsTableRowConnectionsLink').text();
    const rawConnectionCount = connectionsText.replace(/[^0-9]/g, '');
    const connectionCount = rawConnectionCount ? parseInt(rawConnectionCount, 10) : undefined;

    // ideally we would also return the color, but it can't be easily retrieved from the DOM
    return {
      name: dom.findTestSubject('tagsTableRowName').find('.euiTableCellContent').text(),
      description: dom
        .findTestSubject('tagsTableRowDescription')
        .find('.euiTableCellContent')
        .text(),
      connectionCount,
    };
  };

  return new TagManagementPage();
}
