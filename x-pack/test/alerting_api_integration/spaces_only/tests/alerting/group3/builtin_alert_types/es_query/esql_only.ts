/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ALERT_REASON, ALERT_URL } from '@kbn/rule-data-utils';
import { Spaces } from '../../../../../scenarios';
import { FtrProviderContext } from '../../../../../../common/ftr_provider_context';
import { getUrlPrefix, ObjectRemover } from '../../../../../../common/lib';
import {
  createConnector,
  ES_GROUPS_TO_WRITE,
  ES_TEST_DATA_STREAM_NAME,
  ES_TEST_INDEX_REFERENCE,
  ES_TEST_INDEX_SOURCE,
  ES_TEST_OUTPUT_INDEX_NAME,
  getRuleServices,
  RULE_INTERVALS_TO_WRITE,
  RULE_INTERVAL_MILLIS,
  RULE_INTERVAL_SECONDS,
  RULE_TYPE_ID,
} from './common';
import { createDataStream, deleteDataStream } from '../../../create_test_data';

// eslint-disable-next-line import/no-default-export
export default function ruleTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const {
    es,
    esTestIndexTool,
    esTestIndexToolOutput,
    esTestIndexToolDataStream,
    createEsDocumentsInGroups,
    removeAllAADDocs,
    getAllAADDocs,
  } = getRuleServices(getService);

  describe('rule', () => {
    let endDate: string;
    let connectorId: string;
    const objectRemover = new ObjectRemover(supertest);

    beforeEach(async () => {
      await esTestIndexTool.destroy();
      await esTestIndexTool.setup();

      await esTestIndexToolOutput.destroy();
      await esTestIndexToolOutput.setup();

      connectorId = await createConnector(supertest, objectRemover, ES_TEST_OUTPUT_INDEX_NAME);

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
      await removeAllAADDocs();
    });

    it('runs correctly: threshold on ungrouped hit count < >', async () => {
      // write documents from now to the future end date in groups
      await createEsDocumentsInGroups(ES_GROUPS_TO_WRITE, endDate);
      await createRule({
        name: 'never fire',
        esqlQuery:
          'from .kibana-alerting-test-data | stats c = count(date) by host.hostname, host.name, host.id | where c < 0',
      });
      await createRule({
        name: 'always fire',
        esqlQuery:
          'from .kibana-alerting-test-data | stats c = count(date) by host.hostname, host.name, host.id | where c > -1',
      });

      const docs = await waitForDocs(2);
      const messagePattern = /Document count is \d+ in the last 30s. Alert when greater than 0./;

      for (let i = 0; i < docs.length; i++) {
        const doc = docs[i];
        const { hits } = doc._source;
        const { name, title, message } = doc._source.params;

        expect(name).to.be('always fire');
        expect(title).to.be(`rule 'always fire' matched query`);
        expect(message).to.match(messagePattern);
        expect(hits).not.to.be.empty();
      }

      const aadDocs = await getAllAADDocs(1);

      const alertDoc = aadDocs.body.hits.hits[0]._source;
      expect(alertDoc[ALERT_REASON]).to.match(messagePattern);
      expect(alertDoc['kibana.alert.title']).to.be("rule 'always fire' matched query");
      expect(alertDoc['kibana.alert.evaluation.conditions']).to.be('Query matched documents');
      expect(alertDoc['kibana.alert.evaluation.threshold']).to.eql(0);
      const value = parseInt(alertDoc['kibana.alert.evaluation.value'], 10);
      expect(value).greaterThan(0);
      expect(alertDoc[ALERT_URL]).to.contain('/s/space1/app/');
      expect(alertDoc['host.name']).to.eql(['host-1']);
      expect(alertDoc['host.hostname']).to.eql(['host-1']);
      expect(alertDoc['host.id']).to.eql(['1']);
    });

    it('runs correctly: use epoch millis - threshold on hit count < >', async () => {
      // write documents from now to the future end date in groups
      const endDateMillis = Date.now() + (RULE_INTERVALS_TO_WRITE - 1) * RULE_INTERVAL_MILLIS;
      endDate = new Date(endDateMillis).toISOString();
      await createEsDocumentsInGroups(ES_GROUPS_TO_WRITE, endDate);
      await createRule({
        name: 'never fire',
        esqlQuery: 'from .kibana-alerting-test-data | stats c = count(date) | where c < 0',

        timeField: 'date_epoch_millis',
      });
      await createRule({
        name: 'always fire',
        esqlQuery: 'from .kibana-alerting-test-data | stats c = count(date) | where c > -1',

        timeField: 'date_epoch_millis',
      });

      const docs = await waitForDocs(2);
      for (let i = 0; i < docs.length; i++) {
        const doc = docs[i];
        const { hits } = doc._source;
        const { name, title, message } = doc._source.params;

        expect(name).to.be('always fire');
        expect(title).to.be(`rule 'always fire' matched query`);
        const messagePattern = /Document count is \d+ in the last 30s. Alert when greater than 0./;
        expect(message).to.match(messagePattern);
        expect(hits).not.to.be.empty();
      }
    });

    it('runs correctly: no matches', async () => {
      await createRule({
        name: 'always fire',
        esqlQuery: 'from .kibana-alerting-test-data | stats c = count(date) | where c < 1',
      });

      const docs = await waitForDocs(1);
      for (let i = 0; i < docs.length; i++) {
        const doc = docs[i];
        const { hits } = doc._source;
        const { name, title, message } = doc._source.params;

        expect(name).to.be('always fire');
        expect(title).to.be(`rule 'always fire' matched query`);
        const messagePattern = /Document count is \d+ in the last 30s. Alert when greater than 0./;
        expect(message).to.match(messagePattern);
        expect(hits).not.to.be.empty();
      }
    });

    it('runs correctly and populates recovery context', async () => {
      // This rule should be active initially when the number of documents is below the threshold
      // and then recover when we add more documents.
      await createRule({
        name: 'fire then recovers',
        esqlQuery: 'from .kibana-alerting-test-data | stats c = count(date) | where c < 1',

        notifyWhen: 'onActionGroupChange',
        timeWindowSize: RULE_INTERVAL_SECONDS,
      });

      let docs = await waitForDocs(1);
      const activeDoc = docs[0];
      const {
        name: activeName,
        title: activeTitle,
        value: activeValue,
        message: activeMessage,
      } = activeDoc._source.params;

      expect(activeName).to.be('fire then recovers');
      expect(activeTitle).to.be(`rule 'fire then recovers' matched query`);
      expect(activeValue).to.be('1');
      expect(activeMessage).to.match(
        /Document count is \d+ in the last 4s. Alert when greater than 0./
      );
      await createEsDocumentsInGroups(1, endDate);
      docs = await waitForDocs(2);
      const recoveredDoc = docs[1];
      const {
        name: recoveredName,
        title: recoveredTitle,
        message: recoveredMessage,
      } = recoveredDoc._source.params;

      expect(recoveredName).to.be('fire then recovers');
      expect(recoveredTitle).to.be(`rule 'fire then recovers' recovered`);
      expect(recoveredMessage).to.match(
        /Document count is \d+ in the last 4s. Alert when greater than 0./
      );
    });

    it('runs correctly over a data stream: threshold on hit count < >', async () => {
      // write documents from now to the future end date in groups
      await createEsDocumentsInGroups(
        ES_GROUPS_TO_WRITE,
        endDate,
        esTestIndexToolDataStream,
        ES_TEST_DATA_STREAM_NAME
      );
      await createRule({
        name: 'never fire',
        esqlQuery:
          'from test-data-stream | stats c = count(@timestamp) by host.hostname, host.name, host.id | where c < 0',
      });
      await createRule({
        name: 'always fire',
        esqlQuery:
          'from test-data-stream | stats c = count(@timestamp) by host.hostname, host.name, host.id | where c > -1',
      });

      const messagePattern = /Document count is \d+ in the last 30s. Alert when greater than 0./;

      const docs = await waitForDocs(2);
      for (let i = 0; i < docs.length; i++) {
        const doc = docs[i];
        const { hits } = doc._source;
        const { name, title, message } = doc._source.params;

        expect(name).to.be('always fire');
        expect(title).to.be(`rule 'always fire' matched query`);
        expect(message).to.match(messagePattern);
        expect(hits).not.to.be.empty();
      }

      const aadDocs = await getAllAADDocs(1);

      const alertDoc = aadDocs.body.hits.hits[0]._source;
      expect(alertDoc[ALERT_REASON]).to.match(messagePattern);
      expect(alertDoc['kibana.alert.title']).to.be("rule 'always fire' matched query");
      expect(alertDoc['kibana.alert.evaluation.conditions']).to.be('Query matched documents');
      const value = parseInt(alertDoc['kibana.alert.evaluation.value'], 10);
      expect(value).greaterThan(0);
      expect(alertDoc[ALERT_URL]).to.contain('/s/space1/app/');
      expect(alertDoc['host.name']).to.eql(['host-1']);
      expect(alertDoc['host.hostname']).to.eql(['host-1']);
      expect(alertDoc['host.id']).to.eql(['1']);
    });

    it('throws an error if the thresholdComparator is not >', async () => {
      const { body } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'test',
          consumer: 'alerts',
          enabled: true,
          rule_type_id: RULE_TYPE_ID,
          schedule: { interval: `${RULE_INTERVAL_SECONDS}s` },
          actions: [],
          notify_when: 'onActiveAlert',
          params: {
            size: 100,
            timeWindowSize: RULE_INTERVAL_SECONDS * 5,
            timeWindowUnit: 's',
            thresholdComparator: '<',
            threshold: [0],
            searchType: 'esqlQuery',
            timeField: 'date',
            esqlQuery: {
              esql: 'from .kibana-alerting-test-data | stats c = count(date) | where c < 0',
            },
          },
        })
        .expect(400);
      expect(body.message).to.be(
        'params invalid: [thresholdComparator]: is required to be greater than'
      );
    });

    it('throws an error if the threshold is not [0]', async () => {
      const { body } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'test',
          consumer: 'alerts',
          enabled: true,
          rule_type_id: RULE_TYPE_ID,
          schedule: { interval: `${RULE_INTERVAL_SECONDS}s` },
          actions: [],
          notify_when: 'onActiveAlert',
          params: {
            size: 100,
            timeWindowSize: RULE_INTERVAL_SECONDS * 5,
            timeWindowUnit: 's',
            thresholdComparator: '>',
            threshold: [100],
            searchType: 'esqlQuery',
            timeField: 'date',
            esqlQuery: {
              esql: 'from .kibana-alerting-test-data | stats c = count(date) | where c < 0',
            },
          },
        })
        .expect(400);
      expect(body.message).to.be('params invalid: [threshold]: is required to be 0');
    });

    it('throws an error if the timeField is undefined', async () => {
      const { body } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'test',
          consumer: 'alerts',
          enabled: true,
          rule_type_id: RULE_TYPE_ID,
          schedule: { interval: `${RULE_INTERVAL_SECONDS}s` },
          actions: [],
          notify_when: 'onActiveAlert',
          params: {
            size: 100,
            timeWindowSize: RULE_INTERVAL_SECONDS * 5,
            timeWindowUnit: 's',
            thresholdComparator: '>',
            threshold: [0],
            searchType: 'esqlQuery',
            esqlQuery: {
              esql: 'from .kibana-alerting-test-data | stats c = count(date) | where c < 0',
            },
          },
        })
        .expect(400);
      expect(body.message).to.be('params invalid: [timeField]: is required');
    });

    it('throws an error if the esqlQuery is undefined', async () => {
      const { body } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'test',
          consumer: 'alerts',
          enabled: true,
          rule_type_id: RULE_TYPE_ID,
          schedule: { interval: `${RULE_INTERVAL_SECONDS}s` },
          actions: [],
          notify_when: 'onActiveAlert',
          params: {
            size: 100,
            timeWindowSize: RULE_INTERVAL_SECONDS * 5,
            timeWindowUnit: 's',
            thresholdComparator: '>',
            threshold: [0],
            searchType: 'esqlQuery',
            timeField: 'date',
          },
        })
        .expect(400);
      expect(body.message).to.be(
        'params invalid: [esqlQuery.esql]: expected value of type [string] but got [undefined]'
      );
    });

    async function waitForDocs(count: number): Promise<any[]> {
      return await esTestIndexToolOutput.waitForDocs(
        ES_TEST_INDEX_SOURCE,
        ES_TEST_INDEX_REFERENCE,
        count
      );
    }

    interface CreateRuleParams {
      name: string;
      esqlQuery: string;
      timeWindowSize?: number;
      timeField?: string;
      notifyWhen?: string;
      aggType?: string;
      aggField?: string;
      groupBy?: string;
      termField?: string;
      termSize?: number;
    }

    async function createRule(params: CreateRuleParams): Promise<string> {
      const action = {
        id: connectorId,
        group: 'query matched',
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
              hits: '{{context.hits}}',
              date: '{{{context.date}}}',
              previousTimestamp: '{{{state.latestTimestamp}}}',
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
              hits: '{{context.hits}}',
              date: '{{{context.date}}}',
            },
          ],
        },
      };

      const { body: createdRule } = await supertest
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
            size: 100,
            timeWindowSize: params.timeWindowSize || RULE_INTERVAL_SECONDS * 5,
            timeWindowUnit: 's',
            thresholdComparator: '>',
            threshold: [0],
            searchType: 'esqlQuery',
            aggType: params.aggType,
            groupBy: params.groupBy,
            aggField: params.aggField,
            termField: params.termField,
            termSize: params.termSize,
            timeField: params.timeField || 'date',
            esqlQuery: { esql: params.esqlQuery },
            sourceFields: [],
          },
        })
        .expect(200);

      const ruleId = createdRule.id;
      objectRemover.add(Spaces.space1.id, ruleId, 'rule', 'alerting');

      return ruleId;
    }
  });
}
