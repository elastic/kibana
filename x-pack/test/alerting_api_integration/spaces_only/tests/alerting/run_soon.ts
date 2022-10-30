/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { getUrlPrefix, getTestRuleData, ObjectRemover } from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

const LOADED_RULE_ID = '74f3e6d7-b7bb-477d-ac28-92ee22728e6e';

// eslint-disable-next-line import/no-default-export
export default function createRunSoonTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const retry = getService('retry');
  const es = getService('es');
  const esArchiver = getService('esArchiver');

  describe('runSoon', () => {
    const objectRemover = new ObjectRemover(supertest);

    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/rules_scheduled_task_id');
    });

    afterEach(async () => {
      await objectRemover.removeAll();
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/rules_scheduled_task_id');
    });

    it('should successfully run rule where scheduled task id is different than rule id', async () => {
      await retry.try(async () => {
        // Sometimes the rule may already be running, which returns a 200. Try until it isn't
        const response = await supertest
          .post(`${getUrlPrefix(``)}/internal/alerting/rule/${LOADED_RULE_ID}/_run_soon`)
          .set('kbn-xsrf', 'foo');
        expect(response.status).to.eql(204);
      });
    });

    it('should successfully run rule where scheduled task id is same as rule id', async () => {
      const response = await supertest
        .post(`${getUrlPrefix(``)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData());

      expect(response.status).to.eql(200);
      objectRemover.add('default', response.body.id, 'rule', 'alerting');

      await retry.try(async () => {
        // Sometimes the rule may already be running, which returns a 200. Try until it isn't
        const runSoonResponse = await supertest
          .post(`${getUrlPrefix(``)}/internal/alerting/rule/${response.body.id}/_run_soon`)
          .set('kbn-xsrf', 'foo');
        expect(runSoonResponse.status).to.eql(204);
      });
    });

    it('should return message when task does not exist for rule', async () => {
      const response = await supertest
        .post(`${getUrlPrefix(``)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData());

      expect(response.status).to.eql(200);
      objectRemover.add('default', response.body.id, 'rule', 'alerting');

      await es.delete({
        id: `task:${response.body.id}`,
        index: '.kibana_task_manager',
      });

      const runSoonResponse = await supertest
        .post(`${getUrlPrefix(``)}/internal/alerting/rule/${response.body.id}/_run_soon`)
        .set('kbn-xsrf', 'foo');
      expect(runSoonResponse.status).to.eql(200);
      expect(runSoonResponse.text).to.eql(
        `Error running rule: Saved object [task/${response.body.id}] not found`
      );
    });

    it('should return message when rule is disabled', async () => {
      const response = await supertest
        .post(`${getUrlPrefix(``)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData());

      expect(response.status).to.eql(200);
      objectRemover.add('default', response.body.id, 'rule', 'alerting');

      await supertest
        .post(`${getUrlPrefix(``)}/api/alerting/rule/${response.body.id}/_disable`)
        .set('kbn-xsrf', 'foo');

      const runSoonResponse = await supertest
        .post(`${getUrlPrefix(``)}/internal/alerting/rule/${response.body.id}/_run_soon`)
        .set('kbn-xsrf', 'foo');
      expect(runSoonResponse.status).to.eql(200);
      expect(runSoonResponse.text).to.eql(`Error running rule: rule is disabled`);
    });
  });
}
