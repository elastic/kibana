/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ES_TEST_INDEX_NAME } from '@kbn/alerting-api-integration-helpers';
import { IValidatedEvent } from '@kbn/event-log-plugin/server';
import {
  DOCUMENT_SOURCE,
  createEsDocument,
} from '../../../../../spaces_only/tests/alerting/create_test_data';
import { Space } from '../../../../../common/types';
import {
  GlobalReadAtSpace1,
  Space1,
  Space1AllAtSpace1,
  Superuser,
  SuperuserAtSpace1,
} from '../../../../scenarios';
import { getUrlPrefix, getEventLog, ObjectRemover } from '../../../../../common/lib';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';
import {
  activeO11yAlertsOlderThan90,
  activeO11yAlertsNewerThan90,
  activeSecurityAlertsOlderThan90,
  activeSecurityAlertsNewerThan90,
  activeStackAlertsOlderThan90,
  activeStackAlertsNewerThan90,
  inactiveO11yAlertsOlderThan90,
  inactiveO11yAlertsNewerThan90,
  inactiveSecurityAlertsOlderThan90,
  inactiveSecurityAlertsNewerThan90,
  inactiveStackAlertsOlderThan90,
  inactiveStackAlertsNewerThan90,
  getTestAlertDocs,
} from './alert_deletion_test_utils';

