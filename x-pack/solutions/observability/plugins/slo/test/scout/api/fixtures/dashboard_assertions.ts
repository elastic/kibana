/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/api';

/**
 * Internal dashboard create POST may return 200 (OK) or 201 (Created) depending on
 * Kibana routing/version; both mean success for these tests.
 */
export function assertDashboardCreateSuccess(response: { statusCode: number }): void {
  expect([200, 201]).toContain(response.statusCode);
}
