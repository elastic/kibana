/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import {
  createRule,
  createAlertsIndex,
  deleteAllRules,
  deleteAllAlerts,
  getRuleForAlertTesting,
  getAlertsById,
  waitForRuleSuccess,
  waitForAlertsToBePresent,
} from '../../../../../../common/utils/security_solution';
import { FtrProviderContext } from '../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const log = getService('log');
  const es = getService('es');

  interface HostAlias {
    name: string;
  }

  describe('@ess @serverless @serverlessQA Tests involving aliases of source indexes and the alerts index', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/security_solution/alias');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/security_solution/alias');
    });

    beforeEach(async () => {
      await createAlertsIndex(supertest, log);
    });

    afterEach(async () => {
      await deleteAllAlerts(supertest, log, es);
      await deleteAllRules(supertest, log);
    });

    it('should keep the original alias value such as "host_alias" from a source index when the value is indexed', async () => {
      const rule = getRuleForAlertTesting(['host_alias']);
      const { id } = await createRule(supertest, log, rule);
      await waitForRuleSuccess({ supertest, log, id });
      await waitForAlertsToBePresent(supertest, log, 4, [id]);
      const alertsOpen = await getAlertsById(supertest, log, id);
      const hits = alertsOpen.hits.hits
        .map((alert) => (alert._source?.host_alias as HostAlias).name)
        .sort();
      expect(hits).to.eql(['host name 1', 'host name 2', 'host name 3', 'host name 4']);
    });

    it('should copy alias data from a source index into the alerts index in the same position when the target is ECS compatible', async () => {
      const rule = getRuleForAlertTesting(['host_alias']);
      const { id } = await createRule(supertest, log, rule);
      await waitForRuleSuccess({ supertest, log, id });
      await waitForAlertsToBePresent(supertest, log, 4, [id]);
      const alertsOpen = await getAlertsById(supertest, log, id);
      const hits = alertsOpen.hits.hits
        .map((alert) => (alert._source?.host as HostAlias).name)
        .sort();
      expect(hits).to.eql(['host name 1', 'host name 2', 'host name 3', 'host name 4']);
    });
  });
};
