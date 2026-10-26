/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSuperSelectObject, Locator, ScoutPage } from '@kbn/scout-oblt';
import type { ProfilingSchema } from '@kbn/profiling-utils';
import { EXTENDED_TIMEOUT } from '..';

const SCHEMA_SELECT_TEST_SUBJ = 'profilingSchemaSelect';

export class ProfilingSchemaSelector {
  readonly schemaSelect: EuiSuperSelectObject;
  readonly invalidSchemaToken: Locator;

  constructor(private readonly page: ScoutPage) {
    this.schemaSelect = page.components.superSelect(SCHEMA_SELECT_TEST_SUBJ);
    this.invalidSchemaToken = page.getByTestId('profilingSchemaSelectorInvalidToken');
  }

  async waitForSelectedSchema() {
    await this.schemaSelect.locator
      .and(this.page.getByRole('button', { disabled: false }))
      .waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
  }

  async selectSchema(schema: ProfilingSchema) {
    await this.schemaSelect.selectOptionByValue(schema);
    await this.waitForSelectedSchema();
  }

  async getSelectedSchema() {
    return this.schemaSelect.getSelectedValue();
  }
}
