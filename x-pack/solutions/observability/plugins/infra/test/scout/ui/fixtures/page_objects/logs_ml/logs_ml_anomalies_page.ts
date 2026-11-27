/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout-oblt';
import { LogsMlPage } from './logs_ml_page';

/** Logs Anomalies page (`/app/logs/anomalies`), backed by the log entry rate ML job. */
export class LogsMlAnomaliesPage extends LogsMlPage {
  protected readonly route = 'anomalies';
  public readonly pageContainer: Locator;
  public readonly setupScreen: Locator;

  constructor(page: ScoutPage) {
    super(page);
    this.pageContainer = this.page.testSubj.locator('logsLogEntryRatePage');
    this.setupScreen = this.page.testSubj.locator('logEntryRateSetupPage');
  }
}
