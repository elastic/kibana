/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout-oblt';

export class AlertPage {
  constructor(private readonly page: ScoutPage) {}

  /**
   * Navigates to the Alert Details page
   */
  async goto(alertId: string = '') {
    await this.page.gotoApp(`observability/alerts/${alertId}`);
  }
}
