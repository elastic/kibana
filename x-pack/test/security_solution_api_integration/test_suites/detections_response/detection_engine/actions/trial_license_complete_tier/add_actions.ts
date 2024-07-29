/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { DETECTION_ENGINE_RULES_URL } from '@kbn/security-solution-plugin/common/constants';
import { QueryRuleCreateProps } from '@kbn/security-solution-plugin/common/api/detection_engine';
import { getCases, waitForCases } from '../../../../../../cases_api_integration/common/lib/api';
import {
  deleteAllRules,
  waitForRuleSuccess,
  deleteAllAlerts,
  getRuleForAlertTesting,
  createRule,
} from '../../../../../../common/utils/security_solution';
import { FtrProviderContext } from '../../../../../ftr_provider_context';
import {
  createWebHookRuleAction,
  fetchRule,
  getAlerts,
  getCustomQueryRuleParams,
} from '../../../utils';
import { EsArchivePathBuilder } from '../../../../../es_archive_path_builder';

/**
 * Specific _id to use for some of the tests. If the archiver changes and you see errors
 * here, update this to a new value of a chosen auditbeat record and update the tests values.
 */
const ID = 'BhbXBmkBR346wHgn4PeZ';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const log = getService('log');
  // TODO: add a new service for loading archiver files similar to "getService('es')"
  const config = getService('config');
  const isServerless = config.get('serverless');
  const dataPathBuilder = new EsArchivePathBuilder(isServerless);
  const auditbeatPath = dataPathBuilder.getPath('auditbeat/hosts');

  describe('@serverless @serverlessQA @ess add_actions', () => {
    describe('adding actions', () => {
      before(async () => {
        await esArchiver.load(auditbeatPath);
        await esArchiver.load('x-pack/test/functional/es_archives/security_solution/alerts/8.8.0', {
          useCreate: true,
          docsOnly: true,
        });
      });
      after(async () => {
        await esArchiver.unload(auditbeatPath);
        await esArchiver.unload(
          'x-pack/test/functional/es_archives/signals/severity_risk_overrides'
        );
      });
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

      it('should create a case if a rule with the cases system action finds matching alerts', async () => {
        const rule: QueryRuleCreateProps = {
          ...getRuleForAlertTesting(['auditbeat-*']),
          query: `_id:${ID}`,
          actions: [
            {
              id: 'system-connector-.cases',
              params: {
                subAction: 'run',
                subActionParams: {
                  timeWindow: '7d',
                  reopenClosedCases: false,
                  groupingBy: ['agent.name'],
                },
              },
              action_type_id: '.cases',
            },
          ],
        };
        const createdRule = await createRule(supertest, log, rule);
        const alerts = await getAlerts(supertest, log, es, createdRule);
        await waitForCases(supertest, log);
        const cases = await getCases(supertest);
        expect(cases.cases[0].totalAlerts).toBeGreaterThan(0);
        expect(alerts.hits.hits.length).toBeGreaterThan(0);
        expect(alerts.hits.hits[0]._source?.['kibana.alert.ancestors'][0].id).toEqual(ID);
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
