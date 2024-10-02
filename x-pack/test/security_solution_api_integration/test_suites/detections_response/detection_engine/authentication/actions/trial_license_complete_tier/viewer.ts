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
import { getCustomQueryRuleParams, getSlackAction } from '../../../../utils';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';
import { deleteConnector } from '../../../../utils/connectors';

export default ({ getService }: FtrProviderContext): void => {
  const log = getService('log');
  const utils = getService('securitySolutionUtils');
  const es = getService('es');

  let viewer: TestAgent;
  let admin: TestAgent;
  let webhookAction: RuleAction;

  describe('@serverless @serverlessQA viewer actions API behaviors', () => {
    before(async () => {
      admin = await utils.createSuperTest('admin');
      viewer = await utils.createSuperTest('viewer');
      const { body: ruleAction } = await admin
        .post('/api/actions/action')
        .set('kbn-xsrf', 'true')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'foo')
        .send(getSlackAction())
        .expect(200);
      webhookAction = ruleAction;
    });

    after(async () => {
      await deleteConnector(admin, webhookAction.id);
    });

    describe('create connector', () => {
      it('should return 403 for viewer', async () => {
        await viewer
          .post('/api/actions/action')
          .set('kbn-xsrf', 'true')
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'foo')
          .send(getSlackAction())
          .expect(403);
      });
    });

    describe('update action', () => {
      afterEach(async () => {
        await deleteAllRules(admin, log);
        await deleteAllAlerts(admin, log, es);
      });

      it('should return 403 for viewer', async () => {
        await admin
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

        await viewer
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
      afterEach(async () => {
        await deleteAllRules(admin, log);
        await deleteAllAlerts(admin, log, es);
      });

      it('should return 403 for viewer', async () => {
        await admin
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

        await viewer
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
