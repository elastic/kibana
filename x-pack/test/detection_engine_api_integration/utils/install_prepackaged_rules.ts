/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import {
  InstallPrebuiltRulesAndTimelinesResponse,
  PREBUILT_RULES_URL,
} from '@kbn/security-solution-plugin/common/detection_engine/prebuilt_rules';
import type { ToolingLog } from '@kbn/tooling-log';
import type SuperTest from 'supertest';
import { createPrebuiltRuleAssetSavedObjects } from './create_prebuilt_rule_saved_objects';

export const installPrePackagedRules = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  es: Client,
  log: ToolingLog
): Promise<InstallPrebuiltRulesAndTimelinesResponse> => {
  // Ensure there are prebuilt rule saved objects before installing rules
  await createPrebuiltRuleAssetSavedObjects(es);
  const response = await supertest.put(PREBUILT_RULES_URL).set('kbn-xsrf', 'true').send();
  if (response.status !== 200) {
    log.error(
      `Did not get an expected 200 "ok" when installing prebuilt rules. body: ${JSON.stringify(
        response.body
      )}, status: ${JSON.stringify(response.status)}`
    );
  }
  return response.body;
};
