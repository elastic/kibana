/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';

import { DETECTION_ENGINE_RULES_URL } from '@kbn/security-solution-plugin/common/constants';
import { combineToNdJson, getCustomQueryRuleParams } from '../../../../utils';
import { deleteAllRules } from '../../../../../../../common/utils/security_solution';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const log = getService('log');

  describe('@ess @serverless @skipInServerlessMKI import_rules', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
    });

    describe('calculation of the rule_source fields', () => {
      // TODO if we do this, how do distinguish a custom rule from a prebuilt one?
      it('calculates a version of 1 for custom rules');

      it('rejects a prebuilt rule with an unspecified version', async () => {
        const rule = getCustomQueryRuleParams();
        delete rule.version;
        const ndjson = combineToNdJson(rule);

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', Buffer.from(ndjson), 'rules.ndjson')
          .expect(200);

        expect(body.errors).toHaveLength(1);
        expect(body.errors[0]).toMatchObject({
          error: {
            message: 'Rules must specify a "version" to be imported. [rule_id: rule-1]',
            status_code: 400,
          },
        });
      });
    });
  });
};
