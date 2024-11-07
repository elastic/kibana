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
import {
  setAlertStatus,
  getAlertUpdateByQueryEmptyResponse,
  refreshIndex,
} from '../../../../utils';
import {
  createAlertsIndex,
  deleteAllAlerts,
  getQueryAlertIds,
  deleteAllRules,
  createRule,
  waitForAlertsToBePresent,
  getAlertsByIds,
  waitForRuleSuccess,
  getRuleForAlertTesting,
} from '../../../../../../../common/utils/security_solution';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';
import { EsArchivePathBuilder } from '../../../../../../es_archive_path_builder';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const log = getService('log');
  const es = getService('es');
  const config = getService('config');
  const isServerless = config.get('serverless');
  const dataPathBuilder = new EsArchivePathBuilder(isServerless);
  const path = dataPathBuilder.getPath('auditbeat/hosts');

  describe('@ess @serverless change alert status endpoints', () => {
    describe('validation checks', () => {
      describe('update by ids', () => {
        it('should not give errors when querying and the alerts index does not exist yet', async () => {
          const { body } = await supertest
            .post(DETECTION_ENGINE_SIGNALS_STATUS_URL)
            .set('kbn-xsrf', 'true')
            .send(setAlertStatus({ alertIds: ['123'], status: 'open' }))
            .expect(200);

          // remove any server generated items that are nondeterministic
          delete body.took;

          expect(body).to.eql(getAlertUpdateByQueryEmptyResponse());
        });

        it('should not give errors when querying and the alerts index does exist and is empty', async () => {
          await createAlertsIndex(supertest, log);
          const { body } = await supertest
            .post(DETECTION_ENGINE_SIGNALS_STATUS_URL)
            .set('kbn-xsrf', 'true')
            .send(setAlertStatus({ alertIds: ['123'], status: 'open' }))
            .expect(200);

          // remove any server generated items that are nondeterministic
          delete body.took;

          expect(body).to.eql(getAlertUpdateByQueryEmptyResponse());

          await deleteAllAlerts(supertest, log, es);
        });
      });

      describe('update by query', () => {
        it('should not give errors when querying and the alerts index does not exist yet', async () => {
          const { body } = await supertest
            .post(DETECTION_ENGINE_SIGNALS_STATUS_URL)
            .set('kbn-xsrf', 'true')
            .send(setAlertStatus({ query: { match_all: {} }, status: 'open' }))
            .expect(200);

          // remove any server generated items that are indeterministic
          delete body.took;

          expect(body).to.eql(getAlertUpdateByQueryEmptyResponse());
        });

        it('should not give errors when querying and the alerts index does exist and is empty', async () => {
          await createAlertsIndex(supertest, log);
          const { body } = await supertest
            .post(DETECTION_ENGINE_SIGNALS_STATUS_URL)
            .set('kbn-xsrf', 'true')
            .send(setAlertStatus({ query: { match_all: {} }, status: 'open' }))
            .expect(200);

          // remove any server generated items that are indeterministic
          delete body.took;

          expect(body).to.eql(getAlertUpdateByQueryEmptyResponse());

          await deleteAllAlerts(supertest, log, es);
        });
      });

      describe('tests with auditbeat data', () => {
        before(async () => {
          await esArchiver.load(path);
        });

        after(async () => {
          await esArchiver.unload(path);
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
          const everyAlertOpen = alertsOpen.hits.hits.every(
            (hit) => hit._source?.[ALERT_WORKFLOW_STATUS] === 'open'
          );
          expect(everyAlertOpen).to.eql(true);
        });

        it('should set alerts to acknowledged', async () => {
          const rule = {
            ...getRuleForAlertTesting(['auditbeat-*']),
            query: 'process.executable: "/usr/bin/sudo"',
          };
          const { id } = await createRule(supertest, log, rule);
          await waitForRuleSuccess({ supertest, log, id });
          await waitForAlertsToBePresent(supertest, log, 10, [id]);
          const alertsOpen = await getAlertsByIds(supertest, log, [id]);
          const alertIds = alertsOpen.hits.hits.map((alert) => alert._id!);

          await supertest
            .post(DETECTION_ENGINE_SIGNALS_STATUS_URL)
            .set('kbn-xsrf', 'true')
            .send(setAlertStatus({ alertIds, status: 'acknowledged' }))
            .expect(200);

          const { body: alertsAcknowledged }: { body: estypes.SearchResponse<DetectionAlert> } =
            await supertest
              .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
              .set('kbn-xsrf', 'true')
              .send(getQueryAlertIds(alertIds))
              .expect(200);

          const everyAlertAcknowledged = alertsAcknowledged.hits.hits.every(
            (hit) => hit._source?.['kibana.alert.workflow_status'] === 'acknowledged'
          );
          expect(everyAlertAcknowledged).to.eql(true);
        });

        it('should be able close alerts without logging in and workflow_user is set to null', async () => {
          const rule = {
            ...getRuleForAlertTesting(['auditbeat-*']),
            query: 'process.executable: "/usr/bin/sudo"',
          };
          const { id } = await createRule(supertest, log, rule);
          await waitForRuleSuccess({ supertest, log, id });
          await waitForAlertsToBePresent(supertest, log, 10, [id]);
          const alertsOpen = await getAlertsByIds(supertest, log, [id]);
          const alertIds = alertsOpen.hits.hits.map((alert) => alert._id!);

          // set all of the alerts to the state of closed. There is no reason to use a waitUntil here
          // as this route intentionally has a waitFor within it and should only return when the query has
          // the data.
          await supertest
            .post(DETECTION_ENGINE_SIGNALS_STATUS_URL)
            .set('kbn-xsrf', 'true')
            .send(setAlertStatus({ alertIds, status: 'closed' }))
            .expect(200);

          await refreshIndex(es, '.alerts-security.alerts-default*');

          const { body: alertsClosed }: { body: estypes.SearchResponse<DetectionAlert> } =
            await supertest
              .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
              .set('kbn-xsrf', 'true')
              .send(getQueryAlertIds(alertIds))
              .expect(200);

          const everyAlertClosed = alertsClosed.hits.hits.every(
            (hit) => hit._source?.['kibana.alert.workflow_status'] === 'closed'
          );
          expect(everyAlertClosed).to.eql(true);
          const everyAlertWorkflowUserNull = alertsClosed.hits.hits.every(
            (hit) => hit._source?.['kibana.alert.workflow_user'] === null
          );
          expect(everyAlertWorkflowUserNull).to.eql(true);
          const everyAlertWorkflowStatusUpdatedAtExists = alertsClosed.hits.hits.every(
            (hit) => hit._source?.['kibana.alert.workflow_status_updated_at'] !== null
          );
          expect(everyAlertWorkflowStatusUpdatedAtExists).to.eql(true);
        });
      });
    });
  });
};
