/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  InstallPrebuiltRulesAndTimelinesResponse,
  PREBUILT_RULES_URL,
} from '@kbn/security-solution-plugin/common/api/detection_engine/prebuilt_rules';
import type { Client } from '@elastic/elasticsearch';
import type SuperTest from 'supertest';
import { refreshSavedObjectIndices } from '../../refresh_index';

/**
 * (LEGACY)
 * Installs all prebuilt rules and timelines available in Kibana. Rules are
 * installed from the security-rule saved objects.
 * This is a legacy endpoint and has been replaced by:
 * POST /internal/detection_engine/prebuilt_rules/installation/_perform
 *
 * - No rules will be installed if there are no security-rule assets (e.g., the
 *   package is not installed or mocks are not created).
 *
 * - If some prebuilt rules are already installed, they will be upgraded in case
 *   there are newer versions of them in security-rule assets.
 *
 * @param supertest SuperTest instance
 * @returns Install prebuilt rules response
 */
export const installPrebuiltRulesAndTimelines = async (
  es: Client,
  supertest: SuperTest.Agent
): Promise<InstallPrebuiltRulesAndTimelinesResponse> => {
  const response = await supertest
    .put(PREBUILT_RULES_URL)
    .set('kbn-xsrf', 'true')
    .set('elastic-api-version', '2023-10-31')
    .send()
    .expect(200);

  await refreshSavedObjectIndices(es);

  return response.body;
};
