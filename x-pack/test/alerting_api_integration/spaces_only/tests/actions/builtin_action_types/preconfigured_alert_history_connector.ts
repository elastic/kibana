/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { AlertHistoryDefaultIndexName } from '@kbn/actions-plugin/common';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { getTestRuleData, ObjectRemover } from '../../../../common/lib';

const ALERT_HISTORY_OVERRIDE_INDEX = 'kibana-alert-history-not-the-default';

// eslint-disable-next-line import/no-default-export
export default function preconfiguredAlertHistoryConnectorTests({
  getService,
}: FtrProviderContext) {
  const es = getService('es');
  const supertest = getService('supertest');
  const retry = getService('retry');
  const esDeleteAllIndices = getService('esDeleteAllIndices');

  describe('preconfigured alert history connector', () => {
    const spaceId = 'default';
    const ruleTypeId = 'test.patternFiring';
    const alertId = 'instance';

    function getTestData(params = {}) {
      return getTestRuleData({
        rule_type_id: ruleTypeId,
        schedule: { interval: '1s' },
        params: {
          pattern: { [alertId]: new Array(100).fill(true) },
        },
        actions: [
          {
            group: 'default',
            id: 'preconfigured-alert-history-es-index',
            params,
          },
        ],
      });
    }

    const objectRemover = new ObjectRemover(supertest);
    beforeEach(() => {
      esDeleteAllIndices(AlertHistoryDefaultIndexName);
      esDeleteAllIndices(ALERT_HISTORY_OVERRIDE_INDEX);
    });
    after(() => objectRemover.removeAll());

    it('should index document with preconfigured schema', async () => {
      const testRuleData = getTestData({
        documents: [{}],
      });
      const response = await supertest
        .post(`/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(testRuleData);
      expect(response.status).to.eql(200);
      objectRemover.add(spaceId, response.body.id, 'rule', 'alerting');

      // Wait for alert to be active
      await waitForStatus(response.body.id, new Set(['active']));

      await retry.try(async () => {
        const result = await es.search<any>({
          index: AlertHistoryDefaultIndexName,
        });
        const indexedItems = result.hits.hits;
        expect(indexedItems.length).to.eql(1);

        const indexedDoc = indexedItems[0]._source;

        const timestampPattern = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/;
        expect(indexedDoc['@timestamp']).to.match(timestampPattern);
        expect(indexedDoc.tags).to.eql(testRuleData.tags);
        expect(indexedDoc.rule.name).to.eql(testRuleData.name);
        expect(indexedDoc.rule.params[ruleTypeId.replace('.', '__')]).to.eql(testRuleData.params);
        expect(indexedDoc.rule.space).to.eql(spaceId);
        expect(indexedDoc.rule.type).to.eql(ruleTypeId);
        expect(indexedDoc.kibana.alert.id).to.eql(alertId);
        expect(indexedDoc.kibana.alert.context[ruleTypeId.replace('.', '__')] != null).to.eql(true);
        expect(indexedDoc.kibana.alert.actionGroup).to.eql('default');
        expect(indexedDoc.kibana.alert.actionGroupName).to.eql('Default');
      });
    });

    it('should index document with preconfigured schema when indexOverride is defined', async () => {
      const testRuleData = getTestData({
        documents: [{}],
        indexOverride: ALERT_HISTORY_OVERRIDE_INDEX,
      });
      const response = await supertest
        .post(`/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(testRuleData);
      expect(response.status).to.eql(200);
      objectRemover.add(spaceId, response.body.id, 'rule', 'alerting');

      // Wait for alert to be active
      await waitForStatus(response.body.id, new Set(['active']));

      await retry.try(async () => {
        const result = await es.search<any>({
          index: ALERT_HISTORY_OVERRIDE_INDEX,
        });
        const indexedItems = result.hits.hits;
        expect(indexedItems.length).to.eql(1);

        const indexedDoc = indexedItems[0]._source;

        const timestampPattern = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/;
        expect(indexedDoc['@timestamp']).to.match(timestampPattern);
        expect(indexedDoc.tags).to.eql(testRuleData.tags);
        expect(indexedDoc.rule.name).to.eql(testRuleData.name);
        expect(indexedDoc.rule.params[ruleTypeId.replace('.', '__')]).to.eql(testRuleData.params);
        expect(indexedDoc.rule.space).to.eql(spaceId);
        expect(indexedDoc.rule.type).to.eql(ruleTypeId);
        expect(indexedDoc.kibana.alert.id).to.eql(alertId);
        expect(indexedDoc.kibana.alert.context[ruleTypeId.replace('.', '__')] != null).to.eql(true);
        expect(indexedDoc.kibana.alert.actionGroup).to.eql('default');
        expect(indexedDoc.kibana.alert.actionGroupName).to.eql('Default');
      });
    });
  });

  const WaitForStatusIncrement = 500;

  async function waitForStatus(
    id: string,
    statuses: Set<string>,
    waitMillis: number = 10000
  ): Promise<Record<string, any>> {
    if (waitMillis < 0) {
      expect().fail(`waiting for alert ${id} statuses ${Array.from(statuses)} timed out`);
    }

    const response = await supertest.get(`/api/alerts/alert/${id}`);
    expect(response.status).to.eql(200);

    const { executionStatus } = response.body || {};
    const { status } = executionStatus || {};

    const message = `waitForStatus(${Array.from(statuses)}): got ${JSON.stringify(
      executionStatus
    )}`;

    if (statuses.has(status)) {
      return executionStatus;
    }

    // eslint-disable-next-line no-console
    console.log(`${message}, retrying`);

    await delay(WaitForStatusIncrement);
    return await waitForStatus(id, statuses, waitMillis - WaitForStatusIncrement);
  }

  async function delay(millis: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, millis));
  }
}