// eslint-disable-next-line import/no-default-export
export default function alertDeletionTests({ getService }: FtrProviderContext) {
  const retry = getService('retry');
  const es = getService('es');
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const objectRemover = new ObjectRemover(supertest);

  async function indexTestDocs() {
    const testAlertDocs = getTestAlertDocs();
    const operations = testAlertDocs.flatMap(({ _index, _id, _source: doc }) => {
      return [{ index: { _index, _id } }, doc];
    });
    await es.bulk({ refresh: 'wait_for', operations });
  }

  const getEventLogWithRetry = async (id: string, space: Space) => {
    await retry.try(async () => {
      return await getEventLog({
        getService,
        spaceId: space.id,
        type: 'alert',
        id,
        provider: 'alerting',
        actions: new Map([['execute', { equal: 1 }]]),
      });
    });
  };

  const testExpectedAlertsAreDeleted = async (
    expectedAlertsIds: string[],
    deletedAlertIds: string[]
  ) => {
    // wait for the task to complete
    await retry.try(async () => {
      const results = await es.search<IValidatedEvent>({
        index: '.kibana-event-log*',
        query: { bool: { must: [{ match: { 'event.action': 'delete-alerts' } }] } },
      });
      expect(results.hits.hits.length).to.eql(1);
      expect(results.hits.hits[0]._source?.event?.outcome).to.eql('success');
      expect(results.hits.hits[0]._source?.kibana?.alert?.deletion?.num_deleted).to.eql(
        deletedAlertIds.length
      );
    });

    await retry.try(async () => {
      // query for alerts
      const alerts = await es.search({
        index: '.internal.alerts-*',
        size: 100,
        query: { match_all: {} },
      });
      expect(alerts.hits.hits.length).to.eql(expectedAlertsIds.length);
      expectedAlertsIds.forEach((alertId) => {
        expect(alerts.hits.hits.findIndex((a) => a._id === alertId)).to.be.greaterThan(-1);
      });
    });
  };

  describe('alert deletion', () => {
    before(async () => {
      // We're in a non-default space, so we need a detection rule to run and generate alerts
      // in order to create the space-specific alerts index
      // write documents in the future, figure out the end date
      await createEsDocument(es, new Date().valueOf(), 1, ES_TEST_INDEX_NAME);

      // Create siem.queryRule
      const response = await supertestWithoutAuth
        .post(`${getUrlPrefix(Space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .auth(SuperuserAtSpace1.user.username, SuperuserAtSpace1.user.password)
        .send({
          enabled: true,
          name: 'test siem query rule',
          tags: [],
          rule_type_id: 'siem.queryRule',
          consumer: 'siem',
          schedule: { interval: '24h' },
          actions: [],
          params: {
            author: [],
            description: 'test',
            falsePositives: [],
            from: 'now-86460s',
            ruleId: '31c54f10-9d3b-45a8-b064-b92e8c6fcbe7',
            immutable: false,
            license: '',
            outputIndex: '',
            meta: {
              from: '1m',
              kibana_siem_app_url: 'https://localhost:5601/app/security',
            },
            maxSignals: 20,
            riskScore: 21,
            riskScoreMapping: [],
            severity: 'low',
            severityMapping: [],
            threat: [],
            to: 'now',
            references: [],
            version: 1,
            exceptionsList: [],
            relatedIntegrations: [],
            requiredFields: [],
            setup: '',
            type: 'query',
            language: 'kuery',
            index: [ES_TEST_INDEX_NAME],
            query: `source:${DOCUMENT_SOURCE}`,
            filters: [],
          },
        });

      const ruleId = response.body.id;
      objectRemover.add(Space1.id, ruleId, 'rule', 'alerting');
      await getEventLogWithRetry(ruleId, Space1);

      // delete the created alerts
      await es.deleteByQuery({
        index: '.internal.alerts-*',
        query: { match_all: {} },
        conflicts: 'proceed',
      });
    });

    beforeEach(async () => {
      await indexTestDocs();
    });

    afterEach(async () => {
      await es.deleteByQuery({
        index: '.internal.alerts-*',
        query: { match_all: {} },
        conflicts: 'proceed',
      });
      await es.deleteByQuery({
        index: '.kibana-event-log*',
        query: { bool: { must: [{ match: { 'event.action': 'delete-alerts' } }] } },
        conflicts: 'proceed',
      });
    });

    after(async () => {
      await objectRemover.removeAll();
    });

    // TODO - switch to all scenarios when real APIs available
    for (const scenario of [
      GlobalReadAtSpace1,
      SuperuserAtSpace1,
      Space1AllAtSpace1,
    ] /* UserAtSpaceScenarios*/) {
      describe(scenario.id, () => {
        it('should return the correct number of alerts to delete when previewing', async () => {
          const previewDeleteAllCategoryActiveAlerts = await supertest
            .post(`${getUrlPrefix(scenario.space.id)}/api/alerts_fixture/preview_alert_deletion`)
            .set('kbn-xsrf', 'foo')
            .send({
              isActiveAlertsDeletionEnabled: true,
              isInactiveAlertsDeletionEnabled: false,
              activeAlertsDeletionThreshold: 90,
              inactiveAlertsDeletionThreshold: 90,
            });

          const previewDeleteAllCategoryInactiveAlerts = await supertest
            .post(`${getUrlPrefix(scenario.space.id)}/api/alerts_fixture/preview_alert_deletion`)
            .set('kbn-xsrf', 'foo')
            .send({
              isActiveAlertsDeletionEnabled: false,
              isInactiveAlertsDeletionEnabled: true,
              activeAlertsDeletionThreshold: 90,
              inactiveAlertsDeletionThreshold: 90,
            });

          const previewDeleteAllCategoryActiveAndInactiveAlerts = await supertest
            .post(`${getUrlPrefix(scenario.space.id)}/api/alerts_fixture/preview_alert_deletion`)
            .set('kbn-xsrf', 'foo')
            .send({
              isActiveAlertsDeletionEnabled: true,
              isInactiveAlertsDeletionEnabled: true,
              activeAlertsDeletionThreshold: 90,
              inactiveAlertsDeletionThreshold: 90,
            });

          const previewDeleteObservabilityActiveAlerts = await supertest
            .post(`${getUrlPrefix(scenario.space.id)}/api/alerts_fixture/preview_alert_deletion`)
            .set('kbn-xsrf', 'foo')
            .send({
              isActiveAlertsDeletionEnabled: true,
              isInactiveAlertsDeletionEnabled: false,
              activeAlertsDeletionThreshold: 90,
              inactiveAlertsDeletionThreshold: 90,
              categoryIds: ['observability'],
            });

          const previewDeleteObservabilityInactiveAlerts = await supertest
            .post(`${getUrlPrefix(scenario.space.id)}/api/alerts_fixture/preview_alert_deletion`)
            .set('kbn-xsrf', 'foo')
            .send({
              isActiveAlertsDeletionEnabled: false,
              isInactiveAlertsDeletionEnabled: true,
              activeAlertsDeletionThreshold: 90,
              inactiveAlertsDeletionThreshold: 90,
              categoryIds: ['observability'],
            });

          const previewDeleteObservabilityActiveAndInactiveAlerts = await supertest
            .post(`${getUrlPrefix(scenario.space.id)}/api/alerts_fixture/preview_alert_deletion`)
            .set('kbn-xsrf', 'foo')
            .send({
              isActiveAlertsDeletionEnabled: true,
              isInactiveAlertsDeletionEnabled: true,
              activeAlertsDeletionThreshold: 90,
              inactiveAlertsDeletionThreshold: 90,
              categoryIds: ['observability'],
            });

          const previewDeleteSecurityActiveAlerts = await supertest
            .post(`${getUrlPrefix(scenario.space.id)}/api/alerts_fixture/preview_alert_deletion`)
            .set('kbn-xsrf', 'foo')
            .send({
              isActiveAlertsDeletionEnabled: true,
              isInactiveAlertsDeletionEnabled: false,
              activeAlertsDeletionThreshold: 90,
              inactiveAlertsDeletionThreshold: 90,
              categoryIds: ['securitySolution'],
            });

          const previewDeleteSecurityInactiveAlerts = await supertest
            .post(`${getUrlPrefix(scenario.space.id)}/api/alerts_fixture/preview_alert_deletion`)
            .set('kbn-xsrf', 'foo')
            .send({
              isActiveAlertsDeletionEnabled: false,
              isInactiveAlertsDeletionEnabled: true,
              activeAlertsDeletionThreshold: 90,
              inactiveAlertsDeletionThreshold: 90,
              categoryIds: ['securitySolution'],
            });

          const previewDeleteSecurityActiveAndInactiveAlerts = await supertest
            .post(`${getUrlPrefix(scenario.space.id)}/api/alerts_fixture/preview_alert_deletion`)
            .set('kbn-xsrf', 'foo')
            .send({
              isActiveAlertsDeletionEnabled: true,
              isInactiveAlertsDeletionEnabled: true,
              activeAlertsDeletionThreshold: 90,
              inactiveAlertsDeletionThreshold: 90,
              categoryIds: ['securitySolution'],
            });

          const previewDeleteManagementActiveAlerts = await supertest
            .post(`${getUrlPrefix(scenario.space.id)}/api/alerts_fixture/preview_alert_deletion`)
            .set('kbn-xsrf', 'foo')
            .send({
              isActiveAlertsDeletionEnabled: true,
              isInactiveAlertsDeletionEnabled: false,
              activeAlertsDeletionThreshold: 90,
              inactiveAlertsDeletionThreshold: 90,
              categoryIds: ['management'],
            });

          const previewDeleteManagementInactiveAlerts = await supertest
            .post(`${getUrlPrefix(scenario.space.id)}/api/alerts_fixture/preview_alert_deletion`)
            .set('kbn-xsrf', 'foo')
            .send({
              isActiveAlertsDeletionEnabled: false,
              isInactiveAlertsDeletionEnabled: true,
              activeAlertsDeletionThreshold: 90,
              inactiveAlertsDeletionThreshold: 90,
              categoryIds: ['management'],
            });

          const previewDeleteManagementActiveAndInactiveAlerts = await supertest
            .post(`${getUrlPrefix(scenario.space.id)}/api/alerts_fixture/preview_alert_deletion`)
            .set('kbn-xsrf', 'foo')
            .send({
              isActiveAlertsDeletionEnabled: true,
              isInactiveAlertsDeletionEnabled: true,
              activeAlertsDeletionThreshold: 90,
              inactiveAlertsDeletionThreshold: 90,
              categoryIds: ['management'],
            });

          const previewDeleteMultiCategoryActiveAlerts = await supertest
            .post(`${getUrlPrefix(scenario.space.id)}/api/alerts_fixture/preview_alert_deletion`)
            .set('kbn-xsrf', 'foo')
            .send({
              isActiveAlertsDeletionEnabled: true,
              isInactiveAlertsDeletionEnabled: false,
              activeAlertsDeletionThreshold: 90,
              inactiveAlertsDeletionThreshold: 90,
              categoryIds: ['observability', 'management'],
            });

          const previewDeleteMultiCategoryInactiveAlerts = await supertest
            .post(`${getUrlPrefix(scenario.space.id)}/api/alerts_fixture/preview_alert_deletion`)
            .set('kbn-xsrf', 'foo')
            .send({
              isActiveAlertsDeletionEnabled: false,
              isInactiveAlertsDeletionEnabled: true,
              activeAlertsDeletionThreshold: 90,
              inactiveAlertsDeletionThreshold: 90,
              categoryIds: ['observability', 'securitySolution'],
            });

          const previewDeleteMultiCategoryActiveAndInactiveAlerts = await supertest
            .post(`${getUrlPrefix(scenario.space.id)}/api/alerts_fixture/preview_alert_deletion`)
            .set('kbn-xsrf', 'foo')
            .send({
              isActiveAlertsDeletionEnabled: true,
              isInactiveAlertsDeletionEnabled: true,
              activeAlertsDeletionThreshold: 90,
              inactiveAlertsDeletionThreshold: 90,
              categoryIds: ['securitySolution', 'management'],
            });

          switch (scenario.id) {
            // case 'no_kibana_privileges at space1':
            // case 'space_1_all at space2':
            // case 'space_1_all_with_restricted_fixture at space1':
            // case 'space_1_all_alerts_none_actions at space1':
            //   // when preview route is available, expect a forbidden error
            //   // current test route does not gate on rules settings permissions
            //   break;
            case 'global_read at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
              expect(previewDeleteAllCategoryActiveAlerts.status).to.eql(200);
              expect(previewDeleteAllCategoryActiveAlerts.body.numAlertsDeleted).to.eql(
                activeStackAlertsOlderThan90.length +
                  activeO11yAlertsOlderThan90.length +
                  activeSecurityAlertsOlderThan90.length
              );

              expect(previewDeleteAllCategoryInactiveAlerts.status).to.eql(200);
              expect(previewDeleteAllCategoryInactiveAlerts.body.numAlertsDeleted).to.eql(
                inactiveStackAlertsOlderThan90.length +
                  inactiveO11yAlertsOlderThan90.length +
                  inactiveSecurityAlertsOlderThan90.length
              );

              expect(previewDeleteAllCategoryActiveAndInactiveAlerts.status).to.eql(200);
              expect(previewDeleteAllCategoryActiveAndInactiveAlerts.body.numAlertsDeleted).to.eql(
                activeStackAlertsOlderThan90.length +
                  activeO11yAlertsOlderThan90.length +
                  activeSecurityAlertsOlderThan90.length +
                  inactiveStackAlertsOlderThan90.length +
                  inactiveO11yAlertsOlderThan90.length +
                  inactiveSecurityAlertsOlderThan90.length
              );

              expect(previewDeleteObservabilityActiveAlerts.status).to.eql(200);
              expect(previewDeleteObservabilityActiveAlerts.body.numAlertsDeleted).to.eql(
                activeO11yAlertsOlderThan90.length
              );

              expect(previewDeleteObservabilityInactiveAlerts.status).to.eql(200);
              expect(previewDeleteObservabilityInactiveAlerts.body.numAlertsDeleted).to.eql(
                inactiveO11yAlertsOlderThan90.length
              );

              expect(previewDeleteObservabilityActiveAndInactiveAlerts.status).to.eql(200);
              expect(
                previewDeleteObservabilityActiveAndInactiveAlerts.body.numAlertsDeleted
              ).to.eql(activeO11yAlertsOlderThan90.length + inactiveO11yAlertsOlderThan90.length);

              expect(previewDeleteSecurityActiveAlerts.status).to.eql(200);
              expect(previewDeleteSecurityActiveAlerts.body.numAlertsDeleted).to.eql(
                activeSecurityAlertsOlderThan90.length
              );

              expect(previewDeleteSecurityInactiveAlerts.status).to.eql(200);
              expect(previewDeleteSecurityInactiveAlerts.body.numAlertsDeleted).to.eql(
                inactiveSecurityAlertsOlderThan90.length
              );

              expect(previewDeleteSecurityActiveAndInactiveAlerts.status).to.eql(200);
              expect(previewDeleteSecurityActiveAndInactiveAlerts.body.numAlertsDeleted).to.eql(
                activeSecurityAlertsOlderThan90.length + inactiveSecurityAlertsOlderThan90.length
              );

              expect(previewDeleteManagementActiveAlerts.status).to.eql(200);
              expect(previewDeleteManagementActiveAlerts.body.numAlertsDeleted).to.eql(
                activeStackAlertsOlderThan90.length
              );

              expect(previewDeleteManagementInactiveAlerts.status).to.eql(200);
              expect(previewDeleteManagementInactiveAlerts.body.numAlertsDeleted).to.eql(
                inactiveStackAlertsOlderThan90.length
              );

              expect(previewDeleteManagementActiveAndInactiveAlerts.status).to.eql(200);
              expect(previewDeleteManagementActiveAndInactiveAlerts.body.numAlertsDeleted).to.eql(
                activeStackAlertsOlderThan90.length + inactiveStackAlertsOlderThan90.length
              );

              expect(previewDeleteMultiCategoryActiveAlerts.status).to.eql(200);
              expect(previewDeleteMultiCategoryActiveAlerts.body.numAlertsDeleted).to.eql(
                activeStackAlertsOlderThan90.length + activeO11yAlertsOlderThan90.length
              );

              expect(previewDeleteMultiCategoryInactiveAlerts.status).to.eql(200);
              expect(previewDeleteMultiCategoryInactiveAlerts.body.numAlertsDeleted).to.eql(
                inactiveO11yAlertsOlderThan90.length + inactiveSecurityAlertsOlderThan90.length
              );

              expect(previewDeleteMultiCategoryActiveAndInactiveAlerts.status).to.eql(200);
              expect(
                previewDeleteMultiCategoryActiveAndInactiveAlerts.body.numAlertsDeleted
              ).to.eql(
                activeStackAlertsOlderThan90.length +
                  activeSecurityAlertsOlderThan90.length +
                  inactiveStackAlertsOlderThan90.length +
                  inactiveSecurityAlertsOlderThan90.length
              );
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should delete the correct of alerts - all category active alerts', async () => {
          // update the alert deletion rules setting
          await supertestWithoutAuth
            .post(
              `${getUrlPrefix(scenario.space.id)}/internal/alerting/rules/settings/_alert_deletion`
            )
            .set('kbn-xsrf', 'foo')
            .auth(Superuser.username, Superuser.password)
            .send({
              is_active_alerts_deletion_enabled: true,
              is_inactive_alerts_deletion_enabled: false,
              active_alerts_deletion_threshold: 90,
              inactive_alerts_deletion_threshold: 90,
            })
            .expect(200);

          // schedule the task
          const scheduleResponse = await supertest
            .post(`${getUrlPrefix(scenario.space.id)}/api/alerts_fixture/schedule_alert_deletion`)
            .set('kbn-xsrf', 'foo')
            .send({});

          switch (scenario.id) {
            // case 'no_kibana_privileges at space1':
            // case 'space_1_all at space2':
            // case 'space_1_all_with_restricted_fixture at space1':
            // case 'space_1_all_alerts_none_actions at space1':
            // when schedule route is available, expect a forbidden error
            // current test route does not gate on rules settings permissions
            // break;
            case 'global_read at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
              expect(scheduleResponse.status).to.eql(200);

              const expectedAlerts = [
                ...inactiveStackAlertsOlderThan90,
                ...inactiveStackAlertsNewerThan90,
                ...activeStackAlertsNewerThan90,
                ...inactiveO11yAlertsOlderThan90,
                ...inactiveO11yAlertsNewerThan90,
                ...activeO11yAlertsNewerThan90,
                ...inactiveSecurityAlertsOlderThan90,
                ...inactiveSecurityAlertsNewerThan90,
                ...activeSecurityAlertsNewerThan90,
              ];

              const deletedAlerts = [
                ...activeStackAlertsOlderThan90,
                ...activeO11yAlertsOlderThan90,
                ...activeSecurityAlertsOlderThan90,
              ];

              await testExpectedAlertsAreDeleted(
                expectedAlerts.map((a) => a.space1.id),
                deletedAlerts.map((a) => a.space1.id)
              );

              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should delete the correct of alerts - all category inactive alerts', async () => {
          // update the alert deletion rules setting
          await supertestWithoutAuth
            .post(
              `${getUrlPrefix(scenario.space.id)}/internal/alerting/rules/settings/_alert_deletion`
            )
            .set('kbn-xsrf', 'foo')
            .auth(Superuser.username, Superuser.password)
            .send({
              is_active_alerts_deletion_enabled: false,
              is_inactive_alerts_deletion_enabled: true,
              active_alerts_deletion_threshold: 90,
              inactive_alerts_deletion_threshold: 90,
            })
            .expect(200);

          // schedule the task
          const scheduleResponse = await supertest
            .post(`${getUrlPrefix(scenario.space.id)}/api/alerts_fixture/schedule_alert_deletion`)
            .set('kbn-xsrf', 'foo')
            .send({});

          switch (scenario.id) {
            // case 'no_kibana_privileges at space1':
            // case 'space_1_all at space2':
            // case 'space_1_all_with_restricted_fixture at space1':
            // case 'space_1_all_alerts_none_actions at space1':
            //   // when schedule route is available, expect a forbidden error
            //   // current test route does not gate on rules settings permissions
            //   break;
            case 'global_read at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
              expect(scheduleResponse.status).to.eql(200);

              const expectedAlerts = [
                ...inactiveStackAlertsNewerThan90,
                ...activeStackAlertsOlderThan90,
                ...activeStackAlertsNewerThan90,
                ...inactiveO11yAlertsNewerThan90,
                ...activeO11yAlertsOlderThan90,
                ...activeO11yAlertsNewerThan90,
                ...inactiveSecurityAlertsNewerThan90,
                ...activeSecurityAlertsOlderThan90,
                ...activeSecurityAlertsNewerThan90,
              ];

              const deletedAlerts = [
                ...inactiveStackAlertsOlderThan90,
                ...inactiveO11yAlertsOlderThan90,
                ...inactiveSecurityAlertsOlderThan90,
              ];

              await testExpectedAlertsAreDeleted(
                expectedAlerts.map((a) => a.space1.id),
                deletedAlerts.map((a) => a.space1.id)
              );
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should delete the correct of alerts - all category active and inactive alerts', async () => {
          // update the alert deletion rules setting
          await supertestWithoutAuth
            .post(
              `${getUrlPrefix(scenario.space.id)}/internal/alerting/rules/settings/_alert_deletion`
            )
            .set('kbn-xsrf', 'foo')
            .auth(Superuser.username, Superuser.password)
            .send({
              is_active_alerts_deletion_enabled: true,
              is_inactive_alerts_deletion_enabled: true,
              active_alerts_deletion_threshold: 90,
              inactive_alerts_deletion_threshold: 90,
            })
            .expect(200);

          // schedule the task
          const scheduleResponse = await supertest
            .post(`${getUrlPrefix(scenario.space.id)}/api/alerts_fixture/schedule_alert_deletion`)
            .set('kbn-xsrf', 'foo')
            .send({});

          switch (scenario.id) {
            // case 'no_kibana_privileges at space1':
            // case 'space_1_all at space2':
            // case 'space_1_all_with_restricted_fixture at space1':
            // case 'space_1_all_alerts_none_actions at space1':
            //   // when schedule route is available, expect a forbidden error
            //   // current test route does not gate on rules settings permissions
            //   break;
            case 'global_read at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
              expect(scheduleResponse.status).to.eql(200);

              const expectedAlerts = [
                ...inactiveStackAlertsNewerThan90,
                ...activeStackAlertsNewerThan90,
                ...inactiveO11yAlertsNewerThan90,
                ...activeO11yAlertsNewerThan90,
                ...inactiveSecurityAlertsNewerThan90,
                ...activeSecurityAlertsNewerThan90,
              ];

              const deletedAlerts = [
                ...inactiveStackAlertsOlderThan90,
                ...activeStackAlertsOlderThan90,
                ...inactiveO11yAlertsOlderThan90,
                ...activeO11yAlertsOlderThan90,
                ...inactiveSecurityAlertsOlderThan90,
                ...activeSecurityAlertsOlderThan90,
              ];

              await testExpectedAlertsAreDeleted(
                expectedAlerts.map((a) => a.space1.id),
                deletedAlerts.map((a) => a.space1.id)
              );
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should delete the correct of alerts - observability active alerts', async () => {
          // update the alert deletion rules setting
          await supertestWithoutAuth
            .post(
              `${getUrlPrefix(scenario.space.id)}/internal/alerting/rules/settings/_alert_deletion`
            )
            .set('kbn-xsrf', 'foo')
            .auth(Superuser.username, Superuser.password)
            .send({
              is_active_alerts_deletion_enabled: true,
              is_inactive_alerts_deletion_enabled: false,
              active_alerts_deletion_threshold: 90,
              inactive_alerts_deletion_threshold: 90,
              category_ids: ['observability'],
            })
            .expect(200);

          // schedule the task
          const scheduleResponse = await supertest
            .post(`${getUrlPrefix(scenario.space.id)}/api/alerts_fixture/schedule_alert_deletion`)
            .set('kbn-xsrf', 'foo')
            .send({});

          switch (scenario.id) {
            // case 'no_kibana_privileges at space1':
            // case 'space_1_all at space2':
            // case 'space_1_all_with_restricted_fixture at space1':
            // case 'space_1_all_alerts_none_actions at space1':
            //   // when schedule route is available, expect a forbidden error
            //   // current test route does not gate on rules settings permissions
            //   break;
            case 'global_read at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
              expect(scheduleResponse.status).to.eql(200);

              const expectedAlerts = [
                ...inactiveStackAlertsOlderThan90,
                ...inactiveStackAlertsNewerThan90,
                ...activeStackAlertsOlderThan90,
                ...activeStackAlertsNewerThan90,
                ...inactiveO11yAlertsOlderThan90,
                ...inactiveO11yAlertsNewerThan90,
                ...activeO11yAlertsNewerThan90,
                ...inactiveSecurityAlertsOlderThan90,
                ...inactiveSecurityAlertsNewerThan90,
                ...activeSecurityAlertsOlderThan90,
                ...activeSecurityAlertsNewerThan90,
              ];

              const deletedAlerts = activeO11yAlertsOlderThan90;

              await testExpectedAlertsAreDeleted(
                expectedAlerts.map((a) => a.space1.id),
                deletedAlerts.map((a) => a.space1.id)
              );
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should delete the correct of alerts - observability inactive alerts', async () => {
          // update the alert deletion rules setting
          await supertestWithoutAuth
            .post(
              `${getUrlPrefix(scenario.space.id)}/internal/alerting/rules/settings/_alert_deletion`
            )
            .set('kbn-xsrf', 'foo')
            .auth(Superuser.username, Superuser.password)
            .send({
              is_active_alerts_deletion_enabled: false,
              is_inactive_alerts_deletion_enabled: true,
              active_alerts_deletion_threshold: 90,
              inactive_alerts_deletion_threshold: 90,
              category_ids: ['observability'],
            })
            .expect(200);

          // schedule the task
          const scheduleResponse = await supertest
            .post(`${getUrlPrefix(scenario.space.id)}/api/alerts_fixture/schedule_alert_deletion`)
            .set('kbn-xsrf', 'foo')
            .send({});

          switch (scenario.id) {
            // case 'no_kibana_privileges at space1':
            // case 'space_1_all at space2':
            // case 'space_1_all_with_restricted_fixture at space1':
            // case 'space_1_all_alerts_none_actions at space1':
            //   // when schedule route is available, expect a forbidden error
            //   // current test route does not gate on rules settings permissions
            //   break;
            case 'global_read at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
              expect(scheduleResponse.status).to.eql(200);

              const expectedAlerts = [
                ...inactiveStackAlertsOlderThan90,
                ...inactiveStackAlertsNewerThan90,
                ...activeStackAlertsOlderThan90,
                ...activeStackAlertsNewerThan90,
                ...inactiveO11yAlertsNewerThan90,
                ...activeO11yAlertsOlderThan90,
                ...activeO11yAlertsNewerThan90,
                ...inactiveSecurityAlertsOlderThan90,
                ...inactiveSecurityAlertsNewerThan90,
                ...activeSecurityAlertsOlderThan90,
                ...activeSecurityAlertsNewerThan90,
              ];

              const deletedAlerts = inactiveO11yAlertsOlderThan90;

              await testExpectedAlertsAreDeleted(
                expectedAlerts.map((a) => a.space1.id),
                deletedAlerts.map((a) => a.space1.id)
              );
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should delete the correct of alerts - observability active and inactive alerts', async () => {
          // update the alert deletion rules setting
          await supertestWithoutAuth
            .post(
              `${getUrlPrefix(scenario.space.id)}/internal/alerting/rules/settings/_alert_deletion`
            )
            .set('kbn-xsrf', 'foo')
            .auth(Superuser.username, Superuser.password)
            .send({
              is_active_alerts_deletion_enabled: true,
              is_inactive_alerts_deletion_enabled: true,
              active_alerts_deletion_threshold: 90,
              inactive_alerts_deletion_threshold: 90,
              category_ids: ['observability'],
            })
            .expect(200);

          // schedule the task
          const scheduleResponse = await supertest
            .post(`${getUrlPrefix(scenario.space.id)}/api/alerts_fixture/schedule_alert_deletion`)
            .set('kbn-xsrf', 'foo')
            .send({});

          switch (scenario.id) {
            // case 'no_kibana_privileges at space1':
            // case 'space_1_all at space2':
            // case 'space_1_all_with_restricted_fixture at space1':
            // case 'space_1_all_alerts_none_actions at space1':
            //   // when schedule route is available, expect a forbidden error
            //   // current test route does not gate on rules settings permissions
            //   break;
            case 'global_read at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
              expect(scheduleResponse.status).to.eql(200);

              const expectedAlerts = [
                ...inactiveStackAlertsOlderThan90,
                ...inactiveStackAlertsNewerThan90,
                ...activeStackAlertsOlderThan90,
                ...activeStackAlertsNewerThan90,
                ...inactiveO11yAlertsNewerThan90,
                ...activeO11yAlertsNewerThan90,
                ...inactiveSecurityAlertsOlderThan90,
                ...inactiveSecurityAlertsNewerThan90,
                ...activeSecurityAlertsOlderThan90,
                ...activeSecurityAlertsNewerThan90,
              ];

              const deletedAlerts = [
                ...inactiveO11yAlertsOlderThan90,
                ...activeO11yAlertsOlderThan90,
              ];

              await testExpectedAlertsAreDeleted(
                expectedAlerts.map((a) => a.space1.id),
                deletedAlerts.map((a) => a.space1.id)
              );
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should delete the correct of alerts - security active alerts', async () => {
          // update the alert deletion rules setting
          await supertestWithoutAuth
            .post(
              `${getUrlPrefix(scenario.space.id)}/internal/alerting/rules/settings/_alert_deletion`
            )
            .set('kbn-xsrf', 'foo')
            .auth(Superuser.username, Superuser.password)
            .send({
              is_active_alerts_deletion_enabled: true,
              is_inactive_alerts_deletion_enabled: false,
              active_alerts_deletion_threshold: 90,
              inactive_alerts_deletion_threshold: 90,
              category_ids: ['securitySolution'],
            })
            .expect(200);

          // schedule the task
          const scheduleResponse = await supertest
            .post(`${getUrlPrefix(scenario.space.id)}/api/alerts_fixture/schedule_alert_deletion`)
            .set('kbn-xsrf', 'foo')
            .send({});

          switch (scenario.id) {
            // case 'no_kibana_privileges at space1':
            // case 'space_1_all at space2':
            // case 'space_1_all_with_restricted_fixture at space1':
            // case 'space_1_all_alerts_none_actions at space1':
            //   // when schedule route is available, expect a forbidden error
            //   // current test route does not gate on rules settings permissions
            //   break;
            case 'global_read at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
              expect(scheduleResponse.status).to.eql(200);

              const expectedAlerts = [
                ...inactiveStackAlertsOlderThan90,
                ...inactiveStackAlertsNewerThan90,
                ...activeStackAlertsOlderThan90,
                ...activeStackAlertsNewerThan90,
                ...inactiveO11yAlertsOlderThan90,
                ...inactiveO11yAlertsNewerThan90,
                ...activeO11yAlertsOlderThan90,
                ...activeO11yAlertsNewerThan90,
                ...inactiveSecurityAlertsOlderThan90,
                ...inactiveSecurityAlertsNewerThan90,
                ...activeSecurityAlertsNewerThan90,
              ];

              const deletedAlerts = activeSecurityAlertsOlderThan90;

              await testExpectedAlertsAreDeleted(
                expectedAlerts.map((a) => a.space1.id),
                deletedAlerts.map((a) => a.space1.id)
              );
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should delete the correct of alerts - security inactive alerts', async () => {
          await supertestWithoutAuth
            .post(
              `${getUrlPrefix(scenario.space.id)}/internal/alerting/rules/settings/_alert_deletion`
            )
            .set('kbn-xsrf', 'foo')
            .auth(Superuser.username, Superuser.password)
            .send({
              is_active_alerts_deletion_enabled: false,
              is_inactive_alerts_deletion_enabled: true,
              active_alerts_deletion_threshold: 90,
              inactive_alerts_deletion_threshold: 90,
              category_ids: ['securitySolution'],
            })
            .expect(200);

          // schedule the task
          const scheduleResponse = await supertest
            .post(`${getUrlPrefix(scenario.space.id)}/api/alerts_fixture/schedule_alert_deletion`)
            .set('kbn-xsrf', 'foo')
            .send({});

          switch (scenario.id) {
            // case 'no_kibana_privileges at space1':
            // case 'space_1_all at space2':
            // case 'space_1_all_with_restricted_fixture at space1':
            // case 'space_1_all_alerts_none_actions at space1':
            //   // when schedule route is available, expect a forbidden error
            //   // current test route does not gate on rules settings permissions
            //   break;
            case 'global_read at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
              expect(scheduleResponse.status).to.eql(200);

              const expectedAlerts = [
                ...inactiveStackAlertsOlderThan90,
                ...inactiveStackAlertsNewerThan90,
                ...activeStackAlertsOlderThan90,
                ...activeStackAlertsNewerThan90,
                ...inactiveO11yAlertsOlderThan90,
                ...inactiveO11yAlertsNewerThan90,
                ...activeO11yAlertsOlderThan90,
                ...activeO11yAlertsNewerThan90,
                ...inactiveSecurityAlertsNewerThan90,
                ...activeSecurityAlertsOlderThan90,
                ...activeSecurityAlertsNewerThan90,
              ];

              const deletedAlerts = inactiveSecurityAlertsOlderThan90;

              await testExpectedAlertsAreDeleted(
                expectedAlerts.map((a) => a.space1.id),
                deletedAlerts.map((a) => a.space1.id)
              );
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should delete the correct of alerts - security active and inactive alerts', async () => {
          // update the alert deletion rules setting
          await supertestWithoutAuth
            .post(
              `${getUrlPrefix(scenario.space.id)}/internal/alerting/rules/settings/_alert_deletion`
            )
            .set('kbn-xsrf', 'foo')
            .auth(Superuser.username, Superuser.password)
            .send({
              is_active_alerts_deletion_enabled: true,
              is_inactive_alerts_deletion_enabled: true,
              active_alerts_deletion_threshold: 90,
              inactive_alerts_deletion_threshold: 90,
              category_ids: ['securitySolution'],
            })
            .expect(200);

          // schedule the task
          const scheduleResponse = await supertest
            .post(`${getUrlPrefix(scenario.space.id)}/api/alerts_fixture/schedule_alert_deletion`)
            .set('kbn-xsrf', 'foo')
            .send({});

          switch (scenario.id) {
            // case 'no_kibana_privileges at space1':
            // case 'space_1_all at space2':
            // case 'space_1_all_with_restricted_fixture at space1':
            // case 'space_1_all_alerts_none_actions at space1':
            //   // when schedule route is available, expect a forbidden error
            //   // current test route does not gate on rules settings permissions
            //   break;
            case 'global_read at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
              expect(scheduleResponse.status).to.eql(200);

              const expectedAlerts = [
                ...inactiveStackAlertsOlderThan90,
                ...inactiveStackAlertsNewerThan90,
                ...activeStackAlertsOlderThan90,
                ...activeStackAlertsNewerThan90,
                ...inactiveO11yAlertsOlderThan90,
                ...inactiveO11yAlertsNewerThan90,
                ...activeO11yAlertsOlderThan90,
                ...activeO11yAlertsNewerThan90,
                ...inactiveSecurityAlertsNewerThan90,
                ...activeSecurityAlertsNewerThan90,
              ];

              const deletedAlerts = [
                ...inactiveSecurityAlertsOlderThan90,
                ...activeSecurityAlertsOlderThan90,
              ];

              await testExpectedAlertsAreDeleted(
                expectedAlerts.map((a) => a.space1.id),
                deletedAlerts.map((a) => a.space1.id)
              );
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should delete the correct of alerts - management active alerts', async () => {
          await supertestWithoutAuth
            .post(
              `${getUrlPrefix(scenario.space.id)}/internal/alerting/rules/settings/_alert_deletion`
            )
            .set('kbn-xsrf', 'foo')
            .auth(Superuser.username, Superuser.password)
            .send({
              is_active_alerts_deletion_enabled: true,
              is_inactive_alerts_deletion_enabled: false,
              active_alerts_deletion_threshold: 90,
              inactive_alerts_deletion_threshold: 90,
              category_ids: ['management'],
            })
            .expect(200);

          // schedule the task
          const scheduleResponse = await supertest
            .post(`${getUrlPrefix(scenario.space.id)}/api/alerts_fixture/schedule_alert_deletion`)
            .set('kbn-xsrf', 'foo')
            .send({});

          switch (scenario.id) {
            // case 'no_kibana_privileges at space1':
            // case 'space_1_all at space2':
            // case 'space_1_all_with_restricted_fixture at space1':
            // case 'space_1_all_alerts_none_actions at space1':
            //   // when schedule route is available, expect a forbidden error
            //   // current test route does not gate on rules settings permissions
            //   break;
            case 'global_read at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
              expect(scheduleResponse.status).to.eql(200);

              const expectedAlerts = [
                ...inactiveStackAlertsOlderThan90,
                ...inactiveStackAlertsNewerThan90,
                ...activeStackAlertsNewerThan90,
                ...inactiveO11yAlertsOlderThan90,
                ...inactiveO11yAlertsNewerThan90,
                ...activeO11yAlertsOlderThan90,
                ...activeO11yAlertsNewerThan90,
                ...inactiveSecurityAlertsOlderThan90,
                ...inactiveSecurityAlertsNewerThan90,
                ...activeSecurityAlertsOlderThan90,
                ...activeSecurityAlertsNewerThan90,
              ];

              const deletedAlerts = activeStackAlertsOlderThan90;

              await testExpectedAlertsAreDeleted(
                expectedAlerts.map((a) => a.space1.id),
                deletedAlerts.map((a) => a.space1.id)
              );
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should delete the correct of alerts - management inactive alerts', async () => {
          // update the alert deletion rules setting
          await supertestWithoutAuth
            .post(
              `${getUrlPrefix(scenario.space.id)}/internal/alerting/rules/settings/_alert_deletion`
            )
            .set('kbn-xsrf', 'foo')
            .auth(Superuser.username, Superuser.password)
            .send({
              is_active_alerts_deletion_enabled: false,
              is_inactive_alerts_deletion_enabled: true,
              active_alerts_deletion_threshold: 90,
              inactive_alerts_deletion_threshold: 90,
              category_ids: ['management'],
            })
            .expect(200);

          // schedule the task
          const scheduleResponse = await supertest
            .post(`${getUrlPrefix(scenario.space.id)}/api/alerts_fixture/schedule_alert_deletion`)
            .set('kbn-xsrf', 'foo')
            .send({});

          switch (scenario.id) {
            // case 'no_kibana_privileges at space1':
            // case 'space_1_all at space2':
            // case 'space_1_all_with_restricted_fixture at space1':
            // case 'space_1_all_alerts_none_actions at space1':
            //   // when schedule route is available, expect a forbidden error
            //   // current test route does not gate on rules settings permissions
            //   break;
            case 'global_read at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
              expect(scheduleResponse.status).to.eql(200);

              const expectedAlerts = [
                ...inactiveStackAlertsNewerThan90,
                ...activeStackAlertsOlderThan90,
                ...activeStackAlertsNewerThan90,
                ...inactiveO11yAlertsOlderThan90,
                ...inactiveO11yAlertsNewerThan90,
                ...activeO11yAlertsOlderThan90,
                ...activeO11yAlertsNewerThan90,
                ...inactiveSecurityAlertsOlderThan90,
                ...inactiveSecurityAlertsNewerThan90,
                ...activeSecurityAlertsOlderThan90,
                ...activeSecurityAlertsNewerThan90,
              ];

              const deletedAlerts = inactiveStackAlertsOlderThan90;

              await testExpectedAlertsAreDeleted(
                expectedAlerts.map((a) => a.space1.id),
                deletedAlerts.map((a) => a.space1.id)
              );
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should delete the correct of alerts - management active and inactive alerts', async () => {
          // update the alert deletion rules setting
          await supertestWithoutAuth
            .post(
              `${getUrlPrefix(scenario.space.id)}/internal/alerting/rules/settings/_alert_deletion`
            )
            .set('kbn-xsrf', 'foo')
            .auth(Superuser.username, Superuser.password)
            .send({
              is_active_alerts_deletion_enabled: true,
              is_inactive_alerts_deletion_enabled: true,
              active_alerts_deletion_threshold: 90,
              inactive_alerts_deletion_threshold: 90,
              category_ids: ['management'],
            })
            .expect(200);

          // schedule the task
          const scheduleResponse = await supertest
            .post(`${getUrlPrefix(scenario.space.id)}/api/alerts_fixture/schedule_alert_deletion`)
            .set('kbn-xsrf', 'foo')
            .send({});

          switch (scenario.id) {
            // case 'no_kibana_privileges at space1':
            // case 'space_1_all at space2':
            // case 'space_1_all_with_restricted_fixture at space1':
            // case 'space_1_all_alerts_none_actions at space1':
            //   // when schedule route is available, expect a forbidden error
            //   // current test route does not gate on rules settings permissions
            //   break;
            case 'global_read at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
              expect(scheduleResponse.status).to.eql(200);

              const expectedAlerts = [
                ...inactiveStackAlertsNewerThan90,
                ...activeStackAlertsNewerThan90,
                ...inactiveO11yAlertsOlderThan90,
                ...inactiveO11yAlertsNewerThan90,
                ...activeO11yAlertsOlderThan90,
                ...activeO11yAlertsNewerThan90,
                ...inactiveSecurityAlertsOlderThan90,
                ...inactiveSecurityAlertsNewerThan90,
                ...activeSecurityAlertsOlderThan90,
                ...activeSecurityAlertsNewerThan90,
              ];

              const deletedAlerts = [
                ...inactiveStackAlertsOlderThan90,
                ...activeStackAlertsOlderThan90,
              ];

              await testExpectedAlertsAreDeleted(
                expectedAlerts.map((a) => a.space1.id),
                deletedAlerts.map((a) => a.space1.id)
              );
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should delete the correct of alerts - multi-category active alerts', async () => {
          await supertestWithoutAuth
            .post(
              `${getUrlPrefix(scenario.space.id)}/internal/alerting/rules/settings/_alert_deletion`
            )
            .set('kbn-xsrf', 'foo')
            .auth(Superuser.username, Superuser.password)
            .send({
              is_active_alerts_deletion_enabled: true,
              is_inactive_alerts_deletion_enabled: false,
              active_alerts_deletion_threshold: 90,
              inactive_alerts_deletion_threshold: 90,
              category_ids: ['observability', 'management'],
            })
            .expect(200);

          // schedule the task
          const scheduleResponse = await supertest
            .post(`${getUrlPrefix(scenario.space.id)}/api/alerts_fixture/schedule_alert_deletion`)
            .set('kbn-xsrf', 'foo')
            .send({});

          switch (scenario.id) {
            // case 'no_kibana_privileges at space1':
            // case 'space_1_all at space2':
            // case 'space_1_all_with_restricted_fixture at space1':
            // case 'space_1_all_alerts_none_actions at space1':
            //   // when schedule route is available, expect a forbidden error
            //   // current test route does not gate on rules settings permissions
            //   break;
            case 'global_read at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
              expect(scheduleResponse.status).to.eql(200);

              const expectedAlerts = [
                ...inactiveStackAlertsOlderThan90,
                ...inactiveStackAlertsNewerThan90,
                ...activeStackAlertsNewerThan90,
                ...inactiveO11yAlertsOlderThan90,
                ...inactiveO11yAlertsNewerThan90,
                ...activeO11yAlertsNewerThan90,
                ...inactiveSecurityAlertsOlderThan90,
                ...inactiveSecurityAlertsNewerThan90,
                ...activeSecurityAlertsOlderThan90,
                ...activeSecurityAlertsNewerThan90,
              ];

              const deletedAlerts = [
                ...activeStackAlertsOlderThan90,
                ...activeO11yAlertsOlderThan90,
              ];

              await testExpectedAlertsAreDeleted(
                expectedAlerts.map((a) => a.space1.id),
                deletedAlerts.map((a) => a.space1.id)
              );
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should delete the correct of alerts - multi-category inactive alerts', async () => {
          await supertestWithoutAuth
            .post(
              `${getUrlPrefix(scenario.space.id)}/internal/alerting/rules/settings/_alert_deletion`
            )
            .set('kbn-xsrf', 'foo')
            .auth(Superuser.username, Superuser.password)
            .send({
              is_active_alerts_deletion_enabled: false,
              is_inactive_alerts_deletion_enabled: true,
              active_alerts_deletion_threshold: 90,
              inactive_alerts_deletion_threshold: 90,
              category_ids: ['observability', 'securitySolution'],
            })
            .expect(200);

          // schedule the task
          const scheduleResponse = await supertest
            .post(`${getUrlPrefix(scenario.space.id)}/api/alerts_fixture/schedule_alert_deletion`)
            .set('kbn-xsrf', 'foo')
            .send({});

          switch (scenario.id) {
            // case 'no_kibana_privileges at space1':
            // case 'space_1_all at space2':
            // case 'space_1_all_with_restricted_fixture at space1':
            // case 'space_1_all_alerts_none_actions at space1':
            //   // when schedule route is available, expect a forbidden error
            //   // current test route does not gate on rules settings permissions
            //   break;
            case 'global_read at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
              expect(scheduleResponse.status).to.eql(200);

              const expectedAlerts = [
                ...inactiveStackAlertsOlderThan90,
                ...inactiveStackAlertsNewerThan90,
                ...activeStackAlertsOlderThan90,
                ...activeStackAlertsNewerThan90,
                ...inactiveO11yAlertsNewerThan90,
                ...activeO11yAlertsOlderThan90,
                ...activeO11yAlertsNewerThan90,
                ...inactiveSecurityAlertsNewerThan90,
                ...activeSecurityAlertsOlderThan90,
                ...activeSecurityAlertsNewerThan90,
              ];

              const deletedAlerts = [
                ...inactiveO11yAlertsOlderThan90,
                ...inactiveSecurityAlertsOlderThan90,
              ];

              await testExpectedAlertsAreDeleted(
                expectedAlerts.map((a) => a.space1.id),
                deletedAlerts.map((a) => a.space1.id)
              );
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should delete the correct of alerts - multi-category active and inactive alerts', async () => {
          // update the alert deletion rules setting
          await supertestWithoutAuth
            .post(
              `${getUrlPrefix(scenario.space.id)}/internal/alerting/rules/settings/_alert_deletion`
            )
            .set('kbn-xsrf', 'foo')
            .auth(Superuser.username, Superuser.password)
            .send({
              is_active_alerts_deletion_enabled: true,
              is_inactive_alerts_deletion_enabled: true,
              active_alerts_deletion_threshold: 90,
              inactive_alerts_deletion_threshold: 90,
              category_ids: ['management', 'securitySolution'],
            })
            .expect(200);

          // schedule the task
          const scheduleResponse = await supertest
            .post(`${getUrlPrefix(scenario.space.id)}/api/alerts_fixture/schedule_alert_deletion`)
            .set('kbn-xsrf', 'foo')
            .send({});

          switch (scenario.id) {
            // case 'no_kibana_privileges at space1':
            // case 'space_1_all at space2':
            // case 'space_1_all_with_restricted_fixture at space1':
            // case 'space_1_all_alerts_none_actions at space1':
            //   // when schedule route is available, expect a forbidden error
            //   // current test route does not gate on rules settings permissions
            //   break;
            case 'global_read at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
              expect(scheduleResponse.status).to.eql(200);

              const expectedAlerts = [
                ...inactiveStackAlertsNewerThan90,
                ...activeStackAlertsNewerThan90,
                ...inactiveO11yAlertsOlderThan90,
                ...inactiveO11yAlertsNewerThan90,
                ...activeO11yAlertsOlderThan90,
                ...activeO11yAlertsNewerThan90,
                ...inactiveSecurityAlertsNewerThan90,
                ...activeSecurityAlertsNewerThan90,
              ];

              const deletedAlerts = [
                ...inactiveStackAlertsOlderThan90,
                ...activeStackAlertsOlderThan90,
                ...inactiveSecurityAlertsOlderThan90,
                ...activeSecurityAlertsOlderThan90,
              ];

              await testExpectedAlertsAreDeleted(
                expectedAlerts.map((a) => a.space1.id),
                deletedAlerts.map((a) => a.space1.id)
              );
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });
      });
    }

    describe('multi-space', () => {
      it('should delete alerts from multiple spaces when specified', async () => {
        // index docs into the default space
        const testAlertDocs = getTestAlertDocs('default');
        const operations = testAlertDocs.flatMap(({ _index, _id, _source: doc }) => {
          return [{ index: { _index, _id } }, doc];
        });
        await es.bulk({ refresh: 'wait_for', operations });

        // set alert deletion settings in space 1
        await supertestWithoutAuth
          .post(`${getUrlPrefix(Space1.id)}/internal/alerting/rules/settings/_alert_deletion`)
          .set('kbn-xsrf', 'foo')
          .auth(Superuser.username, Superuser.password)
          .send({
            is_active_alerts_deletion_enabled: false,
            is_inactive_alerts_deletion_enabled: true,
            active_alerts_deletion_threshold: 90,
            inactive_alerts_deletion_threshold: 90,
          })
          .expect(200);

        // set alert deletion settings in default space
        await supertestWithoutAuth
          .post(`${getUrlPrefix('default')}/internal/alerting/rules/settings/_alert_deletion`)
          .set('kbn-xsrf', 'foo')
          .auth(Superuser.username, Superuser.password)
          .send({
            is_active_alerts_deletion_enabled: false,
            is_inactive_alerts_deletion_enabled: true,
            active_alerts_deletion_threshold: 90,
            inactive_alerts_deletion_threshold: 90,
            category_ids: ['observability'],
          })
          .expect(200);

        // schedule the task
        await supertest
          .post(`${getUrlPrefix(Space1.id)}/api/alerts_fixture/schedule_alert_deletion`)
          .set('kbn-xsrf', 'foo')
          .send({
            spaceIds: [Space1.id, 'default'],
          })
          .expect(200);

        const expectedAlertsSpace1 = [
          ...inactiveStackAlertsNewerThan90,
          ...activeStackAlertsOlderThan90,
          ...activeStackAlertsNewerThan90,
          ...inactiveO11yAlertsNewerThan90,
          ...activeO11yAlertsOlderThan90,
          ...activeO11yAlertsNewerThan90,
          ...inactiveSecurityAlertsNewerThan90,
          ...activeSecurityAlertsOlderThan90,
          ...activeSecurityAlertsNewerThan90,
        ];

        const deletedAlertsSpace1 = [
          ...inactiveStackAlertsOlderThan90,
          ...inactiveO11yAlertsOlderThan90,
          ...inactiveSecurityAlertsOlderThan90,
        ];

        const expectedAlertsDefault = [
          ...inactiveStackAlertsOlderThan90,
          ...inactiveStackAlertsNewerThan90,
          ...activeStackAlertsOlderThan90,
          ...activeStackAlertsNewerThan90,
          ...inactiveO11yAlertsNewerThan90,
          ...activeO11yAlertsOlderThan90,
          ...activeO11yAlertsNewerThan90,
          ...inactiveSecurityAlertsOlderThan90,
          ...inactiveSecurityAlertsNewerThan90,
          ...activeSecurityAlertsOlderThan90,
          ...activeSecurityAlertsNewerThan90,
        ];

        const deletedAlertsDefault = inactiveO11yAlertsOlderThan90;

        const expectedAlertIds = [
          ...expectedAlertsDefault.map((a) => a.default.id),
          ...expectedAlertsSpace1.map((a) => a.space1.id),
        ];

        // wait for the task to complete
        await retry.try(async () => {
          const results = await es.search<IValidatedEvent>({
            index: '.kibana-event-log*',
            query: { bool: { must: [{ match: { 'event.action': 'delete-alerts' } }] } },
          });
          expect(results.hits.hits.length).to.eql(2);
          expect(results.hits.hits[0]._source?.event?.outcome).to.eql('success');
          expect(results.hits.hits[1]._source?.event?.outcome).to.eql('success');

          const defaultSpaceEventLog = results.hits.hits.find(
            (hit) => hit._source?.kibana?.space_ids?.[0] === 'default'
          );
          expect(defaultSpaceEventLog).not.to.be(undefined);
          expect(defaultSpaceEventLog?._source?.kibana?.alert?.deletion?.num_deleted).to.eql(
            deletedAlertsDefault.length
          );

          const space1SpaceEventLog = results.hits.hits.find(
            (hit) => hit._source?.kibana?.space_ids?.[0] === 'space1'
          );
          expect(space1SpaceEventLog).not.to.be(undefined);
          expect(space1SpaceEventLog?._source?.kibana?.alert?.deletion?.num_deleted).to.eql(
            deletedAlertsSpace1.length
          );
        });

        await retry.try(async () => {
          // query for alerts
          const alerts = await es.search({
            index: '.internal.alerts-*',
            size: 100,
            query: { match_all: {} },
          });
          expect(alerts.hits.hits.length).to.eql(expectedAlertIds.length);
          expectedAlertIds.forEach((alertId) => {
            expect(alerts.hits.hits.findIndex((a) => a._id === alertId)).to.be.greaterThan(-1);
          });
        });
      });
    });
  });
}
