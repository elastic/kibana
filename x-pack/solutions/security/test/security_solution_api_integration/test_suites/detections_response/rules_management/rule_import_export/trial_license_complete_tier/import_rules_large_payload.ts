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
 * Scale regression guards. Dedicated long-timeout config. Legacy path may be
 * slow/flaky — intentional. Disabled count stays under the exclusive 10000 cap
 * (`createRulesLimitStream` rejects at `>= 10000`).
 */
const DISABLED_RULE_COUNT = 8000;
const ENABLED_RULE_COUNT = 2000;

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const detectionsApi = getService('detectionsApi');
  const log = getService('log');

  describe('@ess import rules large payload', function () {
    this.timeout(60 * 60 * 1000);

    beforeEach(async () => {
      await deleteAllRules(supertest, log);
    });

    it(`imports ${DISABLED_RULE_COUNT} disabled custom rules`, async () => {
      const rules = range(DISABLED_RULE_COUNT).map((i) =>
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
        success_count: DISABLED_RULE_COUNT,
        rules_count: DISABLED_RULE_COUNT,
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

      expect(body.total).toBe(DISABLED_RULE_COUNT);

      const { body: first } = await detectionsApi
        .readRule({ query: { rule_id: 'large-payload-rule-0' } })
        .expect(200);
      const { body: last } = await detectionsApi
        .readRule({ query: { rule_id: `large-payload-rule-${DISABLED_RULE_COUNT - 1}` } })
        .expect(200);

      expect(first).toMatchObject({
        name: 'Large payload rule 0',
        enabled: false,
      });
      expect(last).toMatchObject({
        name: `Large payload rule ${DISABLED_RULE_COUNT - 1}`,
        enabled: false,
      });
    });

    it(`imports ${ENABLED_RULE_COUNT} enabled custom rules`, async () => {
      const rules = range(ENABLED_RULE_COUNT).map((i) =>
        getCustomQueryRuleParams({
          rule_id: `large-payload-enabled-rule-${i}`,
          name: `Large payload enabled rule ${i}`,
          enabled: true,
        })
      );

      const importResponse = await importRules({
        getService,
        rules,
        overwrite: false,
      });

      expect(importResponse).toMatchObject({
        success: true,
        success_count: ENABLED_RULE_COUNT,
        rules_count: ENABLED_RULE_COUNT,
        errors: [],
      });

      const { body } = await detectionsApi
        .findRules({
          query: {
            page: 1,
            per_page: 10,
            filter: 'alert.attributes.enabled: true',
          },
        })
        .expect(200);

      expect(body.total).toBe(ENABLED_RULE_COUNT);
      expect(body.data.every((rule: { enabled: boolean }) => rule.enabled)).toBe(true);

      const { body: first } = await detectionsApi
        .readRule({ query: { rule_id: 'large-payload-enabled-rule-0' } })
        .expect(200);
      const { body: last } = await detectionsApi
        .readRule({
          query: { rule_id: `large-payload-enabled-rule-${ENABLED_RULE_COUNT - 1}` },
        })
        .expect(200);

      expect(first).toMatchObject({
        name: 'Large payload enabled rule 0',
        enabled: true,
      });
      expect(last).toMatchObject({
        name: `Large payload enabled rule ${ENABLED_RULE_COUNT - 1}`,
        enabled: true,
      });
    });
  });
};
