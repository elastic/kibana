/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import expect from '@kbn/expect/expect.js';
import { FtrProviderContext } from '../../ftr_provider_context';
import { DATES } from './constants';

const DATE_WITH_DATA = DATES.metricsAndLogs.hosts.withData;
const DATE_WITHOUT_DATA = DATES.metricsAndLogs.hosts.withoutData;

const COMMON_REQUEST_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
};

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const pageObjects = getPageObjects(['common', 'infraHome']);
  const supertest = getService('supertest');

  describe('Home page', function () {
    this.tags('includeFirefox');
    before(async () => {
      await esArchiver.load('empty_kibana');
    });

    describe('without metrics present', () => {
      before(async () => await esArchiver.unload('infra/metrics_and_logs'));

      it('renders an empty data prompt', async () => {
        await pageObjects.common.navigateToApp('infraOps');
        await pageObjects.infraHome.getNoMetricsIndicesPrompt();
      });
    });

    describe('with metrics present', () => {
      before(async () => {
        await esArchiver.load('infra/metrics_and_logs');
        await pageObjects.common.navigateToApp('infraOps');
        await pageObjects.infraHome.waitForLoading();
      });
      after(async () => await esArchiver.unload('infra/metrics_and_logs'));

      it('renders the waffle map for dates with data', async () => {
        await pageObjects.infraHome.goToTime(DATE_WITH_DATA);
        await pageObjects.infraHome.getWaffleMap();
      });

      it('renders an empty data prompt for dates with no data', async () => {
        await pageObjects.infraHome.goToTime(DATE_WITHOUT_DATA);
        await pageObjects.infraHome.getNoMetricsDataPrompt();
      });

      it('records telemetry for hosts', async () => {
        await pageObjects.infraHome.goToTime(DATE_WITH_DATA);
        await pageObjects.infraHome.getWaffleMap();

        const resp = await supertest
          .post(`/api/telemetry/v2/clusters/_stats`)
          .set(COMMON_REQUEST_HEADERS)
          .set('Accept', 'application/json')
          .send({
            timeRange: {
              min: moment().subtract(1, 'hour').toISOString(),
              max: moment().toISOString(),
            },
            unencrypted: true,
          })
          .expect(200)
          .then((res: any) => res.body);

        expect(
          resp[0].stack_stats.kibana.plugins.infraops.last_24_hours.hits.infraops_hosts
        ).to.be.greaterThan(0);
      });

      it('records telemetry for docker', async () => {
        await pageObjects.infraHome.goToTime(DATE_WITH_DATA);
        await pageObjects.infraHome.getWaffleMap();
        await pageObjects.infraHome.goToDocker();

        const resp = await supertest
          .post(`/api/telemetry/v2/clusters/_stats`)
          .set(COMMON_REQUEST_HEADERS)
          .set('Accept', 'application/json')
          .send({
            timeRange: {
              min: moment().subtract(1, 'hour').toISOString(),
              max: moment().toISOString(),
            },
            unencrypted: true,
          })
          .expect(200)
          .then((res: any) => res.body);

        expect(
          resp[0].stack_stats.kibana.plugins.infraops.last_24_hours.hits.infraops_docker
        ).to.be.greaterThan(0);
      });
    });
  });
};
