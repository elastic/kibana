/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { range } from 'lodash';
import { deleteAllRules } from '@kbn/detections-response-ftr-services';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';
import { getCustomQueryRuleParams, importRules } from '../../../utils';

/**
 * Scale regression guard at the import size cap. Runs under a dedicated FTR
 * config (long mocha timeout). Expect this to be slow or flaky on the legacy
 * per-rule import path — that is the point of putting it on the pipeline.
 */
const RULE_COUNT = 10000;

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const detectionsApi = getService('detectionsApi');
  const log = getService('log');

  describe('@ess import rules large payload', function () {
    // Importing 10k rules on the legacy path can take a long time.
    this.timeout(60 * 60 * 1000);

    beforeEach(async () => {
      await deleteAllRules(supertest, log);
    });

    it(`imports ${RULE_COUNT} disabled custom rules`, async () => {
      const rules = range(RULE_COUNT).map((i) =>
        getCustomQueryRuleParams({
          rule_id: `large-payload-rule-${i}`,
          name: `Large payload rule ${i}`,
          enabled: false,
        })
      );

      const importResponse = await importRules({
        getService,
        rules,
        overwrite: false,
      });

      expect(importResponse).toMatchObject({
        success: true,
        success_count: RULE_COUNT,
        rules_count: RULE_COUNT,
        errors: [],
      });

      const { body } = await detectionsApi
        .findRules({
          query: {
            page: 1,
            per_page: 1,
          },
        })
        .expect(200);

      expect(body.total).toBe(RULE_COUNT);
    });
  });
};
