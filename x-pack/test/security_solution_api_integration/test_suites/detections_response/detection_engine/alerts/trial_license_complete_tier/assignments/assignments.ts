/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import {
  DETECTION_ENGINE_ALERT_ASSIGNEES_URL,
  DETECTION_ENGINE_QUERY_SIGNALS_URL,
} from '@kbn/security-solution-plugin/common/constants';
import { DetectionAlert } from '@kbn/security-solution-plugin/common/api/detection_engine';

import { setAlertAssignees } from '../../../../utils';
import {
  createAlertsIndex,
  createRule,
  deleteAllAlerts,
  deleteAllRules,
  getAlertsByIds,
  getQueryAlertIds,
  getRuleForAlertTesting,
  waitForAlertsToBePresent,
  waitForRuleSuccess,
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

  describe('@ess @serverless Alert User Assignment - ESS & Serverless', () => {
    describe('validation checks', () => {
      it('should give errors when no alert ids are provided', async () => {
        const { body } = await supertest
          .post(DETECTION_ENGINE_ALERT_ASSIGNEES_URL)
          .set('kbn-xsrf', 'true')
          .send(setAlertAssignees({ assigneesToAdd: [], assigneesToRemove: [], ids: [] }))
          .expect(400);

        expect(body).to.eql({
          error: 'Bad Request',
          message: '[request body]: ids: Array must contain at least 1 element(s)',
          statusCode: 400,
        });
      });

      it('should give errors when empty alert ids are provided', async () => {
        const { body } = await supertest
          .post(DETECTION_ENGINE_ALERT_ASSIGNEES_URL)
          .set('kbn-xsrf', 'true')
          .send(setAlertAssignees({ assigneesToAdd: [], assigneesToRemove: [], ids: ['123', ''] }))
          .expect(400);

        expect(body).to.eql({
          error: 'Bad Request',
          message:
            '[request body]: ids.1: String must contain at least 1 character(s), ids.1: Invalid',
          statusCode: 400,
        });
      });

      it('should give errors when duplicate assignees exist in both add and remove', async () => {
        const { body } = await supertest
          .post(DETECTION_ENGINE_ALERT_ASSIGNEES_URL)
          .set('kbn-xsrf', 'true')
          .send(
            setAlertAssignees({
              assigneesToAdd: ['test-1'],
              assigneesToRemove: ['test-1'],
              ids: ['123'],
            })
          )
          .expect(400);

        expect(body).to.eql({
          message: ['Duplicate assignees ["test-1"] were found in the add and remove parameters.'],
          status_code: 400,
        });
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
      });

      describe('updating assignees', () => {
        it('should add new assignees to single alert', async () => {
          const rule = {
            ...getRuleForAlertTesting(['auditbeat-*']),
            query: 'process.executable: "/usr/bin/sudo"',
          };
          const { id } = await createRule(supertest, log, rule);
          await waitForRuleSuccess({ supertest, log, id });
          await waitForAlertsToBePresent(supertest, log, 10, [id]);
          const alerts = await getAlertsByIds(supertest, log, [id]);
          const alertIds = alerts.hits.hits.map((alert) => alert._id);
          const alertId = alertIds[0];

          await supertest
            .post(DETECTION_ENGINE_ALERT_ASSIGNEES_URL)
            .set('kbn-xsrf', 'true')
            .send(
              setAlertAssignees({
                assigneesToAdd: ['user-1'],
                assigneesToRemove: [],
                ids: [alertId],
              })
            )
            .expect(200);

          const { body }: { body: estypes.SearchResponse<DetectionAlert> } = await supertest
            .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
            .set('kbn-xsrf', 'true')
            .send(getQueryAlertIds([alertId]))
            .expect(200);

          body.hits.hits.map((alert) => {
            expect(alert._source?.['kibana.alert.workflow_assignee_ids']).to.eql(['user-1']);
          });
        });

        it('should add new assignees to multiple alerts', async () => {
          const rule = {
            ...getRuleForAlertTesting(['auditbeat-*']),
            query: 'process.executable: "/usr/bin/sudo"',
          };
          const { id } = await createRule(supertest, log, rule);
          await waitForRuleSuccess({ supertest, log, id });
          await waitForAlertsToBePresent(supertest, log, 10, [id]);
          const alerts = await getAlertsByIds(supertest, log, [id]);
          const alertIds = alerts.hits.hits.map((alert) => alert._id);

          await supertest
            .post(DETECTION_ENGINE_ALERT_ASSIGNEES_URL)
            .set('kbn-xsrf', 'true')
            .send(
              setAlertAssignees({
                assigneesToAdd: ['user-2', 'user-3'],
                assigneesToRemove: [],
                ids: alertIds,
              })
            )
            .expect(200);

          const { body }: { body: estypes.SearchResponse<DetectionAlert> } = await supertest
            .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
            .set('kbn-xsrf', 'true')
            .send(getQueryAlertIds(alertIds))
            .expect(200);

          body.hits.hits.map((alert) => {
            expect(alert._source?.['kibana.alert.workflow_assignee_ids']).to.eql([
              'user-2',
              'user-3',
            ]);
          });
        });

        it('should update assignees for single alert', async () => {
          const rule = {
            ...getRuleForAlertTesting(['auditbeat-*']),
            query: 'process.executable: "/usr/bin/sudo"',
          };
          const { id } = await createRule(supertest, log, rule);
          await waitForRuleSuccess({ supertest, log, id });
          await waitForAlertsToBePresent(supertest, log, 10, [id]);
          const alerts = await getAlertsByIds(supertest, log, [id]);
          const alertIds = alerts.hits.hits.map((alert) => alert._id);
          const alertId = alertIds[0];

          // Assign users
          await supertest
            .post(DETECTION_ENGINE_ALERT_ASSIGNEES_URL)
            .set('kbn-xsrf', 'true')
            .send(
              setAlertAssignees({
                assigneesToAdd: ['user-1', 'user-2'],
                assigneesToRemove: [],
                ids: [alertId],
              })
            )
            .expect(200);

          // Update assignees
          await supertest
            .post(DETECTION_ENGINE_ALERT_ASSIGNEES_URL)
            .set('kbn-xsrf', 'true')
            .send(
              setAlertAssignees({
                assigneesToAdd: ['user-3'],
                assigneesToRemove: ['user-2'],
                ids: [alertId],
              })
            )
            .expect(200);

          const { body }: { body: estypes.SearchResponse<DetectionAlert> } = await supertest
            .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
            .set('kbn-xsrf', 'true')
            .send(getQueryAlertIds([alertId]))
            .expect(200);

          body.hits.hits.map((alert) => {
            expect(alert._source?.['kibana.alert.workflow_assignee_ids']).to.eql([
              'user-1',
              'user-3',
            ]);
          });
        });

        it('should update assignees for multiple alerts', async () => {
          const rule = {
            ...getRuleForAlertTesting(['auditbeat-*']),
            query: 'process.executable: "/usr/bin/sudo"',
          };
          const { id } = await createRule(supertest, log, rule);
          await waitForRuleSuccess({ supertest, log, id });
          await waitForAlertsToBePresent(supertest, log, 10, [id]);
          const alerts = await getAlertsByIds(supertest, log, [id]);
          const alertIds = alerts.hits.hits.map((alert) => alert._id);

          // Assign users
          await supertest
            .post(DETECTION_ENGINE_ALERT_ASSIGNEES_URL)
            .set('kbn-xsrf', 'true')
            .send(
              setAlertAssignees({
                assigneesToAdd: ['user-1', 'user-2'],
                assigneesToRemove: [],
                ids: alertIds,
              })
            )
            .expect(200);

          // Update assignees
          await supertest
            .post(DETECTION_ENGINE_ALERT_ASSIGNEES_URL)
            .set('kbn-xsrf', 'true')
            .send(
              setAlertAssignees({
                assigneesToAdd: ['user-3'],
                assigneesToRemove: ['user-2'],
                ids: alertIds,
              })
            )
            .expect(200);

          const { body }: { body: estypes.SearchResponse<DetectionAlert> } = await supertest
            .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
            .set('kbn-xsrf', 'true')
            .send(getQueryAlertIds(alertIds))
            .expect(200);

          body.hits.hits.map((alert) => {
            expect(alert._source?.['kibana.alert.workflow_assignee_ids']).to.eql([
              'user-1',
              'user-3',
            ]);
          });
        });

        it('should add assignee once to the alert even if same assignee was passed multiple times', async () => {
          const rule = {
            ...getRuleForAlertTesting(['auditbeat-*']),
            query: 'process.executable: "/usr/bin/sudo"',
          };
          const { id } = await createRule(supertest, log, rule);
          await waitForRuleSuccess({ supertest, log, id });
          await waitForAlertsToBePresent(supertest, log, 10, [id]);
          const alerts = await getAlertsByIds(supertest, log, [id]);
          const alertIds = alerts.hits.hits.map((alert) => alert._id);

          await supertest
            .post(DETECTION_ENGINE_ALERT_ASSIGNEES_URL)
            .set('kbn-xsrf', 'true')
            .send(
              setAlertAssignees({
                assigneesToAdd: ['user-1', 'user-1', 'user-1', 'user-2'],
                assigneesToRemove: [],
                ids: alertIds,
              })
            )
            .expect(200);

          const { body }: { body: estypes.SearchResponse<DetectionAlert> } = await supertest
            .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
            .set('kbn-xsrf', 'true')
            .send(getQueryAlertIds(alertIds))
            .expect(200);

          body.hits.hits.map((alert) => {
            expect(alert._source?.['kibana.alert.workflow_assignee_ids']).to.eql([
              'user-1',
              'user-2',
            ]);
          });
        });

        it('should remove assignee once to the alert even if same assignee was passed multiple times', async () => {
          const rule = {
            ...getRuleForAlertTesting(['auditbeat-*']),
            query: 'process.executable: "/usr/bin/sudo"',
          };
          const { id } = await createRule(supertest, log, rule);
          await waitForRuleSuccess({ supertest, log, id });
          await waitForAlertsToBePresent(supertest, log, 10, [id]);
          const alerts = await getAlertsByIds(supertest, log, [id]);
          const alertIds = alerts.hits.hits.map((alert) => alert._id);

          await supertest
            .post(DETECTION_ENGINE_ALERT_ASSIGNEES_URL)
            .set('kbn-xsrf', 'true')
            .send(
              setAlertAssignees({
                assigneesToAdd: ['user-1', 'user-2'],
                assigneesToRemove: [],
                ids: alertIds,
              })
            )
            .expect(200);

          await supertest
            .post(DETECTION_ENGINE_ALERT_ASSIGNEES_URL)
            .set('kbn-xsrf', 'true')
            .send(
              setAlertAssignees({
                assigneesToAdd: [],
                assigneesToRemove: ['user-2', 'user-2'],
                ids: alertIds,
              })
            )
            .expect(200);

          const { body }: { body: estypes.SearchResponse<DetectionAlert> } = await supertest
            .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
            .set('kbn-xsrf', 'true')
            .send(getQueryAlertIds(alertIds))
            .expect(200);

          body.hits.hits.map((alert) => {
            expect(alert._source?.['kibana.alert.workflow_assignee_ids']).to.eql(['user-1']);
          });
        });

        it('should not update assignees if both `add` and `remove` are empty', async () => {
          const rule = {
            ...getRuleForAlertTesting(['auditbeat-*']),
            query: 'process.executable: "/usr/bin/sudo"',
          };
          const { id } = await createRule(supertest, log, rule);
          await waitForRuleSuccess({ supertest, log, id });
          await waitForAlertsToBePresent(supertest, log, 10, [id]);
          const alerts = await getAlertsByIds(supertest, log, [id]);
          const alertIds = alerts.hits.hits.map((alert) => alert._id);

          await supertest
            .post(DETECTION_ENGINE_ALERT_ASSIGNEES_URL)
            .set('kbn-xsrf', 'true')
            .send(
              setAlertAssignees({
                assigneesToAdd: ['user-1', 'user-2'],
                assigneesToRemove: [],
                ids: alertIds,
              })
            )
            .expect(200);

          await supertest
            .post(DETECTION_ENGINE_ALERT_ASSIGNEES_URL)
            .set('kbn-xsrf', 'true')
            .send(
              setAlertAssignees({
                assigneesToAdd: [],
                assigneesToRemove: [],
                ids: alertIds,
              })
            )
            .expect(200);

          const { body }: { body: estypes.SearchResponse<DetectionAlert> } = await supertest
            .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
            .set('kbn-xsrf', 'true')
            .send(getQueryAlertIds(alertIds))
            .expect(200);

          body.hits.hits.map((alert) => {
            expect(alert._source?.['kibana.alert.workflow_assignee_ids']).to.eql([
              'user-1',
              'user-2',
            ]);
          });
        });

        it('should not update assignees when adding user which is assigned to alert', async () => {
          const rule = {
            ...getRuleForAlertTesting(['auditbeat-*']),
            query: 'process.executable: "/usr/bin/sudo"',
          };
          const { id } = await createRule(supertest, log, rule);
          await waitForRuleSuccess({ supertest, log, id });
          await waitForAlertsToBePresent(supertest, log, 10, [id]);
          const alerts = await getAlertsByIds(supertest, log, [id]);
          const alertIds = alerts.hits.hits.map((alert) => alert._id);

          await supertest
            .post(DETECTION_ENGINE_ALERT_ASSIGNEES_URL)
            .set('kbn-xsrf', 'true')
            .send(
              setAlertAssignees({
                assigneesToAdd: ['user-1', 'user-2'],
                assigneesToRemove: [],
                ids: alertIds,
              })
            )
            .expect(200);

          await supertest
            .post(DETECTION_ENGINE_ALERT_ASSIGNEES_URL)
            .set('kbn-xsrf', 'true')
            .send(
              setAlertAssignees({
                assigneesToAdd: ['user-2'],
                assigneesToRemove: [],
                ids: alertIds,
              })
            )
            .expect(200);

          const { body }: { body: estypes.SearchResponse<DetectionAlert> } = await supertest
            .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
            .set('kbn-xsrf', 'true')
            .send(getQueryAlertIds(alertIds))
            .expect(200);

          body.hits.hits.map((alert) => {
            expect(alert._source?.['kibana.alert.workflow_assignee_ids']).to.eql([
              'user-1',
              'user-2',
            ]);
          });
        });

        it('should not update assignees when removing user which is not assigned to alert', async () => {
          const rule = {
            ...getRuleForAlertTesting(['auditbeat-*']),
            query: 'process.executable: "/usr/bin/sudo"',
          };
          const { id } = await createRule(supertest, log, rule);
          await waitForRuleSuccess({ supertest, log, id });
          await waitForAlertsToBePresent(supertest, log, 10, [id]);
          const alerts = await getAlertsByIds(supertest, log, [id]);
          const alertIds = alerts.hits.hits.map((alert) => alert._id);

          await supertest
            .post(DETECTION_ENGINE_ALERT_ASSIGNEES_URL)
            .set('kbn-xsrf', 'true')
            .send(
              setAlertAssignees({
                assigneesToAdd: ['user-1', 'user-2'],
                assigneesToRemove: [],
                ids: alertIds,
              })
            )
            .expect(200);

          await supertest
            .post(DETECTION_ENGINE_ALERT_ASSIGNEES_URL)
            .set('kbn-xsrf', 'true')
            .send(
              setAlertAssignees({
                assigneesToAdd: [],
                assigneesToRemove: ['user-3'],
                ids: alertIds,
              })
            )
            .expect(200);

          const { body }: { body: estypes.SearchResponse<DetectionAlert> } = await supertest
            .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
            .set('kbn-xsrf', 'true')
            .send(getQueryAlertIds(alertIds))
            .expect(200);

          body.hits.hits.map((alert) => {
            expect(alert._source?.['kibana.alert.workflow_assignee_ids']).to.eql([
              'user-1',
              'user-2',
            ]);
          });
        });
      });
    });
  });
};
