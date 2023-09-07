/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import { InstallPrebuiltRulesAndTimelinesResponse } from '@kbn/security-solution-plugin/common/api/detection_engine/prebuilt_rules';
import type SuperTest from 'supertest';
import { createPrebuiltRuleAssetSavedObjects } from './create_prebuilt_rule_saved_objects';
import { installPrebuiltRulesAndTimelines } from './install_prebuilt_rules_and_timelines';

/**
 * Creates prebuilt rule mocks and installs them
 *
 * @param supertest Supertest instance
 * @param es Elasticsearch client
 * @returns Install prebuilt rules response
 */
export const installMockPrebuiltRules = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  es: Client
): Promise<InstallPrebuiltRulesAndTimelinesResponse> => {
  // Ensure there are prebuilt rule saved objects before installing rules
  await createPrebuiltRuleAssetSavedObjects(es);
  return installPrebuiltRulesAndTimelines(es, supertest);
};
