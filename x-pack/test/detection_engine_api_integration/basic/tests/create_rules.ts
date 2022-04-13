/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { CreateRulesSchema } from '../../../../plugins/security_solution/common/detection_engine/schemas/request';

import { DETECTION_ENGINE_RULES_URL } from '../../../../plugins/security_solution/common/constants';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createSignalsIndex,
  deleteAllAlerts,
  deleteSignalsIndex,
  getSimpleRule,
  getSimpleRuleOutput,
  getSimpleRuleOutputWithoutRuleId,
  getSimpleRuleWithoutRuleId,
  removeServerGeneratedProperties,
  removeServerGeneratedPropertiesIncludingRuleId,
  getSimpleMlRule,
} from '../../utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const log = getService('log');

  describe('create_rules', () => {
    describe('creating rules', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/auditbeat/hosts');
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/auditbeat/hosts');
      });

      beforeEach(async () => {
        await createSignalsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteSignalsIndex(supertest, log);
        await deleteAllAlerts(supertest, log);
      });

      it('should create a single rule with a rule_id', async () => {
        const { body } = await supertest
          .post(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(getSimpleRule())
          .expect(200);

        const bodyToCompare = removeServerGeneratedProperties(body);
        expect(bodyToCompare).to.eql(getSimpleRuleOutput());
      });

      it('should create a single rule without an input index', async () => {
        const rule: CreateRulesSchema = {
          name: 'Simple Rule Query',
          description: 'Simple Rule Query',
          enabled: true,
          risk_score: 1,
          rule_id: 'rule-1',
          severity: 'high',
          type: 'query',
          query: 'user.name: root or user.name: admin',
        };
        const expected = {
          actions: [],
          author: [],
          created_by: 'elastic',
          description: 'Simple Rule Query',
          enabled: true,
          false_positives: [],
          from: 'now-6m',
          immutable: false,
          interval: '5m',
          rule_id: 'rule-1',
          language: 'kuery',
          output_index: '.siem-signals-default',
          max_signals: 100,
          risk_score: 1,
          risk_score_mapping: [],
          name: 'Simple Rule Query',
          query: 'user.name: root or user.name: admin',
          references: [],
          severity: 'high',
          severity_mapping: [],
          updated_by: 'elastic',
          tags: [],
          to: 'now',
          type: 'query',
          threat: [],
          throttle: 'no_actions',
          exceptions_list: [],
          version: 1,
        };

        const { body } = await supertest
          .post(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(rule)
          .expect(200);

        const bodyToCompare = removeServerGeneratedProperties(body);
        expect(bodyToCompare).to.eql(expected);
      });

      it('should create a single rule without a rule_id', async () => {
        const { body } = await supertest
          .post(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(getSimpleRuleWithoutRuleId())
          .expect(200);

        const bodyToCompare = removeServerGeneratedPropertiesIncludingRuleId(body);
        expect(bodyToCompare).to.eql(getSimpleRuleOutputWithoutRuleId());
      });

      it('should give a 403 when trying to create a single Machine Learning rule since the license is basic', async () => {
        const { body } = await supertest
          .post(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(getSimpleMlRule())
          .expect(403);

        const bodyToCompare = removeServerGeneratedProperties(body);
        expect(bodyToCompare).to.eql({
          message: 'Your license does not support machine learning. Please upgrade your license.',
          status_code: 403,
        });
      });

      it('should cause a 409 conflict if we attempt to create the same rule_id twice', async () => {
        await supertest
          .post(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(getSimpleRule())
          .expect(200);

        const { body } = await supertest
          .post(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(getSimpleRule())
          .expect(409);

        expect(body).to.eql({
          message: 'rule_id: "rule-1" already exists',
          status_code: 409,
        });
      });
    });
  });
};
