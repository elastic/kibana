/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type SuperTest from 'supertest';

import {
  CoverageOverviewFilter,
  CoverageOverviewResponse,
  RULE_MANAGEMENT_COVERAGE_OVERVIEW_URL,
} from '@kbn/security-solution-plugin/common/api/detection_engine';

export const getCoverageOverview = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  filter?: CoverageOverviewFilter
): Promise<CoverageOverviewResponse> => {
  const response = await supertest
    .post(RULE_MANAGEMENT_COVERAGE_OVERVIEW_URL)
    .set('kbn-xsrf', 'true')
    .set('elastic-api-version', '1')
    .set('x-elastic-internal-origin', 'foo')
    .send({ filter })
    .expect(200);

  return response.body;
};
