/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { parse as parseCookie } from 'tough-cookie';
import { adminTestUser } from '@kbn/test';
import { ALERT_WORKFLOW_STATUS } from '@kbn/rule-data-utils';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import {
  DETECTION_ENGINE_SIGNALS_STATUS_URL,
  DETECTION_ENGINE_QUERY_SIGNALS_URL,
} from '@kbn/security-solution-plugin/common/constants';
import { ROLES } from '@kbn/security-solution-plugin/common/test';
import { DetectionAlert } from '@kbn/security-solution-plugin/common/api/detection_engine';
import { setAlertStatus, getAlertUpdateByQueryEmptyResponse, refreshIndex } from '../../../utils';
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
} from '../../../../../../common/utils/security_solution';
import {
  createUserAndRole,
  deleteUserAndRole,
} from '../../../../../../common/services/security_solution';
import { FtrProviderContext } from '../../../../../ftr_provider_context';
import { EsArchivePathBuilder } from '../../../../../es_archive_path_builder';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const log = getService('log');
  const es = getService('es');
  // TODO: add a new service for loading archiver files similar to "getService('es')"
  const config = getService('config');
  const isServerless = config.get('serverless');
  const dataPathBuilder = new EsArchivePathBuilder(isServerless);
  const path = dataPathBuilder.getPath('auditbeat/hosts');

  // Failing: See https://github.com/elastic/kibana/issues/170753
  describe.skip('@ess @serverless open_close_alerts', () => {
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

        it('should be able to close alerts while logged in and populate workflow_user', async () => {
          // Login so we can test changing alert status within an interactive session
          // We write `profile_uid` to `kibana.alert.workflow_user` if it's available,
          // but `profile_uid` is only available in interactive sessions
          const response = await supertestWithoutAuth
            .post('/internal/security/login')
            .set('kbn-xsrf', 'xxx')
            .send({
              providerType: 'basic',
              providerName: 'basic',
              currentURL: '/',
              params: { username: adminTestUser.username, password: adminTestUser.password },
            })
            .expect(200);

          const cookies = response.header['set-cookie'];
          expect(cookies).to.have.length(1);

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
          await supertestWithoutAuth
            .post(DETECTION_ENGINE_SIGNALS_STATUS_URL)
            .set('kbn-xsrf', 'true')
            .set('Cookie', parseCookie(cookies[0])!.cookieString())
            .send(setAlertStatus({ alertIds, status: 'closed' }))
            .expect(200);

          await refreshIndex(es, '.alerts-security.alerts-default*');

          const { body: alertsClosed }: { body: estypes.SearchResponse<DetectionAlert> } =
            await supertest
              .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
              .set('kbn-xsrf', 'true')
              .send(getQueryAlertIds(alertIds))
              .expect(200);
          expect(alertsClosed.hits.hits.length).to.equal(10);
          const everyAlertClosed = alertsClosed.hits.hits.every(
            (hit) => hit._source?.['kibana.alert.workflow_status'] === 'closed'
          );
          expect(everyAlertClosed).to.eql(true);
          const everyAlertWorkflowUserExists = alertsClosed.hits.hits.every(
            (hit) => hit._source?.['kibana.alert.workflow_user'] !== null
          );
          expect(everyAlertWorkflowUserExists).to.eql(true);
          const everyAlertWorkflowStatusUpdatedAtExists = alertsClosed.hits.hits.every(
            (hit) => hit._source?.['kibana.alert.workflow_status_updated_at'] !== null
          );
          expect(everyAlertWorkflowStatusUpdatedAtExists).to.eql(true);
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
          const alertIds = alertsOpen.hits.hits.map((alert) => alert._id);

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
        // This fails and should be investigated or removed if it no longer applies
        it.skip('should be able to close alerts with t1 analyst user', async () => {
          const rule = getRuleForAlertTesting(['auditbeat-*']);
          const { id } = await createRule(supertest, log, rule);
          await waitForRuleSuccess({ supertest, log, id });
          await waitForAlertsToBePresent(supertest, log, 1, [id]);
          await createUserAndRole(getService, ROLES.t1_analyst);
          const alertsOpen = await getAlertsByIds(supertest, log, [id]);
          const alertIds = alertsOpen.hits.hits.map((alert) => alert._id);

          // Try to set all of the alerts to the state of closed.
          // This should not be possible with the given user.
          await supertestWithoutAuth
            .post(DETECTION_ENGINE_SIGNALS_STATUS_URL)
            .set('kbn-xsrf', 'true')
            .auth(ROLES.t1_analyst, 'changeme')
            .send(setAlertStatus({ alertIds, status: 'closed' }))
            .expect(200);

          // query for the alerts with the superuser
          // to allow a check that the alerts were NOT closed with t1 analyst
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

          await deleteUserAndRole(getService, ROLES.t1_analyst);
        });
        // This fails and should be investigated or removed if it no longer applies
        it.skip('should be able to close alerts with soc_manager user', async () => {
          const rule = getRuleForAlertTesting(['auditbeat-*']);
          const { id } = await createRule(supertest, log, rule);
          await waitForRuleSuccess({ supertest, log, id });
          await waitForAlertsToBePresent(supertest, log, 1, [id]);
          const userAndRole = ROLES.soc_manager;
          await createUserAndRole(getService, userAndRole);
          const alertsOpen = await getAlertsByIds(supertest, log, [id]);
          const alertIds = alertsOpen.hits.hits.map((alert) => alert._id);

          // Try to set all of the alerts to the state of closed.
          // This should not be possible with the given user.
          await supertestWithoutAuth
            .post(DETECTION_ENGINE_SIGNALS_STATUS_URL)
            .set('kbn-xsrf', 'true')
            .auth(userAndRole, 'changeme') // each user has the same password
            .send(setAlertStatus({ alertIds, status: 'closed' }))
            .expect(200);

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

          await deleteUserAndRole(getService, userAndRole);
        });
      });
    });
  });
};
