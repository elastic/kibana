/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { DETECTION_ENGINE_RULES_URL } from '@kbn/security-solution-plugin/common/constants';
import { getCreateNewTermsRulesSchemaMock } from '@kbn/security-solution-plugin/common/detection_engine/rule_schema/mocks';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { deleteAllAlerts } from '../../utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const log = getService('log');

  /**
   * Specific api integration tests for new terms rule type
   */
  describe('create_new_terms', () => {
    afterEach(async () => {
      await deleteAllAlerts(supertest, log);
    });

    it('should not be able to create a new terms rule with too small history window', async () => {
      const rule = {
        ...getCreateNewTermsRulesSchemaMock('rule-1'),
        history_window_start: 'now-5m',
      };
      const response = await supertest
        .post(DETECTION_ENGINE_RULES_URL)
        .set('kbn-xsrf', 'true')
        .send(rule);

      expect(response.status).to.equal(400);
      expect(response.body.message).to.equal(
        "params invalid: History window size is smaller than rule interval + additional lookback, 'historyWindowStart' must be earlier than 'from'"
      );
    });

    it('should not be able to create a new terms rule with fields number greater than 3', async () => {
      const rule = {
        ...getCreateNewTermsRulesSchemaMock('rule-1'),
        history_window_start: 'now-5m',
        new_terms_fields: ['field1', 'field2', 'field3', 'field4'],
      };
      const response = await supertest
        .post(DETECTION_ENGINE_RULES_URL)
        .set('kbn-xsrf', 'true')
        .send(rule);

      expect(response.status).to.equal(400);
      expect(response.body.message).to.be(
        '[request body]: Array size (4) is out of bounds: min: 1, max: 3'
      );
    });
  });
};
