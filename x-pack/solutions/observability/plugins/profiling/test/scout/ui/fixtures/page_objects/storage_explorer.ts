/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, Locator, ScoutPage } from '@kbn/scout-oblt';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { EXTENDED_TIMEOUT } from '..';

export class ProfilingStorageExplorerPage {
  public otelNotSupportedCallout: Locator;
  constructor(public readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {
    this.otelNotSupportedCallout = this.page.getByTestId(
      'profilingStorageExplorerOtelNotSupportedCallout'
    );
  }

  async dismissOtelNotSupportedCallout() {
    await this.page
      .getByTestId('profilingStorageExplorerOtelNotSupportedCalloutDismissButton')
      .click();
  }

  async gotoWithTimeRange(rangeFrom: string, rangeTo: string, kuery?: string) {
    let url = `${this.kbnUrl.app(
      'profiling'
    )}/storage-explorer?rangeFrom=${rangeFrom}&rangeTo=${rangeTo}`;
    if (kuery) {
      url += `&kuery=${encodeURIComponent(kuery)}`;
    }
    await this.page.goto(url);

    await this.waitForStorageExplorerPage();
  }

  /*
   * Waits for the Storage explorer page to be visible
   */
  private async waitForStorageExplorerPage() {
    await this.page
      .getByTestId(APP_HEADER_TEST_SUBJECTS.title)
      .getByText('Storage explorer')
      .waitFor({ timeout: EXTENDED_TIMEOUT });
  }
}
