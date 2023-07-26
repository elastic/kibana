/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import {
  DETECTION_ENGINE_QUERY_SIGNALS_URL,
  DETECTION_ENGINE_ALERT_TAGS_URL,
} from '@kbn/security-solution-plugin/common/constants';
import { DetectionAlert } from '@kbn/security-solution-plugin/common/api/detection_engine';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createSignalsIndex,
  deleteAllAlerts,
  getQuerySignalIds,
  deleteAllRules,
  createRule,
  waitForSignalsToBePresent,
  getSignalsByIds,
  waitForRuleSuccess,
  getRuleForSignalTesting,
} from '../../utils';
import { setAlertTags } from '../../utils/set_alert_tags';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const log = getService('log');
  const es = getService('es');

  describe('set_alert_tags', () => {
    describe('validation checks', () => {
      it('should give errors when no alert ids are provided', async () => {
        const { body } = await supertest
          .post(DETECTION_ENGINE_ALERT_TAGS_URL)
          .set('kbn-xsrf', 'true')
          .send(setAlertTags({ tagsToAdd: [], tagsToRemove: [], ids: [] }))
          .expect(400);

        expect(body).to.eql({
          message: ['No alert ids were provided'],
          status_code: 400,
        });
      });

      it('should give errors when duplicate tags exist in both tags_to_add and tags_to_remove', async () => {
        const { body } = await supertest
          .post(DETECTION_ENGINE_ALERT_TAGS_URL)
          .set('kbn-xsrf', 'true')
          .send(setAlertTags({ tagsToAdd: ['test-1'], tagsToRemove: ['test-1'], ids: ['123'] }))
          .expect(400);

        expect(body).to.eql({
          message: [
            'Duplicate tags ["test-1"] were found in the tags_to_add and tags_to_remove parameters.',
          ],
          status_code: 400,
        });
      });
    });

    describe('tests with auditbeat data', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/auditbeat/hosts');
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/auditbeat/hosts');
      });

      beforeEach(async () => {
        await deleteAllRules(supertest, log);
        await createSignalsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteAllAlerts(supertest, log, es);
      });

      it('should be able to add tags to multiple alerts', async () => {
        const rule = {
          ...getRuleForSignalTesting(['auditbeat-*']),
          query: 'process.executable: "/usr/bin/sudo"',
        };
        const { id } = await createRule(supertest, log, rule);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForSignalsToBePresent(supertest, log, 10, [id]);
        const alerts = await getSignalsByIds(supertest, log, [id]);
        const alertIds = alerts.hits.hits.map((alert) => alert._id);

        await supertest
          .post(DETECTION_ENGINE_ALERT_TAGS_URL)
          .set('kbn-xsrf', 'true')
          .send(
            setAlertTags({
              tagsToAdd: ['tag-1'],
              tagsToRemove: [],
              ids: alertIds,
            })
          )
          .expect(200);

        const { body }: { body: estypes.SearchResponse<DetectionAlert> } = await supertest
          .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
          .set('kbn-xsrf', 'true')
          .send(getQuerySignalIds(alertIds))
          .expect(200);

        body.hits.hits.map((alert) => {
          expect(alert._source?.['kibana.alert.workflow_tags']).to.eql(['tag-1']);
        });
      });

      it('should be able to add tags to alerts that have tags already and not duplicate them', async () => {
        const rule = {
          ...getRuleForSignalTesting(['auditbeat-*']),
          query: 'process.executable: "/usr/bin/sudo"',
        };
        const { id } = await createRule(supertest, log, rule);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForSignalsToBePresent(supertest, log, 10, [id]);
        const alerts = await getSignalsByIds(supertest, log, [id]);
        const alertIds = alerts.hits.hits.map((alert) => alert._id);

        await supertest
          .post(DETECTION_ENGINE_ALERT_TAGS_URL)
          .set('kbn-xsrf', 'true')
          .send(
            setAlertTags({
              tagsToAdd: ['tag-1'],
              tagsToRemove: [],
              ids: alertIds.slice(0, 4),
            })
          )
          .expect(200);

        await supertest
          .post(DETECTION_ENGINE_ALERT_TAGS_URL)
          .set('kbn-xsrf', 'true')
          .send(
            setAlertTags({
              tagsToAdd: ['tag-1'],
              tagsToRemove: [],
              ids: alertIds,
            })
          )
          .expect(200);

        const { body }: { body: estypes.SearchResponse<DetectionAlert> } = await supertest
          .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
          .set('kbn-xsrf', 'true')
          .send(getQuerySignalIds(alertIds))
          .expect(200);

        body.hits.hits.map((alert) => {
          expect(alert._source?.['kibana.alert.workflow_tags']).to.eql(['tag-1']);
        });
      });

      it('should be able to remove tags', async () => {
        const rule = {
          ...getRuleForSignalTesting(['auditbeat-*']),
          query: 'process.executable: "/usr/bin/sudo"',
        };
        const { id } = await createRule(supertest, log, rule);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForSignalsToBePresent(supertest, log, 10, [id]);
        const alerts = await getSignalsByIds(supertest, log, [id]);
        const alertIds = alerts.hits.hits.map((alert) => alert._id);

        await supertest
          .post(DETECTION_ENGINE_ALERT_TAGS_URL)
          .set('kbn-xsrf', 'true')
          .send(
            setAlertTags({
              tagsToAdd: ['tag-1', 'tag-2'],
              tagsToRemove: [],
              ids: alertIds,
            })
          )
          .expect(200);

        await supertest
          .post(DETECTION_ENGINE_ALERT_TAGS_URL)
          .set('kbn-xsrf', 'true')
          .send(
            setAlertTags({
              tagsToAdd: [],
              tagsToRemove: ['tag-2'],
              ids: alertIds,
            })
          )
          .expect(200);

        const { body }: { body: estypes.SearchResponse<DetectionAlert> } = await supertest
          .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
          .set('kbn-xsrf', 'true')
          .send(getQuerySignalIds(alertIds))
          .expect(200);

        body.hits.hits.map((alert) => {
          expect(alert._source?.['kibana.alert.workflow_tags']).to.eql(['tag-1']);
        });
      });

      it('should be able to remove tags that do not exist without breaking', async () => {
        const rule = {
          ...getRuleForSignalTesting(['auditbeat-*']),
          query: 'process.executable: "/usr/bin/sudo"',
        };
        const { id } = await createRule(supertest, log, rule);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForSignalsToBePresent(supertest, log, 10, [id]);
        const alerts = await getSignalsByIds(supertest, log, [id]);
        const alertIds = alerts.hits.hits.map((alert) => alert._id);

        await supertest
          .post(DETECTION_ENGINE_ALERT_TAGS_URL)
          .set('kbn-xsrf', 'true')
          .send(
            setAlertTags({
              tagsToAdd: [],
              tagsToRemove: ['tag-1'],
              ids: alertIds,
            })
          )
          .expect(200);

        const { body }: { body: estypes.SearchResponse<DetectionAlert> } = await supertest
          .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
          .set('kbn-xsrf', 'true')
          .send(getQuerySignalIds(alertIds))
          .expect(200);

        body.hits.hits.map((alert) => {
          expect(alert._source?.['kibana.alert.workflow_tags']).to.eql([]);
        });
      });
    });
  });
};
