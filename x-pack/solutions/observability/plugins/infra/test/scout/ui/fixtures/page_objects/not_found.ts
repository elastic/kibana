/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, Locator, ScoutPage } from '@kbn/scout-oblt';
import { EXTENDED_TIMEOUT } from '../constants';

/**
 * Page object for the shared infra "Page not found" screen (`infraNotFoundPage`).
 * It renders inside both the Logs (`infraLogsPage`) and Metrics
 * (`infraMetricsPage`) app shells for in-app routes that don't match, so the
 * helpers navigate to an arbitrary sub-route and wait for the owning app shell
 * to mount before the spec asserts whether the not-found page is shown.
 */
export class NotFoundPage {
  public readonly notFoundPage: Locator;
  public readonly logsApp: Locator;
  public readonly metricsApp: Locator;

  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {
    this.notFoundPage = this.page.getByTestId('infraNotFoundPage');
    this.logsApp = this.page.getByTestId('infraLogsPage');
    this.metricsApp = this.page.getByTestId('infraMetricsPage');
  }

  async gotoLogsRoute(path: string) {
    await this.page.goto(`${this.kbnUrl.app('logs')}/${path}`);
    await this.logsApp.waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
  }

  async gotoMetricsRoute(path: string) {
    await this.page.goto(`${this.kbnUrl.app('metrics')}/${path}`);
    await this.metricsApp.waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
  }
}
