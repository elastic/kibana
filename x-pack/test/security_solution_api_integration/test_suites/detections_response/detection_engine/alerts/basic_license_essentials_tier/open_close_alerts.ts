/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ALERT_WORKFLOW_STATUS } from '@kbn/rule-data-utils';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  DETECTION_ENGINE_SIGNALS_STATUS_URL,
  DETECTION_ENGINE_QUERY_SIGNALS_URL,
} from '@kbn/security-solution-plugin/common/constants';
import { DetectionAlert } from '@kbn/security-solution-plugin/common/api/detection_engine';
import { setAlertStatus } from '../../../utils';
import {
  getQueryAlertIds,
  createRule,
  waitForAlertsToBePresent,
  getAlertsByIds,
  waitForRuleSuccess,
  getRuleForAlertTesting,
  deleteAllRules,
  deleteAllAlerts,
  createAlertsIndex,
} from '../../../../../../common/utils/security_solution';
import { FtrProviderContext } from '../../../../../ftr_provider_context';
import { EsArchivePathBuilder } from '../../../../../es_archive_path_builder';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const log = getService('log');
  const es = getService('es');
  // TODO: add a new service for loading archiver files similar to "getService('es')"
  const config = getService('config');
  const isServerless = config.get('serverless');
  const dataPathBuilder = new EsArchivePathBuilder(isServerless);
  const auditbeatHost = dataPathBuilder.getPath('auditbeat/hosts');

  describe('@ess @serverless open_close_alerts', () => {
    describe('tests with auditbeat data', () => {
      before(async () => {
        await esArchiver.load(auditbeatHost);
      });

      after(async () => {
        await esArchiver.unload(auditbeatHost);
      });

      beforeEach(async () => {
        await deleteAllRules(supertest, log);
        await createAlertsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);
      });

      it('should be able to execute and get 10 alerts', async () => {
        const rule = {
          ...getRuleForAlertTesting(['auditbeat-*']),
          query: 'process.executable: "/usr/bin/sudo"',
        };
        const { id } = await createRule(supertest, log, rule);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 10, [id]);
        const alertsOpen = await getAlertsByIds(supertest, log, [id]);
        expect(alertsOpen.hits.hits.length).equal(10);
      });

      it('should be have set the alerts in an open state initially', async () => {
        const rule = {
          ...getRuleForAlertTesting(['auditbeat-*']),
          query: 'process.executable: "/usr/bin/sudo"',
        };
        const { id } = await createRule(supertest, log, rule);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 10, [id]);
        const alertsOpen = await getAlertsByIds(supertest, log, [id]);
        const everyAlertOpen = alertsOpen.hits.hits.every(
          (hit) => hit._source?.[ALERT_WORKFLOW_STATUS] === 'open'
        );
        expect(everyAlertOpen).to.eql(true);
      });

      it('should be able to get a count of 10 closed alerts when closing 10', async () => {
        const rule = {
          ...getRuleForAlertTesting(['auditbeat-*']),
          query: 'process.executable: "/usr/bin/sudo"',
        };
        const { id } = await createRule(supertest, log, rule);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 10, [id]);
        const alertsOpen = await getAlertsByIds(supertest, log, [id]);
        const alertIds = alertsOpen.hits.hits.map((alert) => alert._id);

        // set all of the alerts to the state of closed. There is no reason to use a waitUntil here
        // as this route intentionally has a waitFor within it and should only return when the query has
        // the data.
        await supertest
          .post(DETECTION_ENGINE_SIGNALS_STATUS_URL)
          .set('kbn-xsrf', 'true')
          .send(setAlertStatus({ alertIds, status: 'closed' }))
          .expect(200);

        const { body: alertsClosed }: { body: estypes.SearchResponse<DetectionAlert> } =
          await supertest
            .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
            .set('kbn-xsrf', 'true')
            .send(getQueryAlertIds(alertIds))
            .expect(200);
        expect(alertsClosed.hits.hits.length).to.equal(10);
      });

      // Test is failing after changing refresh to false
      it.skip('should be able close 10 alerts immediately and they all should be closed', async () => {
        const rule = {
          ...getRuleForAlertTesting(['auditbeat-*']),
          query: 'process.executable: "/usr/bin/sudo"',
        };
        const { id } = await createRule(supertest, log, rule);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 10, [id]);
        const alertsOpen = await getAlertsByIds(supertest, log, [id]);
        const alertIds = alertsOpen.hits.hits.map((alert) => alert._id);

        // set all of the alerts to the state of closed. There is no reason to use a waitUntil here
        // as this route intentionally has a waitFor within it and should only return when the query has
        // the data.
        await supertest
          .post(DETECTION_ENGINE_SIGNALS_STATUS_URL)
          .set('kbn-xsrf', 'true')
          .send(setAlertStatus({ alertIds, status: 'closed' }))
          .expect(200);

        const { body: alertsClosed }: { body: estypes.SearchResponse<DetectionAlert> } =
          await supertest
            .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
            .set('kbn-xsrf', 'true')
            .send(getQueryAlertIds(alertIds))
            .expect(200);

        const everyAlertClosed = alertsClosed.hits.hits.every(
          (hit) => hit._source?.[ALERT_WORKFLOW_STATUS] === 'closed'
        );
        expect(everyAlertClosed).to.eql(true);
      });
    });
  });
};
