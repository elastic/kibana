/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_LOAD_TIMEOUT_MS } from '@kbn/scout-security';
import type { Locator, ScoutPage } from '@kbn/scout-security';

/**
 * Automatic Troubleshooting (workflow insights) section of the endpoint details flyout.
 * Actions and locators only; the spec asserts.
 */
export class EndpointDetailsInsightsPage {
  readonly wrapper: Locator;
  readonly connectorSelector: Locator;
  readonly scanButton: Locator;

  constructor(private readonly page: ScoutPage) {
    this.wrapper = this.page.testSubj.locator('endpointDetailsInsightsWrapper');
    this.connectorSelector = this.page.testSubj.locator('connector-selector');
    this.scanButton = this.page.testSubj.locator('workflowInsightsScanButton');
  }

  /** Opens the endpoint list with the details flyout of `agentId` already selected. */
  async goto(agentId: string): Promise<void> {
    await this.page.gotoApp('security/administration/endpoints', {
      params: { selected_endpoint: agentId, show: 'details' },
      readyWhen: this.wrapper,
      // The flyout renders after the user privileges, the endpoint list init and the host
      // metadata load; on a cold first load that can take longer than the 30s default.
      readyTimeout: APP_LOAD_TIMEOUT_MS,
    });
  }
}
