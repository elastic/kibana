/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
      await esArchiver.load('alerts');
    });

    after(async () => {
      await esArchiver.unload('alerts');
    });

    it('7.10.0 migrates the `alerting` consumer to be the `alerts`', async () => {
      const response = await supertest.get(
        `${getUrlPrefix(``)}/api/alerts/alert/74f3e6d7-b7bb-477d-ac28-92ee22728e6e`
      );

      expect(response.status).to.eql(200);
      expect(response.body.consumer).to.equal('alerts');
    });

    it('7.10.0 migrates the `metrics` consumer to be the `infrastructure`', async () => {
      const response = await supertest.get(
        `${getUrlPrefix(``)}/api/alerts/alert/74f3e6d7-b7bb-477d-ac28-fdf248d5f2a4`
      );

      expect(response.status).to.eql(200);
      expect(response.body.consumer).to.equal('infrastructure');
    });

    it('7.10.0 migrates PagerDuty actions to have a default dedupKey', async () => {
      const response = await supertest.get(
        `${getUrlPrefix(``)}/api/alerts/alert/b6087f72-994f-46fb-8120-c6e5c50d0f8f`
      );

      expect(response.status).to.eql(200);

      expect(response.body.actions).to.eql([
        {
          actionTypeId: '.pagerduty',
          id: 'a6a8ab7a-35cf-445e-ade3-215a029c2ee3',
          group: 'default',
          params: {
            component: '',
            eventAction: 'trigger',
            summary: 'fired {{alertInstanceId}}',
          },
        },
        {
          actionTypeId: '.pagerduty',
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
          actionTypeId: '.pagerduty',
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
        `${getUrlPrefix(``)}/api/alerts/alert/74f3e6d7-b7bb-477d-ac28-92ee22728e6e`
      );

      expect(response.status).to.eql(200);
      expect(response.body.updatedAt).to.eql('2020-06-17T15:35:39.839Z');
    });
  });
}
