/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { setEbtOptIn } from './ebt';

const META_FIELDS = ['_score', '_id', '_index'];

interface EsqlEditor {
  codeEditor: { setCodeEditorValue: (value: string) => Promise<unknown> };
  submitQueryAndWait: () => Promise<void>;
}

/** Sets the ES|QL editor, then opts in, then submits. Opt-in must follow the edit so earlier navigation is not recorded. */
export async function submitRecordedEsqlQuery(
  page: ScoutPage,
  discover: EsqlEditor,
  query: string
) {
  await discover.codeEditor.setCodeEditorValue(query);
  await setEbtOptIn(page, true);
  await discover.submitQueryAndWait();
}

async function openMetaFields(page: ScoutPage) {
  const section = page.testSubj.locator('fieldListGroupedMetaFields');
  const isOpen = await section.evaluate((el) => el.classList.contains('euiAccordion-isOpen'));
  if (isOpen) {
    return;
  }
  await section.locator('.euiAccordion__arrow').dispatchEvent('click');
  await page
    .locator('[data-test-subj="fieldListGroupedMetaFields"].euiAccordion-isOpen')
    .waitFor({ state: 'visible' });
}

function fieldToggle(page: ScoutPage, section: string, field: string) {
  return page.testSubj.locator(section).locator(`[data-test-subj="fieldToggle-${field}"]`);
}

export async function addFieldToTable(page: ScoutPage, field: string) {
  const selected = page.testSubj
    .locator('fieldListGroupedSelectedFields')
    .locator(`[data-test-subj="field-${field}"]`);
  if (await selected.isVisible()) {
    return;
  }
  const sections = META_FIELDS.includes(field)
    ? ['fieldListGroupedMetaFields']
    : ['fieldListGroupedAvailableFields', 'fieldListGroupedPopularFields'];
  if (META_FIELDS.includes(field)) {
    await openMetaFields(page);
  }
  for (const section of sections) {
    const toggle = fieldToggle(page, section, field);
    if (await toggle.isVisible()) {
      await toggle.click();
      break;
    }
  }
  await selected.waitFor({ state: 'visible' });
}

export async function removeFieldFromTable(page: ScoutPage, field: string) {
  const selected = page.testSubj
    .locator('fieldListGroupedSelectedFields')
    .locator(`[data-test-subj="field-${field}"]`);
  if (!(await selected.isVisible())) {
    return;
  }
  await fieldToggle(page, 'fieldListGroupedSelectedFields', field).click();
  await selected.waitFor({ state: 'hidden' });
}

export async function addExistsFilter(page: ScoutPage, field: string) {
  await page.testSubj
    .locator('fieldListGroupedAvailableFields')
    .locator(`[data-test-subj="field-${field}"]`)
    .click();
  await page.locator('[data-popover-open="true"]').waitFor({ state: 'visible' });
  await page.locator('[data-test-subj*="-statsLoading"]').waitFor({ state: 'hidden' });
  await page.testSubj.locator(`discoverFieldListPanelAddExistFilter-${field}`).click();
}

export async function openSurroundingDocuments(page: ScoutPage) {
  const flyout = page.testSubj.locator('docViewerFlyout');
  await flyout
    .locator('[data-test-subj="docTableRowAction"][aria-label="View surrounding documents"]')
    .click();
}

export async function clickFlyoutFieldAction(page: ScoutPage, field: string, action: string) {
  const flyout = page.testSubj.locator('docViewerFlyout');
  // Log documents open on the overview tab. Column and filter actions live on the fields table.
  const tableTab = flyout.locator('[data-test-subj="docViewerTab-doc_view_table"]');
  if (await tableTab.isVisible()) {
    await tableTab.click();
  }
  const nameCell = ['addFilterForValueButton', 'addFilterOutValueButton'].includes(action);
  const cell = flyout.locator(
    `[data-test-subj="${
      nameCell ? `tableDocViewRow-${field}-value` : `tableDocViewRow-${field}-name`
    }"]`
  );
  await expect(async () => {
    await cell.evaluate((el) => {
      el.scrollIntoView({ block: 'center', inline: 'nearest' });
    });
    await cell.hover();
    const actionButton = flyout.locator(`[data-test-subj="${action}-${field}"]`);
    await actionButton.waitFor({ state: 'visible' });
    await actionButton.click();
  }).toPass({ timeout: 15_000 });
}

export async function toggleColumnInFlyout(
  page: ScoutPage,
  field: string,
  shouldBeAdded: boolean,
  afterToggle: () => Promise<void>
) {
  const headerCell = page.testSubj.locator(`dataGridHeaderCell-${field}`);
  await expect(async () => {
    if ((await headerCell.isVisible()) === shouldBeAdded) {
      return;
    }
    await clickFlyoutFieldAction(page, field, 'toggleColumnButton');
    await afterToggle();
    if (shouldBeAdded) {
      await expect(headerCell).toBeVisible();
    } else {
      await expect(headerCell).toBeHidden();
    }
  }).toPass({ timeout: 30_000 });
}
