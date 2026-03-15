/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout';

const ROUTES = {
  responseActionsHistory: '/app/security/administration/response_actions_history',
};

export class ResponseActionsPage {
  readonly responsePage: Locator;
  readonly actionsTable: Locator;

  constructor(private readonly page: ScoutPage) {
    this.responsePage = this.page.testSubj.locator('responseActionsPage');
    this.actionsTable = this.page.testSubj.locator('response-actions-list-table-loaded');
  }

  async navigate() {
    await this.page.goto(ROUTES.responseActionsHistory);
    await this.page.waitForLoadingIndicatorHidden();
  }

  async waitForTableLoaded() {
    await this.actionsTable.waitFor({ state: 'visible' });
  }
}
