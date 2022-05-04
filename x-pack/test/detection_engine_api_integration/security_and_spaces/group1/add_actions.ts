/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { CreateRulesSchema } from '@kbn/security-solution-plugin/common/detection_engine/schemas/request';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createSignalsIndex,
  deleteAllAlerts,
  deleteSignalsIndex,
  removeServerGeneratedProperties,
  getWebHookAction,
  getRuleWithWebHookAction,
  getSimpleRuleOutputWithWebHookAction,
  waitForRuleSuccessOrStatus,
  createRule,
} from '../../utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const log = getService('log');

  describe('add_actions', () => {
    describe('adding actions', () => {
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

      it('should be able to create a new webhook action and attach it to a rule', async () => {
        // create a new action
        const { body: hookAction } = await supertest
          .post('/api/actions/action')
          .set('kbn-xsrf', 'true')
          .send(getWebHookAction())
          .expect(200);

        const rule = await createRule(supertest, log, getRuleWithWebHookAction(hookAction.id));
        const bodyToCompare = removeServerGeneratedProperties(rule);
        expect(bodyToCompare).to.eql(
          getSimpleRuleOutputWithWebHookAction(`${bodyToCompare?.actions?.[0].id}`)
        );
      });

      it('should be able to create a new webhook action and attach it to a rule without a meta field and run it correctly', async () => {
        // create a new action
        const { body: hookAction } = await supertest
          .post('/api/actions/action')
          .set('kbn-xsrf', 'true')
          .send(getWebHookAction())
          .expect(200);

        const rule = await createRule(
          supertest,
          log,
          getRuleWithWebHookAction(hookAction.id, true)
        );
        await waitForRuleSuccessOrStatus(supertest, log, rule.id);
      });

      it('should be able to create a new webhook action and attach it to a rule with a meta field and run it correctly', async () => {
        // create a new action
        const { body: hookAction } = await supertest
          .post('/api/actions/action')
          .set('kbn-xsrf', 'true')
          .send(getWebHookAction())
          .expect(200);

        // create a rule with the action attached and a meta field
        const ruleWithAction: CreateRulesSchema = {
          ...getRuleWithWebHookAction(hookAction.id, true),
          meta: {},
        };

        const rule = await createRule(supertest, log, ruleWithAction);
        await waitForRuleSuccessOrStatus(supertest, log, rule.id);
      });
    });
  });
};
