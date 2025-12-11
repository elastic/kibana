/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../../ftr_provider_context';

export default ({ getService, getPageObjects }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const observability = getService('observability');
  const supertest = getService('supertest');
  const PageObjects = getPageObjects(['common', 'header']);
  const es = getService('es');
  const log = getService('log');
  const toasts = getService('toasts');

  describe('Mute and Unmute alerts', function () {
    this.tags('includeFirefox');

    const TEST_INDEX = 'mute-test-data';
    let ruleId: string;

    before(async () => {
      // Create test index with documents that will trigger grouped alerts
      await es.transport.request({
        method: 'PUT',
        path: `/${TEST_INDEX}`,
        body: {
          mappings: {
            properties: {
              '@timestamp': { type: 'date' },
              host: { type: 'keyword' },
              message: { type: 'text' },
            },
          },
        },
      });

      // Insert test documents with different host values to create multiple alert instances
      const now = new Date().toISOString();
      await es.bulk({
        refresh: 'wait_for',
        operations: [
          { index: { _index: TEST_INDEX } },
          { '@timestamp': now, host: 'host-a', message: 'test message 1' },
          { index: { _index: TEST_INDEX } },
          { '@timestamp': now, host: 'host-b', message: 'test message 2' },
          { index: { _index: TEST_INDEX } },
          { '@timestamp': now, host: 'host-a', message: 'test message 3' },
          { index: { _index: TEST_INDEX } },
          { '@timestamp': now, host: 'host-b', message: 'test message 4' },
        ],
      });

      // Create ES Query rule with groupBy to generate multiple alert instances
      const { body: createdRule } = await supertest
        .post('/api/alerting/rule')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'Mute test rule',
          consumer: 'logs',
          rule_type_id: '.es-query',
          schedule: { interval: '1m' },
          params: {
            size: 100,
            thresholdComparator: '>',
            threshold: [0],
            index: [TEST_INDEX],
            timeField: '@timestamp',
            esQuery: JSON.stringify({ query: { match_all: {} } }),
            timeWindowSize: 5,
            timeWindowUnit: 'm',
            groupBy: 'top',
            termSize: 10,
            termField: 'host',
          },
          actions: [],
        })
        .expect(200);

      ruleId = createdRule.id;
      log.info(`Created rule with ID: ${ruleId}`);

      // Wait for rule to execute successfully (status is 'active' when alerts are firing)
      await retry.waitForWithTimeout('rule to execute', 120000, async () => {
        const { body: rule } = await supertest
          .get(`/api/alerting/rule/${ruleId}`)
          .set('kbn-xsrf', 'foo')
          .expect(200);
        log.info(`Rule execution status: ${rule.execution_status?.status}`);
        return rule.execution_status?.status === 'active' || rule.execution_status?.status === 'ok';
      });

      // Wait for alerts to be created
      await retry.waitForWithTimeout('alerts to be created', 120000, async () => {
        const response = await es.search({
          index: '.alerts-stack.alerts-default',
          query: {
            bool: {
              must: [
                { term: { 'kibana.alert.rule.uuid': ruleId } },
                { term: { 'kibana.alert.status': 'active' } },
              ],
            },
          },
        });
        const count = (response.hits.total as { value: number }).value;
        log.info(`Found ${count} active alerts`);
        return count >= 2;
      });

      // Navigate to alerts page
      await observability.alerts.common.navigateWithoutFilter();
      await observability.alerts.common.waitForAlertTableToLoad();
    });

    after(async () => {
      if (ruleId) {
        await supertest
          .delete(`/api/alerting/rule/${ruleId}`)
          .set('kbn-xsrf', 'foo')
          .ok((res) => res.status === 200 || res.status === 204 || res.status === 404);
      }
      await es.indices.delete({ index: TEST_INDEX, ignore_unavailable: true });
    });

    describe('Bulk mute and unmute', () => {
      let totalAlerts: number;

      before(async () => {
        await observability.alerts.common.clearQueryBar();
        await observability.alerts.common.submitQuery(`kibana.alert.rule.uuid: "${ruleId}"`);
        await observability.alerts.common.waitForAlertTableToLoad();
      });

      it('should have at least 2 alerts available for bulk operations', async () => {
        await retry.try(async () => {
          const rows = await observability.alerts.common.getTableCellsInRows();
          totalAlerts = rows.length;
          log.info(`Found ${totalAlerts} alerts for bulk operations`);
          expect(totalAlerts).to.be.greaterThan(1);
        });
      });

      it('should show bulk actions menu after selecting alerts', async () => {
        await testSubjects.click('bulk-actions-header');
        await retry.try(async () => {
          expect(await testSubjects.exists('selectedShowBulkActionsButton')).to.be(true);
        });
      });

      it('should bulk mute all selected alerts and show success toast', async () => {
        await testSubjects.click('selectedShowBulkActionsButton');
        await retry.waitFor('bulk actions menu visible', () => testSubjects.exists('bulk-mute'));
        await testSubjects.click('bulk-mute');
        await PageObjects.header.waitUntilLoadingHasFinished();

        const toastTitle = await toasts.getTitleAndDismiss();
        log.info(`Toast after mute: "${toastTitle}"`);
        expect(toastTitle).to.contain('Muted');
        expect(toastTitle).to.contain('alert instance');
        expect(toastTitle).to.contain('rule');
      });

      it('should show all alerts as muted after bulk mute', async () => {
        // Wait for any toasts to clear and page to stabilize
        await PageObjects.header.waitUntilLoadingHasFinished();

        await retry.try(async () => {
          await observability.alerts.common.clearQueryBar();
          await observability.alerts.common.submitQuery(
            `kibana.alert.rule.uuid: "${ruleId}" AND kibana.alert.muted: true`
          );
        });
        await observability.alerts.common.waitForAlertTableToLoad();

        await retry.try(async () => {
          const rows = await observability.alerts.common.getTableCellsInRows();
          log.info(`Found ${rows.length} muted alerts (expected ${totalAlerts})`);
          expect(rows.length).to.be(totalAlerts);
        });
      });

      it('should show no unmuted alerts after bulk mute', async () => {
        await PageObjects.header.waitUntilLoadingHasFinished();

        await retry.try(async () => {
          await observability.alerts.common.clearQueryBar();
          await observability.alerts.common.submitQuery(
            `kibana.alert.rule.uuid: "${ruleId}" AND kibana.alert.muted: false`
          );
        });
        await observability.alerts.common.waitForAlertTableToLoad();
        await observability.alerts.common.getNoDataStateOrFail();
      });

      it('should bulk unmute all selected alerts and show success toast', async () => {
        await PageObjects.header.waitUntilLoadingHasFinished();

        await retry.try(async () => {
          await observability.alerts.common.clearQueryBar();
          await observability.alerts.common.submitQuery(`kibana.alert.rule.uuid: "${ruleId}"`);
        });
        await observability.alerts.common.waitForAlertTableToLoad();

        await testSubjects.click('bulk-actions-header');
        await testSubjects.click('selectedShowBulkActionsButton');
        await retry.waitFor('bulk actions menu visible', () => testSubjects.exists('bulk-unmute'));
        await testSubjects.click('bulk-unmute');
        await PageObjects.header.waitUntilLoadingHasFinished();

        const toastTitle = await toasts.getTitleAndDismiss();
        log.info(`Toast after unmute: "${toastTitle}"`);
        expect(toastTitle).to.contain('Unmuted');
        expect(toastTitle).to.contain('alert instance');
        expect(toastTitle).to.contain('rule');
      });

      it('should show all alerts as unmuted after bulk unmute', async () => {
        await PageObjects.header.waitUntilLoadingHasFinished();

        await retry.try(async () => {
          await observability.alerts.common.clearQueryBar();
          await observability.alerts.common.submitQuery(
            `kibana.alert.rule.uuid: "${ruleId}" AND kibana.alert.muted: false`
          );
        });
        await observability.alerts.common.waitForAlertTableToLoad();

        await retry.try(async () => {
          const rows = await observability.alerts.common.getTableCellsInRows();
          log.info(`Found ${rows.length} unmuted alerts (expected ${totalAlerts})`);
          expect(rows.length).to.be(totalAlerts);
        });
      });

      it('should show no muted alerts after bulk unmute', async () => {
        await PageObjects.header.waitUntilLoadingHasFinished();

        await retry.try(async () => {
          await observability.alerts.common.clearQueryBar();
          await observability.alerts.common.submitQuery(
            `kibana.alert.rule.uuid: "${ruleId}" AND kibana.alert.muted: true`
          );
        });
        await observability.alerts.common.waitForAlertTableToLoad();
        await observability.alerts.common.getNoDataStateOrFail();
      });
    });
  });
};
