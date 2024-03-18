/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { SECURITY_SOLUTION_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';

import { DETECTION_ENGINE_RULES_URL } from '@kbn/security-solution-plugin/common/constants';
import {
  getLegacyActionSOById,
  getLegacyActionNotificationSOById,
  getRuleSOById,
} from '../../../utils';
import { FtrProviderContext } from '../../../../../ftr_provider_context';

/**
 * @deprecated Once the legacy notification system is removed, remove this test too.
 */
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const es = getService('es');
  const esArchiver = getService('esArchiver');

  describe('@ess actions migrations', () => {
    // This test suite is not meant to test a specific route, but to test the legacy action migration
    // code that lives in multiple routes. This code is also tested in each of the routes it lives in
    // but not in as much detail and relying on mocks. This test loads an es_archive containing rules
    // created in 7.15 with legacy actions.
    // For new routes that do any updates on a rule, please ensure that you are including the legacy
    // action migration code. We are monitoring legacy action telemetry to clean up once we see their
    // existence being near 0.
    describe('legacy actions', () => {
      before(async () => {
        await esArchiver.load(
          'x-pack/test/functional/es_archives/security_solution/legacy_actions'
        );
      });

      after(async () => {
        await esArchiver.unload(
          'x-pack/test/functional/es_archives/security_solution/legacy_actions'
        );
      });

      it('migrates legacy actions for rule with no actions', async () => {
        const soId = '9095ee90-b075-11ec-bb3f-1f063f8e06cf';
        const ruleId = '2297be91-894c-4831-830f-b424a0ec84f0';
        const legacySidecarId = '926668d0-b075-11ec-bb3f-1f063f8e06cf';

        // check for legacy sidecar action
        const sidecarActionSO = await getLegacyActionSOById(es, legacySidecarId);
        expect(sidecarActionSO.hits.hits.length).to.eql(1);

        // check for legacy notification SO
        // should not have been created for a rule with no actions
        const legacyNotificationSO = await getLegacyActionNotificationSOById(es, soId);
        expect(legacyNotificationSO.hits.hits.length).to.eql(0);

        // patch enable the rule
        // any route that edits the rule should trigger the migration
        await supertest
          .patch(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send({ rule_id: ruleId, enabled: false })
          .expect(200);

        const {
          hits: {
            hits: [{ _source: ruleSO }],
          },
        } = await getRuleSOById(es, soId);

        // Sidecar should be removed
        const sidecarActionsSOAfterMigration = await getLegacyActionSOById(es, legacySidecarId);
        expect(sidecarActionsSOAfterMigration.hits.hits.length).to.eql(0);

        expect(ruleSO?.alert.actions).to.eql([]);
        expect(ruleSO?.alert.throttle).to.eql(null);
        expect(ruleSO?.alert.notifyWhen).to.eql(null);
      });

      it('migrates legacy actions for rule with action run on every run', async () => {
        const soId = 'dc6595f0-b075-11ec-bb3f-1f063f8e06cf';
        const ruleId = '72a0d429-363b-4f70-905e-c6019a224d40';
        const legacySidecarId = 'dde13970-b075-11ec-bb3f-1f063f8e06cf';

        // check for legacy sidecar action
        const sidecarActionSO = await getLegacyActionSOById(es, legacySidecarId);
        expect(sidecarActionSO.hits.hits.length).to.eql(1);

        // check for legacy notification SO
        // should not have been created for a rule that runs on every rule run
        const legacyNotificationSO = await getLegacyActionNotificationSOById(es, soId);
        expect(legacyNotificationSO.hits.hits.length).to.eql(0);

        // patch enable the rule
        // any route that edits the rule should trigger the migration
        await supertest
          .patch(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send({ rule_id: ruleId, enabled: false })
          .expect(200);

        const {
          hits: {
            hits: [{ _source: ruleSO }],
          },
        } = await getRuleSOById(es, soId);

        // Sidecar should be removed
        const sidecarActionsSOAfterMigration = await getLegacyActionSOById(es, legacySidecarId);
        expect(sidecarActionsSOAfterMigration.hits.hits.length).to.eql(0);

        expect(ruleSO?.alert.actions).to.eql([
          {
            actionRef: 'action_0',
            actionTypeId: '.email',
            group: 'default',
            params: {
              message: 'Rule {{context.rule.name}} generated {{state.signals_count}} alerts',
              subject: 'Test Actions',
              to: ['test@test.com'],
            },
            uuid: ruleSO?.alert.actions[0].uuid,
            frequency: { summary: true, throttle: null, notifyWhen: 'onActiveAlert' },
          },
          {
            actionRef: 'action_1',
            actionTypeId: '.email',
            group: 'default',
            params: {
              message: 'Rule {{context.rule.name}} generated {{state.signals_count}} alerts',
              subject: 'Test Actions',
              to: ['test@test.com'],
            },
            uuid: ruleSO?.alert.actions[1].uuid,
            frequency: { summary: true, throttle: null, notifyWhen: 'onActiveAlert' },
          },
        ]);
        expect(ruleSO?.alert.throttle).to.eql(null);
        expect(ruleSO?.alert.notifyWhen).to.eql(null);
        expect(ruleSO?.references).to.eql([
          {
            id: 'c95cb100-b075-11ec-bb3f-1f063f8e06cf',
            name: 'action_0',
            type: 'action',
          },
          {
            id: 'c95cb100-b075-11ec-bb3f-1f063f8e06cf',
            name: 'action_1',
            type: 'action',
          },
        ]);
      });

      it('migrates legacy actions for rule with action run hourly', async () => {
        const soId = '064e3160-b076-11ec-bb3f-1f063f8e06cf';
        const ruleId = '4c056b05-75ac-4209-be32-82100f771eb4';
        const legacySidecarId = '07aa8d10-b076-11ec-bb3f-1f063f8e06cf';

        // check for legacy sidecar action
        const sidecarActionSO = await getLegacyActionSOById(es, legacySidecarId);
        expect(sidecarActionSO.hits.hits.length).to.eql(1);

        // check for legacy notification SO
        const legacyNotificationSO = await getLegacyActionNotificationSOById(es, soId);
        expect(legacyNotificationSO.hits.hits.length).to.eql(1);

        // patch enable the rule
        // any route that edits the rule should trigger the migration
        await supertest
          .patch(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send({ rule_id: ruleId, enabled: false })
          .expect(200);

        const {
          hits: {
            hits: [{ _source: ruleSO }],
          },
        } = await getRuleSOById(es, soId);

        // Sidecar should be removed
        const sidecarActionsSOAfterMigration = await getLegacyActionSOById(es, legacySidecarId);
        expect(sidecarActionsSOAfterMigration.hits.hits.length).to.eql(0);

        // Legacy notification should be removed
        const legacyNotificationSOAfterMigration = await getLegacyActionNotificationSOById(
          es,
          soId
        );
        expect(legacyNotificationSOAfterMigration.hits.hits.length).to.eql(0);

        expect(ruleSO?.alert.actions).to.eql([
          {
            actionTypeId: '.email',
            params: {
              subject: 'Rule email',
              to: ['test@test.com'],
              message: 'Rule {{context.rule.name}} generated {{state.signals_count}} alerts',
            },
            actionRef: 'action_0',
            group: 'default',
            uuid: ruleSO?.alert.actions[0].uuid,
            frequency: { summary: true, throttle: '1h', notifyWhen: 'onThrottleInterval' },
          },
          {
            actionTypeId: '.slack',
            params: {
              message: 'Rule {{context.rule.name}} generated {{state.signals_count}} alerts',
            },
            actionRef: 'action_1',
            group: 'default',
            uuid: ruleSO?.alert.actions[1].uuid,
            frequency: { summary: true, throttle: '1h', notifyWhen: 'onThrottleInterval' },
          },
        ]);
        expect(ruleSO?.alert.throttle).to.eql(undefined);
        expect(ruleSO?.alert.notifyWhen).to.eql(null);
        expect(ruleSO?.references).to.eql([
          {
            id: 'c95cb100-b075-11ec-bb3f-1f063f8e06cf',
            name: 'action_0',
            type: 'action',
          },
          {
            id: '207fa0e0-c04e-11ec-8a52-4fb92379525a',
            name: 'action_1',
            type: 'action',
          },
        ]);
      });

      it('migrates legacy actions for rule with action run daily', async () => {
        const soId = '27639570-b076-11ec-bb3f-1f063f8e06cf';
        const ruleId = '8e2c8550-f13f-4e21-be0c-92148d71a5f1';
        const legacySidecarId = '291ae260-b076-11ec-bb3f-1f063f8e06cf';

        // check for legacy sidecar action
        const sidecarActionSO = await getLegacyActionSOById(es, legacySidecarId);
        expect(sidecarActionSO.hits.hits.length).to.eql(1);

        // check for legacy notification SO
        const legacyNotificationSO = await getLegacyActionNotificationSOById(es, soId);
        expect(legacyNotificationSO.hits.hits.length).to.eql(1);

        // patch enable the rule
        await supertest
          .patch(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send({ rule_id: ruleId, enabled: false })
          .expect(200);

        const {
          hits: {
            hits: [{ _source: ruleSO }],
          },
        } = await getRuleSOById(es, soId);

        // Sidecar should be removed
        const sidecarActionsSOAfterMigration = await getLegacyActionSOById(es, legacySidecarId);
        expect(sidecarActionsSOAfterMigration.hits.hits.length).to.eql(0);

        // Legacy notification should be removed
        const legacyNotificationSOAfterMigration = await getLegacyActionNotificationSOById(
          es,
          soId
        );
        expect(legacyNotificationSOAfterMigration.hits.hits.length).to.eql(0);

        expect(ruleSO?.alert.actions).to.eql([
          {
            actionRef: 'action_0',
            actionTypeId: '.email',
            group: 'default',
            params: {
              message: 'Rule {{context.rule.name}} generated {{state.signals_count}} alerts',
              subject: 'Test Actions',
              to: ['test@test.com'],
            },
            uuid: ruleSO?.alert.actions[0].uuid,
            frequency: { summary: true, throttle: '1d', notifyWhen: 'onThrottleInterval' },
          },
        ]);
        expect(ruleSO?.alert.throttle).to.eql(undefined);
        expect(ruleSO?.alert.notifyWhen).to.eql(null);
        expect(ruleSO?.references).to.eql([
          {
            id: 'c95cb100-b075-11ec-bb3f-1f063f8e06cf',
            name: 'action_0',
            type: 'action',
          },
        ]);
      });

      it('migrates legacy actions for rule with action run weekly', async () => {
        const soId = '61ec7a40-b076-11ec-bb3f-1f063f8e06cf';
        const ruleId = '05fbdd2a-e802-420b-bdc3-95ae0acca454';
        const legacySidecarId = '63aa2fd0-b076-11ec-bb3f-1f063f8e06cf';

        // check for legacy sidecar action
        const sidecarActionSO = await getLegacyActionSOById(es, legacySidecarId);
        expect(sidecarActionSO.hits.hits.length).to.eql(1);

        // check for legacy notification SO
        const legacyNotificationSO = await getLegacyActionNotificationSOById(es, soId);
        expect(legacyNotificationSO.hits.hits.length).to.eql(1);

        // patch enable the rule
        await supertest
          .patch(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send({ rule_id: ruleId, enabled: false })
          .expect(200);

        const {
          hits: {
            hits: [{ _source: ruleSO }],
          },
        } = await getRuleSOById(es, soId);

        // Sidecar should be removed
        const sidecarActionsSOAfterMigration = await getLegacyActionSOById(es, legacySidecarId);
        expect(sidecarActionsSOAfterMigration.hits.hits.length).to.eql(0);

        // Legacy notification should be removed
        const legacyNotificationSOAfterMigration = await getLegacyActionNotificationSOById(
          es,
          soId
        );
        expect(legacyNotificationSOAfterMigration.hits.hits.length).to.eql(0);

        expect(ruleSO?.alert.actions).to.eql([
          {
            actionRef: 'action_0',
            actionTypeId: '.email',
            group: 'default',
            params: {
              message: 'Rule {{context.rule.name}} generated {{state.signals_count}} alerts',
              subject: 'Test Actions',
              to: ['test@test.com'],
            },
            uuid: ruleSO?.alert.actions[0].uuid,
            frequency: { summary: true, throttle: '7d', notifyWhen: 'onThrottleInterval' },
          },
        ]);
        expect(ruleSO?.alert.throttle).to.eql(undefined);
        expect(ruleSO?.alert.notifyWhen).to.eql(null);
        expect(ruleSO?.references).to.eql([
          {
            id: 'c95cb100-b075-11ec-bb3f-1f063f8e06cf',
            name: 'action_0',
            type: 'action',
          },
        ]);
      });
    });

    describe('7.16.0', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/security_solution/migrations');
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/security_solution/migrations');
      });

      it('migrates legacy siem-detection-engine-rule-actions to use saved object references', async () => {
        const response = await es.get<{
          'siem-detection-engine-rule-actions': {
            ruleAlertId: string;
            actions: [{ id: string; actionRef: string }];
          };
          references: [{}];
        }>(
          {
            index: SECURITY_SOLUTION_SAVED_OBJECT_INDEX,
            id: 'siem-detection-engine-rule-actions:fce024a0-0452-11ec-9b15-d13d79d162f3',
          },
          {
            meta: true,
          }
        );
        expect(response.statusCode).to.eql(200);

        // references exist and are expected values
        expect(response.body._source?.references).to.eql([
          {
            name: 'alert_0',
            id: 'fb1046a0-0452-11ec-9b15-d13d79d162f3',
            type: 'alert',
          },
          {
            name: 'action_0',
            id: 'f6e64c00-0452-11ec-9b15-d13d79d162f3',
            type: 'action',
          },
        ]);

        // actionRef exists and is the expected value
        expect(
          response.body._source?.['siem-detection-engine-rule-actions'].actions[0].actionRef
        ).to.eql('action_0');

        // ruleAlertId no longer exist
        expect(response.body._source?.['siem-detection-engine-rule-actions'].ruleAlertId).to.eql(
          undefined
        );

        // actions.id no longer exist
        expect(response.body._source?.['siem-detection-engine-rule-actions'].actions[0].id).to.eql(
          undefined
        );
      });

      it('migrates legacy siem-detection-engine-rule-actions and retains "ruleThrottle" and "alertThrottle" as the same attributes as before', async () => {
        const response = await es.get<{
          'siem-detection-engine-rule-actions': {
            ruleThrottle: string;
            alertThrottle: string;
          };
        }>(
          {
            index: SECURITY_SOLUTION_SAVED_OBJECT_INDEX,
            id: 'siem-detection-engine-rule-actions:fce024a0-0452-11ec-9b15-d13d79d162f3',
          },
          {
            meta: true,
          }
        );
        expect(response.statusCode).to.eql(200);

        // "alertThrottle" and "ruleThrottle" should still exist
        expect(response.body._source?.['siem-detection-engine-rule-actions'].alertThrottle).to.eql(
          '7d'
        );
        expect(response.body._source?.['siem-detection-engine-rule-actions'].ruleThrottle).to.eql(
          '7d'
        );
      });
    });
  });
};
