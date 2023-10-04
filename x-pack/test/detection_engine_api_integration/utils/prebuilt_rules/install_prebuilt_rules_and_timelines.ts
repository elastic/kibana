/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type SuperTest from 'supertest';
import { ALL_SAVED_OBJECT_INDICES } from '@kbn/core-saved-objects-server';
import {
  InstallPrebuiltRulesAndTimelinesResponse,
  PREBUILT_RULES_URL,
} from '@kbn/security-solution-plugin/common/detection_engine/prebuilt_rules';

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
  supertest: SuperTest.SuperTest<SuperTest.Test>
): Promise<InstallPrebuiltRulesAndTimelinesResponse> => {
  const response = await supertest
    .put(PREBUILT_RULES_URL)
    .set('kbn-xsrf', 'true')
    .send()
    .expect(200);

  // Before we proceed, we need to refresh saved object indices.
  // At the previous step we installed the prebuilt detection rules SO of type 'security-rule'.
  // The savedObjectsClient does this with a call with explicit `refresh: false`.
  // So, despite of the fact that the endpoint waits until the prebuilt rule will be
  // successfully indexed, it doesn't wait until they become "visible" for subsequent read
  // operations.
  // And this is usually what we do next in integration tests: we read these SOs with utility
  // function such as getPrebuiltRulesAndTimelinesStatus().
  // This can cause race condition between a write and subsequent read operation, and to
  // fix it deterministically we have to refresh saved object indices and wait until it's done.
  await es.indices.refresh({ index: ALL_SAVED_OBJECT_INDICES });

  return response.body;
};
