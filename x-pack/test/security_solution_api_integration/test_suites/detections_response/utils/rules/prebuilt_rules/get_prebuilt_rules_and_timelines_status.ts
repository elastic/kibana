/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ReadPrebuiltRulesAndTimelinesStatusResponse,
  PREBUILT_RULES_STATUS_URL,
} from '@kbn/security-solution-plugin/common/api/detection_engine/prebuilt_rules';
import type SuperTest from 'supertest';
import type { Client } from '@elastic/elasticsearch';
import { refreshSavedObjectIndices } from '../../refresh_index';

/**
 * (LEGACY)
 * Helper to retrieve the prebuilt rules status
 *
 * @param supertest The supertest deps
 */
export const getPrebuiltRulesAndTimelinesStatus = async (
  es: Client,
  supertest: SuperTest.Agent
): Promise<ReadPrebuiltRulesAndTimelinesStatusResponse> => {
  await refreshSavedObjectIndices(es);

  const response = await supertest
    .get(PREBUILT_RULES_STATUS_URL)
    .set('kbn-xsrf', 'true')
    .set('elastic-api-version', '2023-10-31')
    .send()
    .expect(200);

  return response.body;
};
