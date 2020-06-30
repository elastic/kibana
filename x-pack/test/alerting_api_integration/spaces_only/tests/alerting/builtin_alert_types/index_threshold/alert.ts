/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { Spaces } from '../../../../scenarios';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';
import {
  ESTestIndexTool,
  ES_TEST_INDEX_NAME,
  getUrlPrefix,
  ObjectRemover,
} from '../../../../../common/lib';
import { createEsDocuments } from './create_test_data';

const ALERT_TYPE_ID = '.index-threshold';
const ACTION_TYPE_ID = '.index';
const ES_TEST_INDEX_SOURCE = 'builtin-alert:index-threshold';
const ES_TEST_INDEX_REFERENCE = '-na-';
const ES_TEST_OUTPUT_INDEX_NAME = `${ES_TEST_INDEX_NAME}-output`;

const ALERT_INTERVALS_TO_WRITE = 5;
const ALERT_INTERVAL_SECONDS = 3;
const ALERT_INTERVAL_MILLIS = ALERT_INTERVAL_SECONDS * 1000;

// eslint-disable-next-line import/no-default-export
export default function alertTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const retry = getService('retry');
  const es = getService('legacyEs');
  const esTestIndexTool = new ESTestIndexTool(es, retry);
  const esTestIndexToolOutput = new ESTestIndexTool(es, retry, ES_TEST_OUTPUT_INDEX_NAME);

  describe('alert', async () => {
    let endDate: string;
    let actionId: string;
    const objectRemover = new ObjectRemover(supertest);

    beforeEach(async () => {
      await esTestIndexTool.destroy();
      await esTestIndexTool.setup();

      await esTestIndexToolOutput.destroy();
      await esTestIndexToolOutput.setup();

      actionId = await createAction(supertest, objectRemover);

      // write documents in the future, figure out the end date
      const endDateMillis = Date.now() + (ALERT_INTERVALS_TO_WRITE - 1) * ALERT_INTERVAL_MILLIS;
      endDate = new Date(endDateMillis).toISOString();

      // write documents from now to the future end date in 3 groups
      createEsDocumentsInGroups(3);
    });

    afterEach(async () => {
      await objectRemover.removeAll();
      await esTestIndexTool.destroy();
      await esTestIndexToolOutput.destroy();
    });

    // The tests below create two alerts, one that will fire, one that will
    // never fire; the tests ensure the ones that should fire, do fire, and
    // those that shouldn't fire, do not fire.
    it('runs correctly: count all < >', async () => {
      await createAlert({
        name: 'never fire',
        aggType: 'count',
        groupBy: 'all',
        thresholdComparator: '<',
        threshold: [0],
      });

      await createAlert({
        name: 'always fire',
        aggType: 'count',
        groupBy: 'all',
        thresholdComparator: '>',
        threshold: [-1],
      });

      const docs = await waitForDocs(2);
      for (const doc of docs) {
        const { group } = doc._source;
        const { name, value, title, message } = doc._source.params;

        expect(name).to.be('always fire');
        expect(group).to.be('all documents');

        // we'll check title and message in this test, but not subsequent ones
        expect(title).to.be('alert always fire group all documents exceeded threshold');

        const expectedPrefix = `alert always fire group all documents value ${value} exceeded threshold count > -1 over`;
        const messagePrefix = message.substr(0, expectedPrefix.length);
        expect(messagePrefix).to.be(expectedPrefix);
      }
    });

    it('runs correctly: count grouped <= =>', async () => {
      // create some more documents in the first group
      createEsDocumentsInGroups(1);

      await createAlert({
        name: 'never fire',
        aggType: 'count',
        groupBy: 'top',
        termField: 'group',
        termSize: 2,
        thresholdComparator: '<=',
        threshold: [-1],
      });

      await createAlert({
        name: 'always fire',
        aggType: 'count',
        groupBy: 'top',
        termField: 'group',
        termSize: 2, // two actions will fire each interval
        thresholdComparator: '>=',
        threshold: [0],
      });

      const docs = await waitForDocs(4);
      let inGroup0 = 0;

      for (const doc of docs) {
        const { group } = doc._source;
        const { name } = doc._source.params;

        expect(name).to.be('always fire');
        if (group === 'group-0') inGroup0++;
      }

      // there should be 2 docs in group-0, rando split between others
      // allow for some flakiness ...
      expect(inGroup0).to.be.greaterThan(0);
    });

    it('runs correctly: sum all between', async () => {
      // create some more documents in the first group
      createEsDocumentsInGroups(1);

      await createAlert({
        name: 'never fire',
        aggType: 'sum',
        aggField: 'testedValue',
        groupBy: 'all',
        thresholdComparator: 'between',
        threshold: [-2, -1],
      });

      await createAlert({
        name: 'always fire',
        aggType: 'sum',
        aggField: 'testedValue',
        groupBy: 'all',
        thresholdComparator: 'between',
        threshold: [0, 1000000],
      });

      const docs = await waitForDocs(2);
      for (const doc of docs) {
        const { name } = doc._source.params;

        expect(name).to.be('always fire');
      }
    });

    it('runs correctly: avg all', async () => {
      // create some more documents in the first group
      createEsDocumentsInGroups(1);

      // this never fires because of bad fields error
      await createAlert({
        name: 'never fire',
        timeField: 'source', // bad field for time
        aggType: 'avg',
        aggField: 'source', // bad field for agg
        groupBy: 'all',
        thresholdComparator: '>',
        threshold: [0],
      });

      await createAlert({
        name: 'always fire',
        aggType: 'avg',
        aggField: 'testedValue',
        groupBy: 'all',
        thresholdComparator: '>=',
        threshold: [0],
      });

      const docs = await waitForDocs(4);
      for (const doc of docs) {
        const { name } = doc._source.params;

        expect(name).to.be('always fire');
      }
    });

    it('runs correctly: max grouped', async () => {
      // create some more documents in the first group
      createEsDocumentsInGroups(1);

      await createAlert({
        name: 'never fire',
        aggType: 'max',
        aggField: 'testedValue',
        groupBy: 'top',
        termField: 'group',
        termSize: 2,
        thresholdComparator: '<',
        threshold: [0],
      });

      await createAlert({
        name: 'always fire',
        aggType: 'max',
        aggField: 'testedValue',
        groupBy: 'top',
        termField: 'group',
        termSize: 2, // two actions will fire each interval
        thresholdComparator: '>=',
        threshold: [0],
      });

      const docs = await waitForDocs(4);
      let inGroup2 = 0;

      for (const doc of docs) {
        const { group } = doc._source;
        const { name } = doc._source.params;

        expect(name).to.be('always fire');
        if (group === 'group-2') inGroup2++;
      }

      // there should be 2 docs in group-2, rando split between others
      // allow for some flakiness ...
      expect(inGroup2).to.be.greaterThan(0);
    });

    it('runs correctly: min grouped', async () => {
      // create some more documents in the first group
      createEsDocumentsInGroups(1);

      await createAlert({
        name: 'never fire',
        aggType: 'min',
        aggField: 'testedValue',
        groupBy: 'top',
        termField: 'group',
        termSize: 2,
        thresholdComparator: '<',
        threshold: [0],
      });

      await createAlert({
        name: 'always fire',
        aggType: 'min',
        aggField: 'testedValue',
        groupBy: 'top',
        termField: 'group',
        termSize: 2, // two actions will fire each interval
        thresholdComparator: '>=',
        threshold: [0],
      });

      const docs = await waitForDocs(4);
      let inGroup0 = 0;

      for (const doc of docs) {
        const { group } = doc._source;
        const { name } = doc._source.params;

        expect(name).to.be('always fire');
        if (group === 'group-0') inGroup0++;
      }

      // there should be 2 docs in group-0, rando split between others
      // allow for some flakiness ...
      expect(inGroup0).to.be.greaterThan(0);
    });

    async function createEsDocumentsInGroups(groups: number) {
      await createEsDocuments(
        es,
        esTestIndexTool,
        endDate,
        ALERT_INTERVALS_TO_WRITE,
        ALERT_INTERVAL_MILLIS,
        groups
      );
    }

    async function waitForDocs(count: number): Promise<any[]> {
      return await esTestIndexToolOutput.waitForDocs(
        ES_TEST_INDEX_SOURCE,
        ES_TEST_INDEX_REFERENCE,
        count
      );
    }

    interface CreateAlertParams {
      name: string;
      aggType: string;
      aggField?: string;
      timeField?: string;
      groupBy: 'all' | 'top';
      termField?: string;
      termSize?: number;
      thresholdComparator: string;
      threshold: number[];
    }

    async function createAlert(params: CreateAlertParams): Promise<string> {
      const action = {
        id: actionId,
        group: 'threshold met',
        params: {
          documents: [
            {
              source: ES_TEST_INDEX_SOURCE,
              reference: ES_TEST_INDEX_REFERENCE,
              params: {
                name: '{{{alertName}}}',
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

      const { status, body: createdAlert } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerts/alert`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: params.name,
          consumer: 'function test',
          enabled: true,
          alertTypeId: ALERT_TYPE_ID,
          schedule: { interval: `${ALERT_INTERVAL_SECONDS}s` },
          actions: [action],
          params: {
            index: ES_TEST_INDEX_NAME,
            timeField: params.timeField || 'date',
            aggType: params.aggType,
            aggField: params.aggField,
            groupBy: params.groupBy,
            termField: params.termField,
            termSize: params.termSize,
            timeWindowSize: ALERT_INTERVAL_SECONDS * 5,
            timeWindowUnit: 's',
            thresholdComparator: params.thresholdComparator,
            threshold: params.threshold,
          },
        });

      // will print the error body, if an error occurred
      // if (statusCode !== 200) console.log(createdAlert);

      expect(status).to.be(200);

      const alertId = createdAlert.id;
      objectRemover.add(Spaces.space1.id, alertId, 'alert', 'alerts');

      return alertId;
    }
  });
}

async function createAction(supertest: any, objectRemover: ObjectRemover): Promise<string> {
  const { statusCode, body: createdAction } = await supertest
    .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/action`)
    .set('kbn-xsrf', 'foo')
    .send({
      name: 'index action for index threshold FT',
      actionTypeId: ACTION_TYPE_ID,
      config: {
        index: ES_TEST_OUTPUT_INDEX_NAME,
      },
      secrets: {},
    });

  // will print the error body, if an error occurred
  // if (statusCode !== 200) console.log(createdAction);

  expect(statusCode).to.be(200);

  const actionId = createdAction.id;
  objectRemover.add(Spaces.space1.id, actionId, 'action', 'actions');

  return actionId;
}
