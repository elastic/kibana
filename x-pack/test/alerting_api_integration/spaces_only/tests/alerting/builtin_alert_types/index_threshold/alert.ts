/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { Spaces } from '../../../../scenarios';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';
import {
  ESTestIndexTool,
  ES_TEST_INDEX_NAME,
  getUrlPrefix,
  ObjectRemover,
  getEventLog,
} from '../../../../../common/lib';
import { createEsDocumentsWithGroups } from '../lib/create_test_data';
import { createDataStream, deleteDataStream } from '../lib/create_test_data';

const RULE_TYPE_ID = '.index-threshold';
const CONNECTOR_TYPE_ID = '.index';
const ES_TEST_INDEX_SOURCE = 'builtin-alert:index-threshold';
const ES_TEST_INDEX_REFERENCE = '-na-';
const ES_TEST_OUTPUT_INDEX_NAME = `${ES_TEST_INDEX_NAME}-output`;
const ES_TEST_DATA_STREAM_NAME = 'test-data-stream';

const RULE_INTERVALS_TO_WRITE = 5;
const RULE_INTERVAL_SECONDS = 3;
const RULE_INTERVAL_MILLIS = RULE_INTERVAL_SECONDS * 1000;

// eslint-disable-next-line import/no-default-export
export default function ruleTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const retry = getService('retry');
  const es = getService('es');
  const esTestIndexTool = new ESTestIndexTool(es, retry);
  const esTestIndexToolOutput = new ESTestIndexTool(es, retry, ES_TEST_OUTPUT_INDEX_NAME);

  describe('rule', async () => {
    let endDate: string;
    let connectorId: string;
    const objectRemover = new ObjectRemover(supertest);

    beforeEach(async () => {
      await esTestIndexTool.destroy();
      await esTestIndexTool.setup();

      await esTestIndexToolOutput.destroy();
      await esTestIndexToolOutput.setup();

      connectorId = await createConnector(supertest, objectRemover);

      // write documents in the future, figure out the end date
      const endDateMillis = Date.now() + (RULE_INTERVALS_TO_WRITE - 1) * RULE_INTERVAL_MILLIS;
      endDate = new Date(endDateMillis).toISOString();

      await createDataStream(es, ES_TEST_DATA_STREAM_NAME);
    });

    afterEach(async () => {
      await objectRemover.removeAll();
      await esTestIndexTool.destroy();
      await esTestIndexToolOutput.destroy();
      await deleteDataStream(es, ES_TEST_DATA_STREAM_NAME);
    });

    // The tests below create two alerts, one that will fire, one that will
    // never fire; the tests ensure the ones that should fire, do fire, and
    // those that shouldn't fire, do not fire.
    it('runs correctly: count all < >', async () => {
      // write documents from now to the future end date in 3 groups
      await createEsDocumentsInGroups(3);

      await createRule({
        name: 'never fire',
        aggType: 'count',
        groupBy: 'all',
        thresholdComparator: '<',
        threshold: [0],
      });

      await createRule({
        name: 'always fire',
        aggType: 'count',
        groupBy: 'all',
        thresholdComparator: '>',
        threshold: [-1],
      });

      const docs = await waitForDocs(2);
      for (const doc of docs) {
        const { group } = doc._source;
        const { name, title, message } = doc._source.params;

        expect(name).to.be('always fire');
        expect(group).to.be('all documents');

        // we'll check title and message in this test, but not subsequent ones
        expect(title).to.be('alert always fire group all documents met threshold');

        const messagePattern =
          /alert 'always fire' is active for group \'all documents\':\n\n- Value: \d+\n- Conditions Met: count is greater than -1 over 15s\n- Timestamp: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/;
        expect(message).to.match(messagePattern);
      }
    });

    it('runs correctly: count grouped <= =>', async () => {
      // write documents from now to the future end date in 3 groups
      await createEsDocumentsInGroups(3);

      await createRule({
        name: 'never fire',
        aggType: 'count',
        groupBy: 'top',
        termField: 'group',
        termSize: 2,
        thresholdComparator: '<=',
        threshold: [-1],
      });

      await createRule({
        name: 'always fire',
        aggType: 'count',
        groupBy: 'top',
        termField: 'group',
        termSize: 2, // two actions will fire each interval
        thresholdComparator: '>=',
        threshold: [0],
      });

      // create some more documents in the first group
      await createEsDocumentsInGroups(1);

      const docs = await waitForDocs(4);
      let inGroup0 = 0;

      for (const doc of docs) {
        const { group } = doc._source;
        const { name, message } = doc._source.params;

        expect(name).to.be('always fire');
        if (group === 'group-0') inGroup0++;

        const messagePattern =
          /alert 'always fire' is active for group \'group-\d\':\n\n- Value: \d+\n- Conditions Met: count is greater than or equal to 0 over 15s\n- Timestamp: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/;
        expect(message).to.match(messagePattern);
      }

      // there should be 2 docs in group-0, rando split between others
      // allow for some flakiness ...
      expect(inGroup0).to.be.greaterThan(0);
    });

    it('runs correctly: sum all between', async () => {
      // write documents from now to the future end date in 3 groups
      await createEsDocumentsInGroups(3);

      await createRule({
        name: 'never fire',
        aggType: 'sum',
        aggField: 'testedValue',
        groupBy: 'all',
        thresholdComparator: 'between',
        threshold: [-2, -1],
      });

      await createRule({
        name: 'always fire',
        aggType: 'sum',
        aggField: 'testedValue',
        groupBy: 'all',
        thresholdComparator: 'between',
        threshold: [0, 1000000],
      });

      // create some more documents in the first group
      await createEsDocumentsInGroups(1);

      const docs = await waitForDocs(2);
      for (const doc of docs) {
        const { name, message } = doc._source.params;

        expect(name).to.be('always fire');

        const messagePattern =
          /alert 'always fire' is active for group \'all documents\':\n\n- Value: \d+\n- Conditions Met: sum\(testedValue\) is between 0 and 1000000 over 15s\n- Timestamp: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/;
        expect(message).to.match(messagePattern);
      }
    });

    it('runs correctly: avg all', async () => {
      // write documents from now to the future end date in 3 groups
      await createEsDocumentsInGroups(3);

      await createRule({
        name: 'never fire',
        aggType: 'avg',
        aggField: 'testedValue',
        groupBy: 'all',
        thresholdComparator: '<',
        threshold: [0],
      });

      await createRule({
        name: 'always fire',
        aggType: 'avg',
        aggField: 'testedValue',
        groupBy: 'all',
        timeWindowSize: RULE_INTERVAL_SECONDS * 10,
        thresholdComparator: '>=',
        threshold: [0],
      });

      // create some more documents in the first group
      await createEsDocumentsInGroups(1);

      const docs = await waitForDocs(4);
      for (const doc of docs) {
        const { name, message } = doc._source.params;

        expect(name).to.be('always fire');

        const messagePattern =
          /alert 'always fire' is active for group \'all documents\':\n\n- Value: .*\n- Conditions Met: avg\(testedValue\) is greater than or equal to 0 over 30s\n- Timestamp: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/;
        expect(message).to.match(messagePattern);
      }
    });

    it('runs correctly: max grouped', async () => {
      // write documents from now to the future end date in 3 groups
      await createEsDocumentsInGroups(3);

      await createRule({
        name: 'never fire',
        aggType: 'max',
        aggField: 'testedValue',
        groupBy: 'top',
        termField: 'group',
        termSize: 2,
        thresholdComparator: '<',
        threshold: [0],
      });

      await createRule({
        name: 'always fire',
        aggType: 'max',
        aggField: 'testedValue',
        groupBy: 'top',
        termField: 'group',
        termSize: 2, // two actions will fire each interval
        thresholdComparator: '>=',
        threshold: [0],
      });

      // create some more documents in the first group
      await createEsDocumentsInGroups(1);

      const docs = await waitForDocs(4);
      let inGroup2 = 0;

      for (const doc of docs) {
        const { group } = doc._source;
        const { name, message } = doc._source.params;

        expect(name).to.be('always fire');
        if (group === 'group-2') inGroup2++;

        const messagePattern =
          /alert 'always fire' is active for group \'group-\d\':\n\n- Value: \d+\n- Conditions Met: max\(testedValue\) is greater than or equal to 0 over 15s\n- Timestamp: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/;
        expect(message).to.match(messagePattern);
      }

      // there should be 2 docs in group-2, rando split between others
      // allow for some flakiness ...
      expect(inGroup2).to.be.greaterThan(0);
    });

    it('runs correctly: max grouped on float', async () => {
      // write documents from now to the future end date in 3 groups
      await createEsDocumentsInGroups(3);
      await createRule({
        name: 'never fire',
        aggType: 'max',
        aggField: 'testedValueFloat',
        groupBy: 'top',
        termField: 'group',
        termSize: 2,
        thresholdComparator: '<',
        threshold: [3.235423],
      });

      await createRule({
        name: 'always fire',
        aggType: 'max',
        aggField: 'testedValueFloat',
        groupBy: 'top',
        termField: 'group',
        termSize: 2, // two actions will fire each interval
        thresholdComparator: '>=',
        threshold: [200.2354364],
      });

      // create some more documents in the first group
      await createEsDocumentsInGroups(1);

      const docs = await waitForDocs(4);

      for (const doc of docs) {
        const { name, message } = doc._source.params;

        expect(name).to.be('always fire');

        const messagePattern =
          /alert 'always fire' is active for group \'group-\d\':\n\n- Value: 234.2534637451172\n- Conditions Met: max\(testedValueFloat\) is greater than or equal to 200.2354364 over 15s\n- Timestamp: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/;
        expect(message).to.match(messagePattern);
      }
    });

    it('runs correctly: max grouped on unsigned long', async () => {
      // write documents from now to the future end date in 3 groups
      await createEsDocumentsInGroups(3);

      await createRule({
        name: 'never fire',
        aggType: 'max',
        aggField: 'testedValueUnsigned',
        groupBy: 'top',
        termField: 'group',
        termSize: 2,
        thresholdComparator: '<',
        threshold: [Number.MAX_SAFE_INTEGER],
      });

      await createRule({
        name: 'always fire',
        aggType: 'max',
        aggField: 'testedValueUnsigned',
        groupBy: 'top',
        termField: 'group',
        termSize: 2, // two actions will fire each interval
        thresholdComparator: '>=',
        threshold: [Number.MAX_SAFE_INTEGER],
      });

      // create some more documents in the first group
      await createEsDocumentsInGroups(1);

      const docs = await waitForDocs(4);

      for (const doc of docs) {
        const { name, message } = doc._source.params;

        expect(name).to.be('always fire');

        const messagePattern =
          /alert 'always fire' is active for group \'group-\d\':\n\n- Value: \d+\n- Conditions Met: max\(testedValueUnsigned\) is greater than or equal to \d+ over 15s\n- Timestamp: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/;
        expect(message).to.match(messagePattern);
      }
    });

    it('runs correctly: min grouped', async () => {
      // write documents from now to the future end date in 3 groups
      await createEsDocumentsInGroups(3);

      await createRule({
        name: 'never fire',
        aggType: 'min',
        aggField: 'testedValue',
        groupBy: 'top',
        termField: 'group',
        termSize: 2,
        thresholdComparator: '<',
        threshold: [0],
      });

      await createRule({
        name: 'always fire',
        aggType: 'min',
        aggField: 'testedValue',
        groupBy: 'top',
        termField: 'group',
        termSize: 2, // two actions will fire each interval
        thresholdComparator: '>=',
        threshold: [0],
      });

      // create some more documents in the first group
      await createEsDocumentsInGroups(1);

      const docs = await waitForDocs(4);
      let inGroup0 = 0;

      for (const doc of docs) {
        const { group } = doc._source;
        const { name, message } = doc._source.params;

        expect(name).to.be('always fire');
        if (group === 'group-0') inGroup0++;

        const messagePattern =
          /alert 'always fire' is active for group \'group-\d\':\n\n- Value: \d+\n- Conditions Met: min\(testedValue\) is greater than or equal to 0 over 15s\n- Timestamp: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/;
        expect(message).to.match(messagePattern);
      }

      // there should be 2 docs in group-0, rando split between others
      // allow for some flakiness ...
      expect(inGroup0).to.be.greaterThan(0);
    });

    it('runs correctly and populates recovery context', async () => {
      // write documents from now to the future end date in 3 groups
      await createEsDocumentsInGroups(3);

      // This rule should be active initially when the number of documents is below the threshold
      // and then recover when we add more documents.
      await createRule({
        name: 'fire then recovers',
        aggType: 'count',
        groupBy: 'all',
        thresholdComparator: '<',
        threshold: [10],
        notifyWhen: 'onActionGroupChange',
      });

      await waitForDocs(1);

      await createEsDocumentsInGroups(1);

      const docs = await waitForDocs(2);
      const activeDoc = docs[0];
      const { group: activeGroup } = activeDoc._source;
      const {
        name: activeName,
        title: activeTitle,
        message: activeMessage,
      } = activeDoc._source.params;

      expect(activeName).to.be('fire then recovers');
      expect(activeGroup).to.be('all documents');
      expect(activeTitle).to.be('alert fire then recovers group all documents met threshold');
      expect(activeMessage).to.match(
        /alert 'fire then recovers' is active for group \'all documents\':\n\n- Value: \d+\n- Conditions Met: count is less than 10 over 15s\n- Timestamp: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/
      );

      const recoveredDoc = docs[1];
      const { group: recoveredGroup } = recoveredDoc._source;
      const {
        name: recoveredName,
        title: recoveredTitle,
        message: recoveredMessage,
      } = recoveredDoc._source.params;

      expect(recoveredName).to.be('fire then recovers');
      expect(recoveredGroup).to.be('all documents');
      expect(recoveredTitle).to.be('alert fire then recovers group all documents recovered');
      expect(recoveredMessage).to.match(
        /alert 'fire then recovers' is recovered for group \'all documents\':\n\n- Value: \d+\n- Conditions Met: count is NOT less than 10 over 15s\n- Timestamp: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/
      );
    });

    it('runs correctly over a data stream: count all < >', async () => {
      // write documents from now to the future end date in 3 groups
      await createEsDocumentsInGroups(3);

      await createRule({
        name: 'never fire',
        aggType: 'count',
        groupBy: 'all',
        thresholdComparator: '<',
        threshold: [0],
        indexName: ES_TEST_DATA_STREAM_NAME,
        timeField: '@timestamp',
      });

      await createRule({
        name: 'always fire',
        aggType: 'count',
        groupBy: 'all',
        thresholdComparator: '>',
        threshold: [0],
        indexName: ES_TEST_DATA_STREAM_NAME,
        timeField: '@timestamp',
      });

      await createEsDocumentsInGroups(1, ES_TEST_DATA_STREAM_NAME);

      const docs = await waitForDocs(2);
      for (const doc of docs) {
        const { group } = doc._source;
        const { name, title, message } = doc._source.params;

        expect(name).to.be('always fire');
        expect(group).to.be('all documents');

        // we'll check title and message in this test, but not subsequent ones
        expect(title).to.be('alert always fire group all documents met threshold');

        const messagePattern =
          /alert 'always fire' is active for group \'all documents\':\n\n- Value: \d+\n- Conditions Met: count is greater than 0 over 15s\n- Timestamp: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/;
        expect(message).to.match(messagePattern);
      }
    });

    it('runs correctly: filters by Kuery', async () => {
      // add documents that have timestamp as "now"
      await createEsDocumentsWithGroups({
        es,
        esTestIndexTool,
        endDate: new Date().toISOString(),
        intervals: 5,
        intervalMillis: 5000,
        groups: 3,
        indexName: ES_TEST_INDEX_NAME,
      });

      await createRule({
        name: 'always fire',
        aggType: 'count',
        groupBy: 'all',
        thresholdComparator: '>',
        timeWindowSize: 3000,
        threshold: [-1],
        filterKuery: 'group: group-0',
      });

      const docs = await waitForDocs(1);
      const doc = docs[0];
      const { message } = doc._source.params;

      expect(message).to.contain('Value: 5');
    });

    it('runs and gracefully handles ES errors', async () => {
      // write documents from now to the future end date in 3 groups
      await createEsDocumentsInGroups(3);

      // this never fires because of bad fields error
      const ruleId = await createRule({
        name: 'never fire',
        timeField: 'source', // bad field for time
        aggType: 'avg',
        aggField: 'source', // bad field for agg
        groupBy: 'all',
        thresholdComparator: '>',
        threshold: [0],
      });

      // create some more documents in the first group
      await createEsDocumentsInGroups(1);

      // get the events we're expecting
      const events = await retry.try(async () => {
        return await getEventLog({
          getService,
          spaceId: Spaces.space1.id,
          type: 'alert',
          id: ruleId,
          provider: 'alerting',
          actions: new Map([['execute', { gte: 2 }]]),
        });
      });

      for (const event of events) {
        expect(event?.rule?.name).to.eql('never fire');
        expect(event?.kibana?.alerting?.outcome).to.eql('success');
        expect(event?.message).to.eql(`rule executed: .index-threshold:${ruleId}: 'never fire'`);
      }
    });

    async function createEsDocumentsInGroups(
      groups: number,
      indexName: string = ES_TEST_INDEX_NAME
    ) {
      await createEsDocumentsWithGroups({
        es,
        esTestIndexTool,
        endDate,
        intervals: RULE_INTERVALS_TO_WRITE,
        intervalMillis: RULE_INTERVAL_MILLIS,
        groups,
        indexName,
      });
    }

    async function waitForDocs(count: number): Promise<any[]> {
      return await esTestIndexToolOutput.waitForDocs(
        ES_TEST_INDEX_SOURCE,
        ES_TEST_INDEX_REFERENCE,
        count
      );
    }

    interface CreateRuleParams {
      name: string;
      aggType: string;
      aggField?: string;
      timeField?: string;
      timeWindowSize?: number;
      groupBy: 'all' | 'top';
      termField?: string;
      termSize?: number;
      thresholdComparator: string;
      threshold: number[];
      notifyWhen?: string;
      indexName?: string;
      filterKuery?: string;
    }

    async function createRule(params: CreateRuleParams): Promise<string> {
      const action = {
        id: connectorId,
        group: 'threshold met',
        params: {
          documents: [
            {
              source: ES_TEST_INDEX_SOURCE,
              reference: ES_TEST_INDEX_REFERENCE,
              params: {
                name: '{{{rule.name}}}',
                value: '{{{context.value}}}',
                title: '{{{context.title}}}',
                message: '{{{context.message}}}',
              },
              date: '{{{context.date}}}',
              // TODO: I wanted to write the alert value here, but how?
              // We only mustache interpolate string values ...
              // testedValue: '{{{context.value}}}',
              group: '{{{context.group}}}',
            },
          ],
        },
      };

      const recoveryAction = {
        id: connectorId,
        group: 'recovered',
        params: {
          documents: [
            {
              source: ES_TEST_INDEX_SOURCE,
              reference: ES_TEST_INDEX_REFERENCE,
              params: {
                name: '{{{rule.name}}}',
                value: '{{{context.value}}}',
                title: '{{{context.title}}}',
                message: '{{{context.message}}}',
              },
              date: '{{{context.date}}}',
              group: '{{{context.group}}}',
            },
          ],
        },
      };

      const { status, body: createdRule } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: params.name,
          consumer: 'alerts',
          enabled: true,
          rule_type_id: RULE_TYPE_ID,
          schedule: { interval: `${RULE_INTERVAL_SECONDS}s` },
          actions: [action, recoveryAction],
          notify_when: params.notifyWhen || 'onActiveAlert',
          params: {
            index: params.indexName || ES_TEST_INDEX_NAME,
            timeField: params.timeField || 'date',
            aggType: params.aggType,
            aggField: params.aggField,
            groupBy: params.groupBy,
            termField: params.termField,
            termSize: params.termSize,
            timeWindowSize: params.timeWindowSize ?? RULE_INTERVAL_SECONDS * 5,
            timeWindowUnit: 's',
            thresholdComparator: params.thresholdComparator,
            threshold: params.threshold,
            filterKuery: params.filterKuery,
          },
        });

      // will print the error body, if an error occurred
      // if (statusCode !== 200) console.log(createdRule);

      expect(status).to.be(200);

      const ruleId = createdRule.id;
      objectRemover.add(Spaces.space1.id, ruleId, 'rule', 'alerting');

      return ruleId;
    }
  });
}

async function createConnector(supertest: any, objectRemover: ObjectRemover): Promise<string> {
  const { statusCode, body: createdConnector } = await supertest
    .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector`)
    .set('kbn-xsrf', 'foo')
    .send({
      name: 'index connector for index threshold FT',
      connector_type_id: CONNECTOR_TYPE_ID,
      config: {
        index: ES_TEST_OUTPUT_INDEX_NAME,
      },
      secrets: {},
    });

  // will print the error body, if an error occurred
  // if (statusCode !== 200) console.log(createdConnector);

  expect(statusCode).to.be(200);

  const connectorId = createdConnector.id;
  objectRemover.add(Spaces.space1.id, connectorId, 'connector', 'actions');

  return connectorId;
}
