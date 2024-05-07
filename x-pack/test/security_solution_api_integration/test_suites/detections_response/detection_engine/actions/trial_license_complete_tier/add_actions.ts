/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { DETECTION_ENGINE_RULES_URL } from '@kbn/security-solution-plugin/common/constants';
import {
  deleteAllRules,
  waitForRuleSuccess,
  deleteAllAlerts,
} from '../../../../../../common/utils/security_solution';
import { FtrProviderContext } from '../../../../../ftr_provider_context';
import { createWebHookRuleAction, fetchRule, getCustomQueryRuleParams } from '../../../utils';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const log = getService('log');
  const es = getService('es');

  describe('@serverless @serverlessQA @ess add_actions', () => {
    describe('adding actions', () => {
      beforeEach(async () => {
        await es.indices.delete({ index: 'logs-test', ignore_unavailable: true });
        await es.indices.create({
          index: 'logs-test',
          mappings: {
            properties: {
              '@timestamp': {
                type: 'date',
              },
            },
          },
        });
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);
      });

      it('creates rule with a new webhook action', async () => {
        const webhookAction = await createWebHookRuleAction(supertest);
        const ruleAction = {
          group: 'default',
          id: webhookAction.id,
          params: {
            body: '{}',
          },
          action_type_id: '.webhook',
        };

        const { body } = await supertest
          .post(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .set(ELASTIC_HTTP_VERSION_HEADER, '2023-10-31')
          .send(
            getCustomQueryRuleParams({
              actions: [ruleAction],
            })
          )
          .expect(200);

        expect(body.actions).toEqual([expect.objectContaining(ruleAction)]);
      });

      it('expects rule with a webhook action runs successfully', async () => {
        const webhookAction = await createWebHookRuleAction(supertest);

        const {
          body: { id },
        } = await supertest
          .post(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .set(ELASTIC_HTTP_VERSION_HEADER, '2023-10-31')
          .send(
            getCustomQueryRuleParams({
              index: ['logs-test'],
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
              enabled: true,
            })
          )
          .expect(200);

        await waitForRuleSuccess({ supertest, log, id });

        const rule = await fetchRule(supertest, { id });

        expect(rule?.execution_summary?.last_execution?.status).toBe('succeeded');
      });

      it('expects rule with a webhook action and meta field runs successfully', async () => {
        const webhookAction = await createWebHookRuleAction(supertest);

        const {
          body: { id },
        } = await supertest
          .post(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .set(ELASTIC_HTTP_VERSION_HEADER, '2023-10-31')
          .send(
            getCustomQueryRuleParams({
              index: ['logs-test'],
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
              meta: {},
              enabled: true,
            })
          )
          .expect(200);

        await waitForRuleSuccess({ supertest, log, id });

        const rule = await fetchRule(supertest, { id });

        expect(rule?.execution_summary?.last_execution?.status).toBe('succeeded');
      });
    });
  });
};
