/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout-security';

/**
 * Case view entry into an attached alert. Actions only; the spec asserts.
 */
export class CaseViewPage {
  constructor(private readonly page: ScoutPage) {}

  async openAttachedAlert(caseId: string, commentId: string): Promise<void> {
    await this.page.gotoApp(`security/cases/${caseId}`);
    // Cold navigation stays on case-view-loading until the case fetch returns.
    // The default 10s action timeout is too short for that on a busy serverless agent.
    await this.page.testSubj
      .locator('case-view-tabs')
      .waitFor({ state: 'visible', timeout: 30_000 });
    // The alert row is a second request. Wait for the control this method clicks.
    await this.page.testSubj
      .locator(`comment-action-show-alert-${commentId}`)
      .click({ timeout: 30_000 });
  }
}
