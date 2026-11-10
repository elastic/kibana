/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout-oblt';
import { APP_HEADER_TEST_SUBJECTS, getAppMenuActionButtonTestSubj } from '@kbn/app-header';
import { EXTENDED_TIMEOUT } from '..';

export class ProfilingAddDataPage {
  readonly otelInstructions: Locator;

  constructor(private readonly page: ScoutPage) {
    this.otelInstructions = page.getByTestId('profilingOtelAddDataInstructions');
  }

  async openFromHeader() {
    await this.page.getByTestId(getAppMenuActionButtonTestSubj('add-data')).click();
    await this.page
      .getByTestId(APP_HEADER_TEST_SUBJECTS.title)
      .getByText('Add profiling data')
      .waitFor({ timeout: EXTENDED_TIMEOUT });
  }

  getSchemaTab(name: string) {
    return this.page.getByRole('tab', { name, exact: true });
  }

  getUniversalProfilingTab(key: string) {
    return this.page.getByTestId(`profilingAddDataViewTab-${key}`);
  }
}
