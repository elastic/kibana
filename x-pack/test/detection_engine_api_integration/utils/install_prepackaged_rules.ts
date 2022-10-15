/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type SuperTest from 'supertest';

import { PREBUILT_RULES_URL } from '@kbn/security-solution-plugin/common/detection_engine/prebuilt_rules';
import { countDownTest } from './count_down_test';

export const installPrePackagedRules = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  log: ToolingLog
): Promise<void> => {
  await countDownTest(
    async () => {
      const { status, body } = await supertest
        .put(PREBUILT_RULES_URL)
        .set('kbn-xsrf', 'true')
        .send();
      if (status !== 200) {
        return {
          passed: false,
          errorMessage: `Did not get an expected 200 "ok" when installing pre-packaged rules (installPrePackagedRules) yet. Retrying until we get a 200 "ok". body: ${JSON.stringify(
            body
          )}, status: ${JSON.stringify(status)}`,
        };
      } else {
        return { passed: true };
      }
    },
    'installPrePackagedRules',
    log
  );
};
