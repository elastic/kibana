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
    // The tab bar renders after the case fetch, so it is the page-ready signal.
    await this.page.testSubj.locator('case-view-tabs').waitFor({ state: 'visible' });
    await this.page.testSubj.locator(`comment-action-show-alert-${commentId}`).click();
  }
}
