/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import moment from 'moment';
import { FtrProviderContext } from '../../ftr_provider_context';
import { DATES } from './constants';

const START_DATE = moment.utc(DATES.metricsAndLogs.hosts.min);
const END_DATE = moment.utc(DATES.metricsAndLogs.hosts.max);
const timepickerFormat = 'MMM D, YYYY @ HH:mm:ss.SSS';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const browser = getService('browser');
  const pageObjects = getPageObjects(['common', 'infraHome', 'timePicker', 'infraHostsView']);
  const kibanaServer = getService('kibanaServer');

  describe('Hosts view', function () {
    this.tags('includeFirefox');
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    describe('Basic functionality', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs');
        await pageObjects.common.navigateToApp('infraOps');
        await pageObjects.infraHome.goToHostsView();
        await pageObjects.timePicker.setAbsoluteRange(
          START_DATE.format(timepickerFormat),
          END_DATE.format(timepickerFormat)
        );
      });
      after(() => esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs'));

      it('should render the correct page title', async () => {
        const documentTitle = await browser.getTitle();
        expect(documentTitle).to.contain('Hosts - Infrastructure - Observability - Elastic');
      });

      it('should have six hosts', async () => {
        const hosts = await pageObjects.infraHostsView.getHostsTableData();
        expect(hosts.length).to.equal(6);
      });

      it('should load 5 metrics trend tiles', async () => {
        const hosts = await pageObjects.infraHostsView.getMetricsTrendTilesCount();
        expect(hosts.length).to.equal(5);
      });

      [
        { metric: 'hosts', value: '6' },
        { metric: 'cpu', value: '0.8%' },
        { metric: 'memory', value: '16.8%' },
        { metric: 'tx', value: '0 bit/s' },
        { metric: 'rx', value: '0 bit/s' },
      ].forEach(({ metric, value }) => {
        it(`${metric} tile should show ${value}`, async () => {
          const tileValue = await pageObjects.infraHostsView.getMetricsTrendTileValue(metric);
          expect(tileValue).to.eql(value);
        });
      });
    });
  });
};
