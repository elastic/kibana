/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import { resolve } from 'path';
import expect from '@kbn/expect';
import { Client as EsClient } from '@elastic/elasticsearch';
import { KbnClient } from '@kbn/test';
import { EsArchiver } from '@kbn/es-archiver';
import { CA_CERT_PATH, REPO_ROOT } from '@kbn/dev-utils';

const INTEGRATION_TEST_ROOT = process.env.WORKSPACE || resolve(REPO_ROOT, '../integration-test');
const ARCHIVE = resolve(INTEGRATION_TEST_ROOT, 'test/es_archives/metricbeat');

export default ({ getService, getPageObjects }) => {
  describe('Cross cluster search test in discover', async () => {
    const PageObjects = getPageObjects([
      'common',
      'settings',
      'discover',
      'security',
      'header',
      'timePicker',
    ]);
    const retry = getService('retry');
    const log = getService('log');
    const browser = getService('browser');
    const appsMenu = getService('appsMenu');
    const kibanaServer = getService('kibanaServer');
    const queryBar = getService('queryBar');
    const filterBar = getService('filterBar');

    before(async () => {
      await browser.setWindowSize(1200, 800);
      // picking relative time in timepicker isn't working.  This is also faster.
      // It's the default set, plus new "makelogs" +/- 3 days from now
      await kibanaServer.uiSettings.replace({
        'timepicker:quickRanges': `[
        {
          "from": "now-3d",
          "to": "now+3d",
          "display": "makelogs"
        },
        {
          "from": "now/d",
          "to": "now/d",
          "display": "Today"
        },
        {
          "from": "now/w",
          "to": "now/w",
          "display": "This week"
        },
        {
          "from": "now-15m",
          "to": "now",
          "display": "Last 15 minutes"
        },
        {
          "from": "now-30m",
          "to": "now",
          "display": "Last 30 minutes"
        },
        {
          "from": "now-1h",
          "to": "now",
          "display": "Last 1 hour"
        },
        {
          "from": "now-24h",
          "to": "now",
          "display": "Last 24 hours"
        },
        {
          "from": "now-7d",
          "to": "now",
          "display": "Last 7 days"
        },
        {
          "from": "now-30d",
          "to": "now",
          "display": "Last 30 days"
        },
        {
          "from": "now-90d",
          "to": "now",
          "display": "Last 90 days"
        },
        {
          "from": "now-1y",
          "to": "now",
          "display": "Last 1 year"
        }
      ]`,
      });
    });

    before(async () => {
      if (process.env.SECURITY === 'YES') {
        log.debug(
          '### provisionedEnv.SECURITY === YES so log in as elastic superuser to create cross cluster indices'
        );
        await PageObjects.security.logout();
      }
      const url = await browser.getCurrentUrl();
      log.debug(url);
      if (!url.includes('kibana')) {
        await PageObjects.common.navigateToApp('management', { insertTimestamp: false });
      } else if (!url.includes('management')) {
        await appsMenu.clickLink('Management');
      }
    });

    it('create local admin makelogs index pattern', async () => {
      log.debug('create local admin makelogs工程 index pattern');
      await PageObjects.settings.createIndexPattern('local:makelogs工程*');
      const patternName = await PageObjects.settings.getIndexPageHeading();
      expect(patternName).to.be('local:makelogs工程*');
    });

    it('create remote data makelogs index pattern', async () => {
      log.debug('create remote data makelogs工程 index pattern');
      await PageObjects.settings.createIndexPattern('data:makelogs工程*');
      const patternName = await PageObjects.settings.getIndexPageHeading();
      expect(patternName).to.be('data:makelogs工程*');
    });

    it('create comma separated index patterns for data and local makelogs index pattern', async () => {
      log.debug(
        'create comma separated index patterns for data and local makelogs工程 index pattern'
      );
      await PageObjects.settings.createIndexPattern('data:makelogs工程-*,local:makelogs工程-*');
      const patternName = await PageObjects.settings.getIndexPageHeading();
      expect(patternName).to.be('data:makelogs工程-*,local:makelogs工程-*');
    });

    it('create index pattern for data from both clusters', async () => {
      await PageObjects.settings.createIndexPattern('*:makelogs工程-*', '@timestamp', true, false);
      const patternName = await PageObjects.settings.getIndexPageHeading();
      expect(patternName).to.be('*:makelogs工程-*');
    });

    it('local:makelogs(star) should discover data from the local cluster', async () => {
      await PageObjects.common.navigateToApp('discover', { insertTimestamp: false });

      await PageObjects.discover.selectIndexPattern('local:makelogs工程*');
      await PageObjects.timePicker.setCommonlyUsedTime('makelogs');
      await retry.tryForTime(40000, async () => {
        const hitCount = await PageObjects.discover.getHitCount();
        log.debug('### hit count = ' + hitCount);
        expect(hitCount).to.be('14,005');
      });
    });

    it('data:makelogs(star) should discover data from remote', async function () {
      await PageObjects.discover.selectIndexPattern('data:makelogs工程*');
      await retry.tryForTime(40000, async () => {
        const hitCount = await PageObjects.discover.getHitCount();
        log.debug('### hit count = ' + hitCount);
        expect(hitCount).to.be('14,005');
      });
    });

    it('star:makelogs-star should discover data from both clusters', async function () {
      await PageObjects.discover.selectIndexPattern('*:makelogs工程-*');
      await PageObjects.timePicker.setCommonlyUsedTime('makelogs');
      await retry.tryForTime(40000, async () => {
        const hitCount = await PageObjects.discover.getHitCount();
        log.debug('### hit count = ' + hitCount);
        expect(hitCount).to.be('28,010');
      });
    });

    it('data:makelogs-star,local:makelogs-star should discover data from both clusters', async function () {
      await PageObjects.discover.selectIndexPattern('data:makelogs工程-*,local:makelogs工程-*');
      await retry.tryForTime(40000, async () => {
        const hitCount = await PageObjects.discover.getHitCount();
        log.debug('### hit count = ' + hitCount);
        expect(hitCount).to.be('28,010');
      });
    });

    it('should reload the saved search with persisted query to show the initial hit count', async function () {
      await PageObjects.discover.selectIndexPattern('data:makelogs工程-*,local:makelogs工程-*');
      // apply query some changes
      await queryBar.setQuery('success');
      await queryBar.submitQuery();
      await retry.try(async () => {
        const hitCountNumber = await PageObjects.discover.getHitCount();
        const hitCount = parseInt(hitCountNumber.replace(/\,/g, ''));
        log.debug('### hit count = ' + hitCount);
        expect(hitCount).to.be.greaterThan(25000);
        expect(hitCount).to.be.lessThan(28000);
      });
    });

    it('should add a phrases filter', async function () {
      await PageObjects.discover.selectIndexPattern('data:makelogs工程-*,local:makelogs工程-*');
      const hitCountNumber = await PageObjects.discover.getHitCount();
      const originalHitCount = parseInt(hitCountNumber.replace(/\,/g, ''));
      await filterBar.addFilter('extension.keyword', 'is', 'jpg');
      expect(await filterBar.hasFilter('extension.keyword', 'jpg')).to.be(true);
      await retry.try(async () => {
        const hitCountNumber = await PageObjects.discover.getHitCount();
        const hitCount = parseInt(hitCountNumber.replace(/\,/g, ''));
        log.debug('### hit count = ' + hitCount);
        expect(hitCount).to.be.greaterThan(15000);
        expect(hitCount).to.be.lessThan(originalHitCount);
      });
    });

    describe('Detection engine', async function () {
      const supertest = getService('supertest');
      const esSupertest = getService('esSupertest');
      const config = getService('config');

      const esClient = new EsClient({
        ssl: {
          ca: fs.readFileSync(CA_CERT_PATH, 'utf-8'),
        },
        nodes: [process.env.TEST_ES_URLDATA],
        requestTimeout: config.get('timeouts.esRequestTimeout'),
      });

      const kbnClient = new KbnClient({
        log,
        url: process.env.TEST_KIBANA_URLDATA,
        certificateAuthorities: config.get('servers.kibana.certificateAuthorities'),
        uiSettingDefaults: kibanaServer.uiSettings,
      });

      const esArchiver = new EsArchiver({
        log,
        client: esClient,
        kbnClient,
      });

      let signalsId;
      let dataId;
      let ruleId;

      before('Prepare .siem-signal-*', async function () {
        log.info('Create index');
        // visit app/security so to create .siem-signals-* as side effect
        await PageObjects.common.navigateToApp('security', { insertTimestamp: false });

        log.info('Create index pattern');
        signalsId = await supertest
          .post('/api/index_patterns/index_pattern')
          .set('kbn-xsrf', 'true')
          .send({
            index_pattern: {
              title: '.siem-signals-*',
            },
            override: true,
          })
          .expect(200)
          .then((res) => JSON.parse(res.text).index_pattern.id);
        log.debug('id: ' + signalsId);
      });

      before('Prepare data:metricbeat-*', async function () {
        log.info('Create index');
        await esArchiver.load(ARCHIVE);

        log.info('Create index pattern');
        dataId = await supertest
          .post('/api/index_patterns/index_pattern')
          .set('kbn-xsrf', 'true')
          .send({
            index_pattern: {
              title: 'data:metricbeat-*',
            },
            override: true,
          })
          .expect(200)
          .then((res) => JSON.parse(res.text).index_pattern.id);
        log.debug('id: ' + dataId);
      });

      before('Add detection rule', async function () {
        ruleId = await supertest
          .post('/api/detection_engine/rules')
          .set('kbn-xsrf', 'true')
          .send({
            description: 'This is the description of the rule',
            risk_score: 17,
            severity: 'low',
            interval: '10s',
            name: 'CCS_Detection_test',
            type: 'query',
            from: 'now-1y',
            index: ['data:metricbeat-*'],
            query: '*:*',
            language: 'kuery',
            enabled: true,
          })
          .expect(200)
          .then((res) => JSON.parse(res.text).id);
        log.debug('id: ' + ruleId);
      });

      after('Clean up detection rule', async function () {
        if (ruleId !== undefined) {
          log.debug('id: ' + ruleId);
          await supertest
            .delete('/api/detection_engine/rules?id=' + ruleId)
            .set('kbn-xsrf', 'true')
            .expect(200);
        }
      });

      after('Clean up data:metricbeat-*', async function () {
        if (dataId !== undefined) {
          log.info('Delete index pattern');
          log.debug('id: ' + dataId);
          await supertest
            .delete('/api/index_patterns/index_pattern/' + dataId)
            .set('kbn-xsrf', 'true')
            .expect(200);
        }

        log.info('Delete index');
        await esArchiver.unload(ARCHIVE);
      });

      after('Clean up .siem-signal-*', async function () {
        if (signalsId !== undefined) {
          log.info('Delete index pattern: .siem-signals-*');
          log.debug('id: ' + signalsId);
          await supertest
            .delete('/api/index_patterns/index_pattern/' + signalsId)
            .set('kbn-xsrf', 'true')
            .expect(200);
        }

        log.info('Delete index alias: .siem-signals-default');
        await esSupertest
          .delete('/.siem-signals-default-000001/_alias/.siem-signals-default')
          .expect(200);

        log.info('Delete index: .siem-signals-default-000001');
        await esSupertest.delete('/.siem-signals-default-000001').expect(200);
      });

      it('Should generate alerts based on remote events', async function () {
        log.info('Check if any alert got to .siem-signals-*');
        await PageObjects.common.navigateToApp('discover', { insertTimestamp: false });
        await PageObjects.discover.selectIndexPattern('.siem-signals-*');
        await retry.tryForTime(30000, async () => {
          const hitCount = await PageObjects.discover.getHitCount();
          log.debug('### hit count = ' + hitCount);
          expect(hitCount).to.be('100');
        });
      });
    });
  });
};
