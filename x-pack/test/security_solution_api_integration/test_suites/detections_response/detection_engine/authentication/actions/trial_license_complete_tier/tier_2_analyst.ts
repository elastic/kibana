/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import TestAgent from 'supertest/lib/agent';
import { DETECTION_ENGINE_RULES_URL } from '@kbn/security-solution-plugin/common/constants';
import { X_ELASTIC_INTERNAL_ORIGIN_REQUEST } from '@kbn/core-http-common';
import { RuleAction } from '@kbn/security-solution-plugin/common/api/detection_engine';
import {
  deleteAllAlerts,
  deleteAllRules,
} from '../../../../../../../common/utils/security_solution';
import {
  createWebHookRuleAction,
  getCustomQueryRuleParams,
  getWebHookAction,
} from '../../../../utils';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';
import { deleteConnector } from '../../../../utils/connectors';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const log = getService('log');
  const utils = getService('securitySolutionUtils');
  const es = getService('es');

  let t2Analyst: TestAgent;
  let webhookAction: RuleAction;

  describe('@serverless @serverlessQA t2_analyst actions API behaviors', () => {
    before(async () => {
      t2Analyst = await utils.createSuperTest('t2_analyst');
      webhookAction = await createWebHookRuleAction(supertest);
    });

    after(async () => {
      await deleteConnector(supertest, webhookAction.id);
    });

    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      await deleteAllAlerts(supertest, log, es);
    });

    describe('create connector', () => {
      it('should return 403 for t2_analyst', async () => {
        await t2Analyst
          .post('/api/actions/action')
          .set('kbn-xsrf', 'true')
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'foo')
          .send(getWebHookAction())
          .expect(403);
      });
    });

    describe('update action', () => {
      it('should return 403 for t2_analyst', async () => {
        await supertest
          .post(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send(getCustomQueryRuleParams({ rule_id: 'rule-1' }))
          .expect(200);

        const ruleAction = {
          group: 'default',
          id: webhookAction.id,
          params: {
            body: '{}',
          },
          action_type_id: '.webhook',
        };

        await t2Analyst
          .put(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send(
            getCustomQueryRuleParams({
              rule_id: 'rule-1',
              actions: [ruleAction],
            })
          )
          .expect(403);
      });
    });

    describe('remove action', () => {
      it('should return 403 for t2_analyst', async () => {
        await supertest
          .post(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send(
            getCustomQueryRuleParams({
              rule_id: 'rule-1',
              actions: [
                {
                  group: 'default',
                  id: webhookAction.id,
                  params: {
                    body: '{}',
                  },
                  action_type_id: '.webhook',
                },
              ],
            })
          )
          .expect(200);

        await t2Analyst
          .put(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send(
            getCustomQueryRuleParams({
              rule_id: 'rule-1',
              actions: undefined,
            })
          )
          .expect(403);
      });
    });
  });
};
