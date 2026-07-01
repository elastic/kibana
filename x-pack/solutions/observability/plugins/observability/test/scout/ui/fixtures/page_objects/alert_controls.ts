/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout-oblt';

/**
 * Interactions with the dashboard "Options List" controls rendered above the
 * Observability alerts table (e.g. the alert status control with id `0`).
 *
 * Ported from the FTR `alertControls` page object
 * (x-pack/solutions/observability/test/functional/page_objects/alert_controls.ts).
 * Page objects only drive the UI and return state; assertions live in the specs.
 */
export class AlertControls {
  constructor(private readonly page: ScoutPage) {}

  private controlFrame(controlId: string) {
    return this.page.locator(`[data-control-id="${controlId}"]`);
  }

  /**
   * Clears every selection from the given control via its hover "clear" action.
   */
  async clearControlSelections(controlId: string) {
    await this.controlFrame(controlId).hover();
    const hoverActions = this.page.testSubj.locator(`hover-actions-${controlId}`);
    await hoverActions.waitFor({ state: 'visible' });
    await hoverActions.locator('[data-test-subj="embeddablePanelAction-clearControl"]').click();
  }

  /**
   * Opens the options-list popover for the given control and waits for the
   * available options to be rendered.
   */
  async openOptionsListPopover(controlId: string) {
    await this.page.testSubj.click(`optionsList-control-${controlId}`);
    await this.page.testSubj
      .locator('optionsList-control-available-options')
      .waitFor({ state: 'visible' });
  }

  /**
   * Selects an available option from an already-open options-list popover.
   */
  async selectOption(availableOption: string) {
    await this.page.testSubj.click(`optionsList-control-selection-${availableOption}`);
  }

  /**
   * Closes the options-list popover for the given control if it is open.
   */
  async ensurePopoverIsClosed(controlId: string) {
    const availableOptions = this.page.testSubj.locator('optionsList-control-available-options');
    if (await availableOptions.isVisible()) {
      await this.page.testSubj.click(`optionsList-control-${controlId}`);
      await availableOptions.waitFor({ state: 'hidden' });
    }
  }
}
