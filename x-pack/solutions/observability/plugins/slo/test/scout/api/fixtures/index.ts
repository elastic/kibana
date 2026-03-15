/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mergeTests } from '@kbn/scout-oblt';
import { apiTest as baseApiTest, sloDataFixture } from '@kbn/scout-oblt';

/** API test with SLO data fixture for tests that need generated SLO data */
export const apiTest = mergeTests(baseApiTest, sloDataFixture);

export {
  COMMON_HEADERS,
  DASHBOARD_API_PATH,
  SLO_BURN_RATE_EMBEDDABLE_ID,
  SLO_ERROR_BUDGET_ID,
  SLO_OVERVIEW_EMBEDDABLE_ID,
} from './constants';
