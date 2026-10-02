/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout-security';
import { ALERTZERO_APP_ID } from '@kbn/alertzero-common';

export class WatchSettingsPage {
  readonly warningTooltip: Locator;

  constructor(private readonly page: ScoutPage) {
    this.warningTooltip = this.page.getByRole('tooltip');
  }

  /** Opens a Watch and waits until the given Worker's card has rendered from the Workers API. */
  async goto(watchId: string, workerId: string) {
    await this.page.gotoApp(`${ALERTZERO_APP_ID}/watches/${watchId}`);
    await this.enabledSwitch(workerId).waitFor({ state: 'visible' });
  }

  enabledSwitch(workerId: string): Locator {
    return this.page.testSubj.locator(`alertZeroWorkerEnabledSwitch-${workerId}`);
  }

  warningIcon(workerId: string): Locator {
    return this.page.testSubj.locator(`alertZeroWorkerWarningIcon-${workerId}`);
  }

  noModelLink(workerId: string): Locator {
    return this.warningTooltip.locator(`[data-test-subj="alertZeroWorkerNoModelLink-${workerId}"]`);
  }

  modelsRow(workerId: string): Locator {
    return this.page.testSubj.locator(`alertZeroModelsRow-${workerId}`);
  }

  modelsLink(workerId: string): Locator {
    return this.page.testSubj.locator(`alertZeroModelsLink-${workerId}`);
  }

  async showWarnings(workerId: string) {
    await this.warningIcon(workerId).hover();
    await this.warningTooltip.waitFor({ state: 'visible' });
  }

  async hideWarnings() {
    await this.page.mouse.move(0, 0);
    await this.warningTooltip.waitFor({ state: 'hidden' });
  }
}
