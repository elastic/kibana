/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, ScoutPage } from '@kbn/scout-oblt';
import { EXTENDED_TIMEOUT } from '..';

export class FlamegraphPage {
  constructor(public readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {}

  async gotoWithTimeRange(rangeFrom: string, rangeTo: string) {
    await this.page.goto(
      `${this.kbnUrl.app(
        'profiling'
      )}/flamegraphs/flamegraph?rangeFrom=${rangeFrom}&rangeTo=${rangeTo}`
    );
    await this.page
      .getByRole('tab', { name: 'Differential flamegraph' })
      .waitFor({ timeout: EXTENDED_TIMEOUT });
  }

  async getWebGLWarning() {
    return this.page.testSubj.locator('profilingFlamegraphWebGLWarning');
  }

  async getFlamegraphChart() {
    return this.page.testSubj.locator('profilingFlamegraphChart');
  }

  async disableWebGL() {
    await this.page.addInitScript(() => {
      HTMLCanvasElement.prototype.getContext = () => null;
    });
  }
}
