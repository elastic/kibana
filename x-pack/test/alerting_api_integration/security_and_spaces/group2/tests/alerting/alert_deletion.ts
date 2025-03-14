/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ES_TEST_INDEX_NAME } from '@kbn/alerting-api-integration-helpers';
import {
  DOCUMENT_SOURCE,
  createEsDocument,
} from '../../../../spaces_only/tests/alerting/create_test_data';
import { Space } from '../../../../common/types';
import { Space1, SuperuserAtSpace1, UserAtSpaceScenarios } from '../../../scenarios';
import { getUrlPrefix, getEventLog, ObjectRemover } from '../../../../common/lib';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import {
  activeO11yAlertsShouldBeDeleted,
  activeSecurityAlertsShouldBeDeleted,
  activeStackAlertsShouldBeDeleted,
  inactiveO11yAlertsShouldBeDeleted,
  inactiveSecurityAlertsShouldBeDeleted,
  inactiveStackAlertsShouldBeDeleted,
  testAlertDocs,
} from './alert_deletion_test_utils';

// eslint-disable-next-line import/no-default-export
export default function alertDeletionTests({ getService }: FtrProviderContext) {
  const retry = getService('retry');
  const es = getService('es');
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const objectRemover = new ObjectRemover(supertest);

  async function indexTestDocs() {
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

  // inject active alerts, security, stack, o11y
  // inject inactive alerts, security, stack, o11y
  // recovered/untracked/acknowledged
  // test preview returns the correct number
  // test calling the deletion task with different settings
  // only active enabled
  // only inactive enabled
  // both enabled
  // specific context

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
      await objectRemover.removeAll();
    });

    for (const scenario of UserAtSpaceScenarios) {
      // const { user, space } = scenario;

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
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'space_1_all_with_restricted_fixture at space1':
            case 'space_1_all_alerts_none_actions at space1':
              // when preview route is available, expect a forbidden error
              // current test route does not gate on rules settings permissions
              break;
            case 'global_read at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
              expect(previewDeleteAllCategoryActiveAlerts.status).to.eql(200);
              expect(previewDeleteAllCategoryActiveAlerts.body.numAlertsDeleted).to.eql(
                activeStackAlertsShouldBeDeleted.length +
                  activeO11yAlertsShouldBeDeleted.length +
                  activeSecurityAlertsShouldBeDeleted.length
              );

              expect(previewDeleteAllCategoryInactiveAlerts.status).to.eql(200);
              expect(previewDeleteAllCategoryInactiveAlerts.body.numAlertsDeleted).to.eql(
                inactiveStackAlertsShouldBeDeleted.length +
                  inactiveO11yAlertsShouldBeDeleted.length +
                  inactiveSecurityAlertsShouldBeDeleted.length
              );

              expect(previewDeleteAllCategoryActiveAndInactiveAlerts.status).to.eql(200);
              expect(previewDeleteAllCategoryActiveAndInactiveAlerts.body.numAlertsDeleted).to.eql(
                activeStackAlertsShouldBeDeleted.length +
                  activeO11yAlertsShouldBeDeleted.length +
                  activeSecurityAlertsShouldBeDeleted.length +
                  inactiveStackAlertsShouldBeDeleted.length +
                  inactiveO11yAlertsShouldBeDeleted.length +
                  inactiveSecurityAlertsShouldBeDeleted.length
              );

              expect(previewDeleteObservabilityActiveAlerts.status).to.eql(200);
              expect(previewDeleteObservabilityActiveAlerts.body.numAlertsDeleted).to.eql(
                activeO11yAlertsShouldBeDeleted.length
              );

              expect(previewDeleteObservabilityInactiveAlerts.status).to.eql(200);
              expect(previewDeleteObservabilityInactiveAlerts.body.numAlertsDeleted).to.eql(
                inactiveO11yAlertsShouldBeDeleted.length
              );

              expect(previewDeleteObservabilityActiveAndInactiveAlerts.status).to.eql(200);
              expect(
                previewDeleteObservabilityActiveAndInactiveAlerts.body.numAlertsDeleted
              ).to.eql(
                activeO11yAlertsShouldBeDeleted.length + inactiveO11yAlertsShouldBeDeleted.length
              );

              expect(previewDeleteSecurityActiveAlerts.status).to.eql(200);
              expect(previewDeleteSecurityActiveAlerts.body.numAlertsDeleted).to.eql(
                activeSecurityAlertsShouldBeDeleted.length
              );

              expect(previewDeleteSecurityInactiveAlerts.status).to.eql(200);
              expect(previewDeleteSecurityInactiveAlerts.body.numAlertsDeleted).to.eql(
                inactiveSecurityAlertsShouldBeDeleted.length
              );

              expect(previewDeleteSecurityActiveAndInactiveAlerts.status).to.eql(200);
              expect(previewDeleteSecurityActiveAndInactiveAlerts.body.numAlertsDeleted).to.eql(
                activeSecurityAlertsShouldBeDeleted.length +
                  inactiveSecurityAlertsShouldBeDeleted.length
              );

              expect(previewDeleteManagementActiveAlerts.status).to.eql(200);
              expect(previewDeleteManagementActiveAlerts.body.numAlertsDeleted).to.eql(
                activeStackAlertsShouldBeDeleted.length
              );

              expect(previewDeleteManagementInactiveAlerts.status).to.eql(200);
              expect(previewDeleteManagementInactiveAlerts.body.numAlertsDeleted).to.eql(
                inactiveStackAlertsShouldBeDeleted.length
              );

              expect(previewDeleteManagementActiveAndInactiveAlerts.status).to.eql(200);
              expect(previewDeleteManagementActiveAndInactiveAlerts.body.numAlertsDeleted).to.eql(
                activeStackAlertsShouldBeDeleted.length + inactiveStackAlertsShouldBeDeleted.length
              );

              expect(previewDeleteMultiCategoryActiveAlerts.status).to.eql(200);
              expect(previewDeleteMultiCategoryActiveAlerts.body.numAlertsDeleted).to.eql(
                activeStackAlertsShouldBeDeleted.length + activeO11yAlertsShouldBeDeleted.length
              );

              expect(previewDeleteMultiCategoryInactiveAlerts.status).to.eql(200);
              expect(previewDeleteMultiCategoryInactiveAlerts.body.numAlertsDeleted).to.eql(
                inactiveO11yAlertsShouldBeDeleted.length +
                  inactiveSecurityAlertsShouldBeDeleted.length
              );

              expect(previewDeleteMultiCategoryActiveAndInactiveAlerts.status).to.eql(200);
              expect(
                previewDeleteMultiCategoryActiveAndInactiveAlerts.body.numAlertsDeleted
              ).to.eql(
                activeStackAlertsShouldBeDeleted.length +
                  activeSecurityAlertsShouldBeDeleted.length +
                  inactiveStackAlertsShouldBeDeleted.length +
                  inactiveSecurityAlertsShouldBeDeleted.length
              );
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });
      });
    }
  });
}
