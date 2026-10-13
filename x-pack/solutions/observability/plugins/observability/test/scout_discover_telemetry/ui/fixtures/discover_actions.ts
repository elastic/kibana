/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test as base } from '@kbn/scout-oblt';
import type { Locator, PageObjects, ScoutPage } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { setEbtOptIn } from './ebt';

const META_FIELDS = ['_score', '_id', '_index'];
const VALUE_CELL_ACTIONS = ['addFilterForValueButton', 'addFilterOutValueButton'];

export class DiscoverEbt {
  constructor(
    private readonly page: ScoutPage,
    private readonly discover: PageObjects['discover']
  ) {}

  /** Sets the ES|QL editor, then opts in, then submits. Opt-in must follow the edit so earlier navigation is not recorded. */
  async submitRecordedEsqlQuery(query: string): Promise<void> {
    await this.discover.codeEditor.setCodeEditorValue(query);
    await setEbtOptIn(this.page, true);
    await this.discover.submitQueryAndWait();
  }

  async addFieldToTable(field: string): Promise<void> {
    const isMetaField = META_FIELDS.includes(field);
    const sections = isMetaField
      ? ['fieldListGroupedMetaFields']
      : ['fieldListGroupedAvailableFields', 'fieldListGroupedPopularFields'];

    // The sidebar can render after the search finishes; checking toggles earlier finds none.
    await this.page.testSubj.locator(sections[0]).waitFor({ state: 'visible' });

    const selected = this.selectedField(field);
    if (await selected.isVisible()) {
      return;
    }

    if (isMetaField) {
      await this.openMetaFields();
    }

    for (const section of sections) {
      const toggle = this.fieldToggle(section, field);
      if (await toggle.isVisible()) {
        await toggle.click();
        break;
      }
    }

    await selected.waitFor({ state: 'visible' });
  }

  async removeFieldFromTable(field: string): Promise<void> {
    const selected = this.selectedField(field);
    // After a reload the sidebar renders after search finishes. An immediate
    // visibility check skips the click and the removal event never fires.
    await selected.waitFor({ state: 'visible' });
    await this.fieldToggle('fieldListGroupedSelectedFields', field).click();
    await selected.waitFor({ state: 'hidden' });
  }

  async addExistsFilter(field: string): Promise<void> {
    await this.page.testSubj
      .locator('fieldListGroupedAvailableFields')
      .locator(`[data-test-subj="field-${field}"]`)
      .click();
    await this.page.locator('[data-popover-open="true"]').waitFor({ state: 'visible' });
    await this.page.locator('[data-test-subj*="-statsLoading"]').waitFor({ state: 'hidden' });
    await this.page.testSubj.locator(`discoverFieldListPanelAddExistFilter-${field}`).click();
  }

  async openSurroundingDocuments(): Promise<void> {
    await this.page.testSubj
      .locator('docViewerFlyout')
      .locator('[data-test-subj="docTableRowAction"][aria-label="View surrounding documents"]')
      .click();
  }

  async waitForSurroundingDocuments(): Promise<void> {
    for (const testSubj of ['predecessorsLoadMoreButton', 'successorsLoadMoreButton']) {
      await expect(this.page.testSubj.locator(testSubj)).toBeEnabled({ timeout: 30_000 });
    }
  }

  async clickFlyoutFieldAction(field: string, action: string): Promise<void> {
    const flyout = this.page.testSubj.locator('docViewerFlyout');
    // Log documents open on the overview tab. Column and filter actions live on the fields table.
    const tableTab = flyout.locator('[data-test-subj="docViewerTab-doc_view_table"]');
    if (await tableTab.isVisible()) {
      await tableTab.click();
    }

    const cellSuffix = VALUE_CELL_ACTIONS.includes(action) ? 'value' : 'name';
    const cell = flyout.locator(`[data-test-subj="tableDocViewRow-${field}-${cellSuffix}"]`);

    await expect(async () => {
      await cell.evaluate((el) => {
        el.scrollIntoView({ block: 'center', inline: 'nearest' });
      });
      await cell.hover();
      const gridCell = cell.locator('xpath=ancestor::*[@data-gridcell-column-id][1]');
      await this.revealTanStackCellActions(gridCell);
      const actionButton = await this.getCellAction(gridCell, `${action}-${field}`);
      await actionButton.waitFor({ state: 'visible' });
      await actionButton.click();
    }).toPass({ timeout: 15_000 });
  }

  /**
   * The TanStack fields table shows a hovered cell's actions behind an ellipsis button, while
   * EuiDataGrid shows them directly. Opens them when the button is there.
   */
  private async revealTanStackCellActions(gridCell: Locator): Promise<void> {
    if (await gridCell.evaluate((element) => element.matches('.euiDataGridRowCell'))) {
      return;
    }
    const trigger = gridCell.locator('[data-test-subj="tanStackCellActionsButton"]');
    // The trigger is replaced by the actions once open, e.g. when a retry runs this again.
    const isTriggerVisible = await trigger
      .waitFor({ state: 'visible', timeout: 2_000 })
      .then(() => true)
      .catch(() => false);
    if (isTriggerVisible) {
      await trigger.click();
    }
  }

  /** A cell action of the hovered cell, also when the TanStack table portals it out of the cell. */
  private async getCellAction(gridCell: Locator, testSubj: string): Promise<Locator> {
    const selector = `[data-test-subj="${testSubj}"]`;
    const actionInCell = gridCell.locator(selector);
    return (await actionInCell.count()) > 0
      ? actionInCell
      : this.page.locator(`[role="toolbar"] ${selector}`);
  }

  async toggleColumnInFlyout(
    field: string,
    shouldBeAdded: boolean,
    afterToggle: () => Promise<void>
  ): Promise<void> {
    const headerCell = this.page.testSubj.locator(`dataGridHeaderCell-${field}`);

    await expect(async () => {
      if ((await headerCell.isVisible()) === shouldBeAdded) {
        return;
      }
      await this.clickFlyoutFieldAction(field, 'toggleColumnButton');
      await afterToggle();
      await expect(headerCell).toBeVisible({ visible: shouldBeAdded });
    }).toPass({ timeout: 30_000 });
  }

  private selectedField(field: string) {
    return this.page.testSubj
      .locator('fieldListGroupedSelectedFields')
      .locator(`[data-test-subj="field-${field}"]`);
  }

  private fieldToggle(section: string, field: string) {
    return this.page.testSubj.locator(section).locator(`[data-test-subj="fieldToggle-${field}"]`);
  }

  private async openMetaFields(): Promise<void> {
    const section = this.page.testSubj.locator('fieldListGroupedMetaFields');
    const isOpen = await section.evaluate((el) => el.classList.contains('euiAccordion-isOpen'));
    if (isOpen) {
      return;
    }
    await section.locator('.euiAccordion__arrow').dispatchEvent('click');
    await this.page
      .locator('[data-test-subj="fieldListGroupedMetaFields"].euiAccordion-isOpen')
      .waitFor({ state: 'visible' });
  }
}

interface DiscoverEbtFixtures {
  discoverEbt: DiscoverEbt;
}

export const test = base.extend<DiscoverEbtFixtures>({
  discoverEbt: async ({ page, pageObjects }, use) => {
    await use(new DiscoverEbt(page, pageObjects.discover));
  },
});
