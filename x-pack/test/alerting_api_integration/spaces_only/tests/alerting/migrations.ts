/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { getUrlPrefix } from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function createGetTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('migrations', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/alerts');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/alerts');
    });

    it('7.10.0 migrates the `alerting` consumer to be the `alerts`', async () => {
      const response = await supertest.get(
        `${getUrlPrefix(``)}/api/alerting/rule/74f3e6d7-b7bb-477d-ac28-92ee22728e6e`
      );

      expect(response.status).to.eql(200);
      expect(response.body.consumer).to.equal('alerts');
    });

    it('7.10.0 migrates the `metrics` consumer to be the `infrastructure`', async () => {
      const response = await supertest.get(
        `${getUrlPrefix(``)}/api/alerting/rule/74f3e6d7-b7bb-477d-ac28-fdf248d5f2a4`
      );

      expect(response.status).to.eql(200);
      expect(response.body.consumer).to.equal('infrastructure');
    });

    it('7.10.0 migrates PagerDuty actions to have a default dedupKey', async () => {
      const response = await supertest.get(
        `${getUrlPrefix(``)}/api/alerting/rule/b6087f72-994f-46fb-8120-c6e5c50d0f8f`
      );

      expect(response.status).to.eql(200);

      expect(response.body.actions).to.eql([
        {
          connector_type_id: '.pagerduty',
          id: 'a6a8ab7a-35cf-445e-ade3-215a029c2ee3',
          group: 'default',
          params: {
            component: '',
            eventAction: 'trigger',
            summary: 'fired {{alertInstanceId}}',
          },
        },
        {
          connector_type_id: '.pagerduty',
          id: 'a6a8ab7a-35cf-445e-ade3-215a029c2ee3',
          group: 'default',
          params: {
            component: '',
            dedupKey: '{{alertId}}',
            eventAction: 'resolve',
            summary: 'fired {{alertInstanceId}}',
          },
        },
        {
          connector_type_id: '.pagerduty',
          id: 'a6a8ab7a-35cf-445e-ade3-215a029c2ee3',
          group: 'default',
          params: {
            component: '',
            dedupKey: '{{alertInstanceId}}',
            eventAction: 'resolve',
            summary: 'fired {{alertInstanceId}}',
          },
        },
      ]);
    });

    it('7.11.0 migrates alerts to contain `updatedAt` field', async () => {
      const response = await supertest.get(
        `${getUrlPrefix(``)}/api/alerting/rule/74f3e6d7-b7bb-477d-ac28-92ee22728e6e`
      );

      expect(response.status).to.eql(200);
      expect(response.body.updated_at).to.eql('2020-06-17T15:35:39.839Z');
    });

    it('7.11.0 migrates alerts to contain `notifyWhen` field', async () => {
      const response = await supertest.get(
        `${getUrlPrefix(``)}/api/alerting/rule/74f3e6d7-b7bb-477d-ac28-92ee22728e6e`
      );

      expect(response.status).to.eql(200);
      expect(response.body.notify_when).to.eql('onActiveAlert');
    });

    it('7.11.2 migrates alerts with case actions, case fields are nested in an incident object', async () => {
      const response = await supertest.get(
        `${getUrlPrefix(``)}/api/alerting/rule/99f3e6d7-b7bb-477d-ac28-92ee22726969`
      );

      expect(response.status).to.eql(200);
      expect(response.body.actions).to.eql([
        {
          id: '66a8ab7a-35cf-445e-ade3-215a029c6969',
          connector_type_id: '.servicenow',
          group: 'threshold met',
          params: {
            subAction: 'pushToService',
            subActionParams: {
              incident: {
                severity: '2',
                impact: '2',
                urgency: '2',
                short_description: 'SN short desc',
                description: 'SN desc',
              },
              comments: [{ commentId: '1', comment: 'sn comment' }],
            },
          },
        },
        {
          id: '66a8ab7a-35cf-445e-ade3-215a029c6969',
          connector_type_id: '.jira',
          group: 'threshold met',
          params: {
            subAction: 'pushToService',
            subActionParams: {
              incident: {
                summary: 'Jira summary',
                issueType: '10001',
                description: 'Jira description',
                priority: 'Highest',
                parent: 'CASES-78',
                labels: ['test'],
              },
              comments: [
                {
                  commentId: '1',
                  comment: 'jira comment',
                },
              ],
            },
          },
        },
        {
          id: '66a8ab7a-35cf-445e-ade3-215a029c6969',
          connector_type_id: '.resilient',
          group: 'threshold met',
          params: {
            subAction: 'pushToService',
            subActionParams: {
              incident: {
                incidentTypes: ['17', '21'],
                severityCode: '5',
                name: 'IBM name',
                description: 'IBM description',
              },
              comments: [
                {
                  commentId: 'alert-comment',
                  comment: 'IBM comment',
                },
              ],
            },
          },
        },
      ]);
    });
  });
}
