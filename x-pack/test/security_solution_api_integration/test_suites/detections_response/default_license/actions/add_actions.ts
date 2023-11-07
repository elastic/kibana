/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { RuleCreateProps } from '@kbn/security-solution-plugin/common/api/detection_engine';
import {
  createAlertsIndex,
  deleteAllRules,
  removeServerGeneratedProperties,
  getWebHookAction,
  getRuleWithWebHookAction,
  getSimpleRuleOutputWithWebHookAction,
  waitForRuleSuccess,
  createRule,
  deleteAllAlerts,
  updateUsername,
} from '../../utils';
import { FtrProviderContext } from '../../../../ftr_provider_context';
import { EsArchivePathBuilder } from '../../../../es_archive_path_builder';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const log = getService('log');
  const es = getService('es');
  // TODO: add a new service
  const config = getService('config');
  const ELASTICSEARCH_USERNAME = config.get('servers.kibana.username');
  const isServerless = config.get('serverless');
  const dataPathBuilder = new EsArchivePathBuilder(isServerless);
  const path = dataPathBuilder.getPath('auditbeat/hosts');

  describe('@serverless @ess add_actions', () => {
    describe('adding actions', () => {
      before(async () => {
        await esArchiver.load(path);
      });

      after(async () => {
        await esArchiver.unload(path);
      });

      beforeEach(async () => {
        await createAlertsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);
      });

      it('should be able to create a new webhook action and attach it to a rule', async () => {
        // create a new action
        const { body: hookAction } = await supertest
          .post('/api/actions/action')
          .set('kbn-xsrf', 'true')
          .set('x-elastic-internal-origin', 'foo')
          .send(getWebHookAction())
          .expect(200);

        const rule = await createRule(supertest, log, getRuleWithWebHookAction(hookAction.id));
        const bodyToCompare = removeServerGeneratedProperties(rule);
        const expected = getSimpleRuleOutputWithWebHookAction(
          `${bodyToCompare?.actions?.[0].id}`,
          `${bodyToCompare?.actions?.[0].uuid}`
        );
        const expectedRuleWithUserUpdated = updateUsername(expected, ELASTICSEARCH_USERNAME);
        expect(bodyToCompare).to.eql(expectedRuleWithUserUpdated);
      });

      it('should be able to create a new webhook action and attach it to a rule without a meta field and run it correctly', async () => {
        // create a new action
        const { body: hookAction } = await supertest
          .post('/api/actions/action')
          .set('kbn-xsrf', 'true')
          .set('x-elastic-internal-origin', 'foo')
          .send(getWebHookAction())
          .expect(200);

        const rule = await createRule(
          supertest,
          log,
          getRuleWithWebHookAction(hookAction.id, true)
        );
        await waitForRuleSuccess({ supertest, log, id: rule.id });
      });

      it('should be able to create a new webhook action and attach it to a rule with a meta field and run it correctly', async () => {
        // create a new action
        const { body: hookAction } = await supertest
          .post('/api/actions/action')
          .set('kbn-xsrf', 'true')
          .set('x-elastic-internal-origin', 'foo')
          .send(getWebHookAction())
          .expect(200);

        // create a rule with the action attached and a meta field
        const ruleWithAction: RuleCreateProps = {
          ...getRuleWithWebHookAction(hookAction.id, true),
          meta: {},
        };

        const rule = await createRule(supertest, log, ruleWithAction);
        await waitForRuleSuccess({ supertest, log, id: rule.id });
      });
    });
  });
};
