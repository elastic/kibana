/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { ES_TEST_INDEX_NAME } from '@kbn/alerting-api-integration-helpers';

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
  const indexPatterns = getService('indexPatterns');
  const {
    es,
    esTestIndexTool,
    esTestIndexToolOutput,
    esTestIndexToolDataStream,
    createEsDocumentsInGroups,
    createGroupedEsDocumentsInGroups,
  } = getRuleServices(getService);

  describe('rule', async () => {
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
    });

    [
      [
        'esQuery',
        async () => {
          await createRule({
            name: 'never fire',
            esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
            size: 100,
            thresholdComparator: '<',
            threshold: [0],
          });
          await createRule({
            name: 'always fire',
            esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
            size: 100,
            thresholdComparator: '>',
            threshold: [-1],
          });
        },
      ] as const,
      [
        'searchSource',
        async () => {
          const esTestDataView = await indexPatterns.create(
            { title: ES_TEST_INDEX_NAME, timeFieldName: 'date' },
            { override: true },
            getUrlPrefix(Spaces.space1.id)
          );
          await createRule({
            name: 'never fire',
            size: 100,
            thresholdComparator: '<',
            threshold: [0],
            searchType: 'searchSource',
            searchConfiguration: {
              query: {
                query: '',
                language: 'kuery',
              },
              index: esTestDataView.id,
              filter: [],
            },
          });
          await createRule({
            name: 'always fire',
            size: 100,
            thresholdComparator: '>',
            threshold: [-1],
            searchType: 'searchSource',
            searchConfiguration: {
              query: {
                query: '',
                language: 'kuery',
              },
              index: esTestDataView.id,
              filter: [],
            },
          });
        },
      ] as const,
    ].forEach(([searchType, initData]) =>
      it(`runs correctly: threshold on ungrouped hit count < > for ${searchType} search type`, async () => {
        // write documents from now to the future end date in groups
        await createEsDocumentsInGroups(ES_GROUPS_TO_WRITE, endDate);
        await initData();

        const docs = await waitForDocs(2);
        for (let i = 0; i < docs.length; i++) {
          const doc = docs[i];
          const { previousTimestamp, hits } = doc._source;
          const { name, title, message } = doc._source.params;

          expect(name).to.be('always fire');
          expect(title).to.be(`rule 'always fire' matched query`);
          const messagePattern =
            /rule 'always fire' is active:\n\n- Value: \d+\n- Conditions Met: Number of matching documents is greater than -1 over 20s\n- Timestamp: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/;
          expect(message).to.match(messagePattern);
          expect(hits).not.to.be.empty();

          // during the first execution, the latestTimestamp value should be empty
          // since this rule always fires, the latestTimestamp value should be updated each execution
          if (!i) {
            expect(previousTimestamp).to.be.empty();
          } else {
            expect(previousTimestamp).not.to.be.empty();
          }
        }
      })
    );

    [
      [
        'esQuery',
        async () => {
          await createRule({
            name: 'never fire',
            esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
            size: 100,
            thresholdComparator: '<',
            threshold: [0],
            aggType: 'avg',
            aggField: 'testedValue',
          });
          await createRule({
            name: 'always fire',
            esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
            size: 100,
            thresholdComparator: '>',
            threshold: [-1],
            aggType: 'avg',
            aggField: 'testedValue',
          });
        },
      ] as const,
      [
        'searchSource',
        async () => {
          const esTestDataView = await indexPatterns.create(
            { title: ES_TEST_INDEX_NAME, timeFieldName: 'date' },
            { override: true },
            getUrlPrefix(Spaces.space1.id)
          );
          await createRule({
            name: 'never fire',
            size: 100,
            thresholdComparator: '<',
            threshold: [0],
            searchType: 'searchSource',
            searchConfiguration: {
              query: {
                query: '',
                language: 'kuery',
              },
              index: esTestDataView.id,
              filter: [],
            },
            aggType: 'avg',
            aggField: 'testedValue',
          });
          await createRule({
            name: 'always fire',
            size: 100,
            thresholdComparator: '>',
            threshold: [-1],
            searchType: 'searchSource',
            searchConfiguration: {
              query: {
                query: '',
                language: 'kuery',
              },
              index: esTestDataView.id,
              filter: [],
            },
            aggType: 'avg',
            aggField: 'testedValue',
          });
        },
      ] as const,
    ].forEach(([searchType, initData]) =>
      it(`runs correctly: threshold on ungrouped agg metric < > for ${searchType} search type`, async () => {
        // write documents from now to the future end date in groups
        await createEsDocumentsInGroups(ES_GROUPS_TO_WRITE, endDate);
        await initData();

        const docs = await waitForDocs(2);
        for (let i = 0; i < docs.length; i++) {
          const doc = docs[i];
          const { previousTimestamp, hits } = doc._source;
          const { name, title, message } = doc._source.params;

          expect(name).to.be('always fire');
          expect(title).to.be(`rule 'always fire' matched query`);
          const messagePattern =
            /rule 'always fire' is active:\n\n- Value: \d+.?\d*\n- Conditions Met: Number of matching documents where avg of testedValue is greater than -1 over 20s\n- Timestamp: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/;
          expect(message).to.match(messagePattern);
          expect(hits).not.to.be.empty();

          // during the first execution, the latestTimestamp value should be empty
          // since this rule always fires, the latestTimestamp value should be updated each execution
          if (!i) {
            expect(previousTimestamp).to.be.empty();
          } else {
            expect(previousTimestamp).not.to.be.empty();
          }
        }
      })
    );

    [
      [
        'esQuery',
        async () => {
          await createRule({
            name: 'never fire',
            esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
            size: 100,
            thresholdComparator: '<',
            threshold: [0],
            groupBy: 'top',
            termField: 'group',
            termSize: 2,
          });
          await createRule({
            name: 'always fire',
            esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
            size: 100,
            thresholdComparator: '>',
            threshold: [-1],
            groupBy: 'top',
            termField: 'group',
            termSize: 2,
          });
        },
      ] as const,
      [
        'searchSource',
        async () => {
          const esTestDataView = await indexPatterns.create(
            { title: ES_TEST_INDEX_NAME, timeFieldName: 'date' },
            { override: true },
            getUrlPrefix(Spaces.space1.id)
          );
          await createRule({
            name: 'never fire',
            size: 100,
            thresholdComparator: '<',
            threshold: [0],
            searchType: 'searchSource',
            searchConfiguration: {
              query: {
                query: '',
                language: 'kuery',
              },
              index: esTestDataView.id,
              filter: [],
            },
            groupBy: 'top',
            termField: 'group',
            termSize: 2,
          });
          await createRule({
            name: 'always fire',
            size: 100,
            thresholdComparator: '>',
            threshold: [-1],
            searchType: 'searchSource',
            searchConfiguration: {
              query: {
                query: '',
                language: 'kuery',
              },
              index: esTestDataView.id,
              filter: [],
            },
            groupBy: 'top',
            termField: 'group',
            termSize: 2,
          });
        },
      ] as const,
    ].forEach(([searchType, initData]) =>
      it(`runs correctly: threshold on grouped hit count < > for ${searchType} search type`, async () => {
        // write documents from now to the future end date in groups
        await createGroupedEsDocumentsInGroups(ES_GROUPS_TO_WRITE, endDate);
        await initData();

        const docs = await waitForDocs(2);
        for (let i = 0; i < docs.length; i++) {
          const doc = docs[i];
          const { previousTimestamp, hits } = doc._source;
          const { name, title, message } = doc._source.params;

          expect(name).to.be('always fire');
          const titlePattern = /rule 'always fire' matched query for group group-\d/;
          expect(title).to.match(titlePattern);
          const messagePattern =
            /rule 'always fire' is active:\n\n- Value: \d+\n- Conditions Met: Number of matching documents for group \"group-\d\" is greater than -1 over 20s\n- Timestamp: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/;
          expect(message).to.match(messagePattern);
          expect(hits).not.to.be.empty();

          expect(previousTimestamp).to.be.empty();
        }
      })
    );

    [
      [
        'esQuery',
        async () => {
          await createRule({
            name: 'never fire',
            esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
            size: 100,
            thresholdComparator: '<',
            threshold: [0],
            groupBy: 'top',
            termField: 'group',
            termSize: 2,
            aggType: 'avg',
            aggField: 'testedValue',
          });
          await createRule({
            name: 'always fire',
            esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
            size: 100,
            thresholdComparator: '>',
            threshold: [-1],
            groupBy: 'top',
            termField: 'group',
            termSize: 2,
            aggType: 'avg',
            aggField: 'testedValue',
          });
        },
      ] as const,
      [
        'searchSource',
        async () => {
          const esTestDataView = await indexPatterns.create(
            { title: ES_TEST_INDEX_NAME, timeFieldName: 'date' },
            { override: true },
            getUrlPrefix(Spaces.space1.id)
          );
          await createRule({
            name: 'never fire',
            size: 100,
            thresholdComparator: '<',
            threshold: [0],
            searchType: 'searchSource',
            searchConfiguration: {
              query: {
                query: '',
                language: 'kuery',
              },
              index: esTestDataView.id,
              filter: [],
            },
            groupBy: 'top',
            termField: 'group',
            termSize: 2,
            aggType: 'avg',
            aggField: 'testedValue',
          });
          await createRule({
            name: 'always fire',
            size: 100,
            thresholdComparator: '>',
            threshold: [-1],
            searchType: 'searchSource',
            searchConfiguration: {
              query: {
                query: '',
                language: 'kuery',
              },
              index: esTestDataView.id,
              filter: [],
            },
            groupBy: 'top',
            termField: 'group',
            termSize: 2,
            aggType: 'avg',
            aggField: 'testedValue',
          });
        },
      ] as const,
    ].forEach(([searchType, initData]) =>
      it(`runs correctly: threshold on grouped agg metric < > for ${searchType} search type`, async () => {
        // write documents from now to the future end date in groups
        await createGroupedEsDocumentsInGroups(ES_GROUPS_TO_WRITE, endDate);
        await initData();

        const docs = await waitForDocs(2);
        for (let i = 0; i < docs.length; i++) {
          const doc = docs[i];
          const { previousTimestamp, hits } = doc._source;
          const { name, title, message } = doc._source.params;

          expect(name).to.be('always fire');
          const titlePattern = /rule 'always fire' matched query for group group-\d/;
          expect(title).to.match(titlePattern);
          const messagePattern =
            /rule 'always fire' is active:\n\n- Value: \d+.?\d*\n- Conditions Met: Number of matching documents for group \"group-\d\" where avg of testedValue is greater than -1 over 20s\n- Timestamp: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/;
          expect(message).to.match(messagePattern);
          expect(hits).not.to.be.empty();

          expect(previousTimestamp).to.be.empty();
        }
      })
    );

    [
      [
        'esQuery',
        async () => {
          await createRule({
            name: 'never fire',
            size: 100,
            thresholdComparator: '<',
            threshold: [0],
            timeField: 'date_epoch_millis',
            esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
          });
          await createRule({
            name: 'always fire',
            esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
            size: 100,
            thresholdComparator: '>',
            threshold: [-1],
            timeField: 'date_epoch_millis',
          });
        },
      ] as const,
      [
        'searchSource',
        async () => {
          const esTestDataView = await indexPatterns.create(
            { title: ES_TEST_INDEX_NAME, timeFieldName: 'date_epoch_millis' },
            { override: true },
            getUrlPrefix(Spaces.space1.id)
          );
          await createRule({
            name: 'never fire',
            size: 100,
            thresholdComparator: '<',
            threshold: [0],
            searchType: 'searchSource',
            searchConfiguration: {
              query: {
                query: '',
                language: 'kuery',
              },
              index: esTestDataView.id,
              filter: [],
            },
          });
          await createRule({
            name: 'always fire',
            size: 100,
            thresholdComparator: '>',
            threshold: [-1],
            searchType: 'searchSource',
            searchConfiguration: {
              query: {
                query: '',
                language: 'kuery',
              },
              index: esTestDataView.id,
              filter: [],
            },
          });
        },
      ] as const,
    ].forEach(([searchType, initData]) =>
      it(`runs correctly: use epoch millis - threshold on hit count < > for ${searchType} search type`, async () => {
        // write documents from now to the future end date in groups
        const endDateMillis = Date.now() + (RULE_INTERVALS_TO_WRITE - 1) * RULE_INTERVAL_MILLIS;
        endDate = new Date(endDateMillis).toISOString();
        await createEsDocumentsInGroups(ES_GROUPS_TO_WRITE, endDate);
        await initData();

        const docs = await waitForDocs(2);
        for (let i = 0; i < docs.length; i++) {
          const doc = docs[i];
          const { previousTimestamp, hits } = doc._source;
          const { name, title, message } = doc._source.params;

          expect(name).to.be('always fire');
          expect(title).to.be(`rule 'always fire' matched query`);
          const messagePattern =
            /rule 'always fire' is active:\n\n- Value: \d+\n- Conditions Met: Number of matching documents is greater than -1 over 20s\n- Timestamp: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/;
          expect(message).to.match(messagePattern);
          expect(hits).not.to.be.empty();

          // during the first execution, the latestTimestamp value should be empty
          // since this rule always fires, the latestTimestamp value should be updated each execution
          if (i === 0) {
            expect(previousTimestamp).to.be.empty();
          } else {
            expect(previousTimestamp).not.to.be.empty();
          }
        }
      })
    );

    [
      [
        'esQuery',
        async () => {
          const rangeQuery = (rangeThreshold: number) => {
            return {
              query: {
                bool: {
                  filter: [
                    {
                      range: {
                        testedValue: {
                          gte: rangeThreshold,
                        },
                      },
                    },
                  ],
                },
              },
            };
          };
          await createRule({
            name: 'never fire',
            esQuery: JSON.stringify(rangeQuery(ES_GROUPS_TO_WRITE * RULE_INTERVALS_TO_WRITE + 1)),
            size: 100,
            thresholdComparator: '<',
            threshold: [-1],
          });
          await createRule({
            name: 'fires once',
            esQuery: JSON.stringify(
              rangeQuery(Math.floor((ES_GROUPS_TO_WRITE * RULE_INTERVALS_TO_WRITE) / 2))
            ),
            size: 100,
            thresholdComparator: '>=',
            threshold: [0],
          });
        },
      ] as const,
      [
        'searchSource',
        async () => {
          const esTestDataView = await indexPatterns.create(
            { title: ES_TEST_INDEX_NAME, timeFieldName: 'date' },
            { override: true },
            getUrlPrefix(Spaces.space1.id)
          );
          await createRule({
            name: 'never fire',
            size: 100,
            thresholdComparator: '<',
            threshold: [-1],
            searchType: 'searchSource',
            searchConfiguration: {
              query: {
                query: `testedValue > ${ES_GROUPS_TO_WRITE * RULE_INTERVALS_TO_WRITE + 1}`,
                language: 'kuery',
              },
              index: esTestDataView.id,
              filter: [],
            },
          });
          await createRule({
            name: 'fires once',
            size: 100,
            thresholdComparator: '>=',
            threshold: [0],
            searchType: 'searchSource',
            searchConfiguration: {
              query: {
                query: `testedValue > ${Math.floor(
                  (ES_GROUPS_TO_WRITE * RULE_INTERVALS_TO_WRITE) / 2
                )}`,
                language: 'kuery',
              },
              index: esTestDataView.id,
              filter: [],
            },
          });
        },
      ] as const,
    ].forEach(([searchType, initData]) =>
      it(`runs correctly with query: threshold on hit count < > for ${searchType}`, async () => {
        // write documents from now to the future end date in groups
        await createEsDocumentsInGroups(ES_GROUPS_TO_WRITE, endDate);
        await initData();

        const docs = await waitForDocs(1);
        for (const doc of docs) {
          const { previousTimestamp, hits } = doc._source;
          const { name, title, message } = doc._source.params;

          expect(name).to.be('fires once');
          expect(title).to.be(`rule 'fires once' matched query`);
          const messagePattern =
            /rule 'fires once' is active:\n\n- Value: \d+\n- Conditions Met: Number of matching documents is greater than or equal to 0 over 20s\n- Timestamp: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/;
          expect(message).to.match(messagePattern);
          expect(hits).not.to.be.empty();
          expect(previousTimestamp).to.be.empty();
        }
      })
    );

    [
      [
        'esQuery',
        async () => {
          await createRule({
            name: 'always fire',
            esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
            size: 100,
            thresholdComparator: '<',
            threshold: [1],
          });
        },
      ] as const,
      [
        'searchSource',
        async () => {
          const esTestDataView = await indexPatterns.create(
            { title: ES_TEST_INDEX_NAME, timeFieldName: 'date' },
            { override: true },
            getUrlPrefix(Spaces.space1.id)
          );

          await createRule({
            name: 'always fire',
            size: 100,
            thresholdComparator: '<',
            threshold: [1],
            searchType: 'searchSource',
            searchConfiguration: {
              query: {
                query: '',
                language: 'kuery',
              },
              index: esTestDataView.id,
              filter: [],
            },
          });
        },
      ] as const,
    ].forEach(([searchType, initData]) =>
      it(`runs correctly: no matches for ${searchType} search type`, async () => {
        await initData();

        const docs = await waitForDocs(1);
        for (let i = 0; i < docs.length; i++) {
          const doc = docs[i];
          const { previousTimestamp, hits } = doc._source;
          const { name, title, message } = doc._source.params;

          expect(name).to.be('always fire');
          expect(title).to.be(`rule 'always fire' matched query`);
          const messagePattern =
            /rule 'always fire' is active:\n\n- Value: 0+\n- Conditions Met: Number of matching documents is less than 1 over 20s\n- Timestamp: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/;
          expect(message).to.match(messagePattern);
          expect(hits).to.be.empty();

          // during the first execution, the latestTimestamp value should be empty
          // since this rule always fires, the latestTimestamp value should be updated each execution
          if (!i) {
            expect(previousTimestamp).to.be.empty();
          } else {
            expect(previousTimestamp).not.to.be.empty();
          }
        }
      })
    );

    [
      [
        'esQuery',
        async () => {
          // This rule should be active initially when the number of documents is below the threshold
          // and then recover when we add more documents.
          await createRule({
            name: 'fire then recovers',
            esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
            size: 100,
            thresholdComparator: '<',
            threshold: [1],
            notifyWhen: 'onActionGroupChange',
            timeWindowSize: RULE_INTERVAL_SECONDS,
          });
        },
      ] as const,
      [
        'searchSource',
        async () => {
          const esTestDataView = await indexPatterns.create(
            { title: ES_TEST_INDEX_NAME, timeFieldName: 'date' },
            { override: true },
            getUrlPrefix(Spaces.space1.id)
          );
          // This rule should be active initially when the number of documents is below the threshold
          // and then recover when we add more documents.
          await createRule({
            name: 'fire then recovers',
            size: 100,
            thresholdComparator: '<',
            threshold: [1],
            searchType: 'searchSource',
            searchConfiguration: {
              query: {
                query: '',
                language: 'kuery',
              },
              index: esTestDataView.id,
              filter: [],
            },
            notifyWhen: 'onActionGroupChange',
            timeWindowSize: RULE_INTERVAL_SECONDS,
          });
        },
      ] as const,
    ].forEach(([searchType, initData]) =>
      it(`runs correctly and populates recovery context for ${searchType} search type`, async () => {
        await initData();

        // delay to let rule run once before adding data
        await new Promise((resolve) => setTimeout(resolve, 3000));
        await createEsDocumentsInGroups(1, endDate);

        const docs = await waitForDocs(2);
        const activeDoc = docs[0];
        const {
          name: activeName,
          title: activeTitle,
          value: activeValue,
          message: activeMessage,
        } = activeDoc._source.params;

        expect(activeName).to.be('fire then recovers');
        expect(activeTitle).to.be(`rule 'fire then recovers' matched query`);
        expect(activeValue).to.be('0');
        expect(activeMessage).to.match(
          /rule 'fire then recovers' is active:\n\n- Value: \d+\n- Conditions Met: Number of matching documents is less than 1 over 4s\n- Timestamp: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z\n- Link:/
        );

        const recoveredDoc = docs[1];
        const {
          name: recoveredName,
          title: recoveredTitle,
          message: recoveredMessage,
        } = recoveredDoc._source.params;

        expect(recoveredName).to.be('fire then recovers');
        expect(recoveredTitle).to.be(`rule 'fire then recovers' recovered`);
        expect(recoveredMessage).to.match(
          /rule 'fire then recovers' is recovered:\n\n- Value: \d+\n- Conditions Met: Number of matching documents is NOT less than 1 over 4s\n- Timestamp: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z\n- Link:/
        );
      })
    );

    [
      [
        'esQuery',
        async () => {
          await createRule({
            name: 'never fire',
            esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
            size: 100,
            thresholdComparator: '<',
            threshold: [0],
            indexName: ES_TEST_DATA_STREAM_NAME,
            timeField: '@timestamp',
          });
          await createRule({
            name: 'always fire',
            esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
            size: 100,
            thresholdComparator: '>',
            threshold: [-1],
            indexName: ES_TEST_DATA_STREAM_NAME,
            timeField: '@timestamp',
          });
        },
      ] as const,
      [
        'searchSource',
        async () => {
          const esTestDataView = await indexPatterns.create(
            { title: ES_TEST_DATA_STREAM_NAME, timeFieldName: 'date' },
            { override: true },
            getUrlPrefix(Spaces.space1.id)
          );
          await createRule({
            name: 'never fire',
            size: 100,
            thresholdComparator: '<',
            threshold: [0],
            searchType: 'searchSource',
            searchConfiguration: {
              query: {
                query: '',
                language: 'kuery',
              },
              index: esTestDataView.id,
              filter: [],
            },
          });
          await createRule({
            name: 'always fire',
            size: 100,
            thresholdComparator: '>',
            threshold: [-1],
            searchType: 'searchSource',
            searchConfiguration: {
              query: {
                query: '',
                language: 'kuery',
              },
              index: esTestDataView.id,
              filter: [],
            },
          });
        },
      ] as const,
    ].forEach(([searchType, initData]) =>
      it(`runs correctly over a data stream: threshold on hit count < > for ${searchType} search type`, async () => {
        // write documents from now to the future end date in groups
        await createEsDocumentsInGroups(
          ES_GROUPS_TO_WRITE,
          endDate,
          esTestIndexToolDataStream,
          ES_TEST_DATA_STREAM_NAME
        );
        await initData();

        const docs = await waitForDocs(2);
        for (let i = 0; i < docs.length; i++) {
          const doc = docs[i];
          const { previousTimestamp, hits } = doc._source;
          const { name, title, message } = doc._source.params;

          expect(name).to.be('always fire');
          expect(title).to.be(`rule 'always fire' matched query`);
          const messagePattern =
            /rule 'always fire' is active:\n\n- Value: \d+\n- Conditions Met: Number of matching documents is greater than -1 over 20s\n- Timestamp: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/;
          expect(message).to.match(messagePattern);
          expect(hits).not.to.be.empty();

          // during the first execution, the latestTimestamp value should be empty
          // since this rule always fires, the latestTimestamp value should be updated each execution
          if (!i) {
            expect(previousTimestamp).to.be.empty();
          } else {
            expect(previousTimestamp).not.to.be.empty();
          }
        }
      })
    );

    describe('excludeHitsFromPreviousRun', () => {
      it('excludes hits from the previous rule run when excludeHitsFromPreviousRun is true', async () => {
        endDate = new Date().toISOString();

        await createEsDocumentsInGroups(ES_GROUPS_TO_WRITE, endDate);

        await createRule({
          name: 'always fire',
          esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
          size: 100,
          thresholdComparator: '>',
          threshold: [0],
          timeWindowSize: 300,
          excludeHitsFromPreviousRun: true,
        });

        const docs = await waitForDocs(2);

        expect(docs[0]._source.hits.length).greaterThan(0);
        expect(docs[0]._source.params.message).to.match(/rule 'always fire' is active/);

        expect(docs[1]._source.hits.length).to.be(0);
        expect(docs[1]._source.params.message).to.match(/rule 'always fire' is recovered/);
      });

      it('excludes hits from the previous rule run when excludeHitsFromPreviousRun is undefined', async () => {
        endDate = new Date().toISOString();

        await createEsDocumentsInGroups(ES_GROUPS_TO_WRITE, endDate);

        await createRule({
          name: 'always fire',
          esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
          size: 100,
          thresholdComparator: '>',
          threshold: [0],
          timeWindowSize: 300,
        });

        const docs = await waitForDocs(2);

        expect(docs[0]._source.hits.length).greaterThan(0);
        expect(docs[0]._source.params.message).to.match(/rule 'always fire' is active/);

        expect(docs[1]._source.hits.length).to.be(0);
        expect(docs[1]._source.params.message).to.match(/rule 'always fire' is recovered/);
      });

      it('does not exclude hits from the previous rule run when excludeHitsFromPreviousRun is false', async () => {
        endDate = new Date().toISOString();

        await createEsDocumentsInGroups(ES_GROUPS_TO_WRITE, endDate);

        await createRule({
          name: 'always fire',
          esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
          size: 100,
          thresholdComparator: '>',
          threshold: [0],
          timeWindowSize: 300,
          excludeHitsFromPreviousRun: false,
        });

        const docs = await waitForDocs(2);

        expect(docs[0]._source.hits.length).greaterThan(0);
        expect(docs[0]._source.params.message).to.match(/rule 'always fire' is active/);

        expect(docs[1]._source.hits.length).greaterThan(0);
        expect(docs[1]._source.params.message).to.match(/rule 'always fire' is active/);
      });
    });

    describe('aggType and groupBy', () => {
      it('sets aggType: "count" and groupBy: "all" when they are undefined', async () => {
        endDate = new Date().toISOString();

        await createEsDocumentsInGroups(ES_GROUPS_TO_WRITE, endDate);

        await createRule({
          name: 'always fire',
          esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
          size: 100,
          thresholdComparator: '>',
          threshold: [0],
          aggType: undefined,
          groupBy: undefined,
        });

        const docs = await waitForDocs(2);

        expect(docs[0]._source.hits.length).greaterThan(0);
        const messagePattern =
          /rule 'always fire' is active:\n\n- Value: \d+\n- Conditions Met: Number of matching documents is greater than 0 over 20s\n- Timestamp: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/;
        expect(docs[0]._source.params.message).to.match(messagePattern);

        expect(docs[1]._source.hits.length).to.be(0);
        expect(docs[1]._source.params.message).to.match(/rule 'always fire' is recovered/);
      });
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
      size: number;
      thresholdComparator: string;
      threshold: number[];
      timeWindowSize?: number;
      esQuery?: string;
      timeField?: string;
      searchConfiguration?: unknown;
      searchType?: 'searchSource';
      notifyWhen?: string;
      indexName?: string;
      excludeHitsFromPreviousRun?: boolean;
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

      const ruleParams =
        params.searchType === 'searchSource'
          ? {
              searchConfiguration: params.searchConfiguration,
            }
          : {
              index: [params.indexName || ES_TEST_INDEX_NAME],
              timeField: params.timeField || 'date',
              esQuery: params.esQuery,
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
            size: params.size,
            timeWindowSize: params.timeWindowSize || RULE_INTERVAL_SECONDS * 5,
            timeWindowUnit: 's',
            thresholdComparator: params.thresholdComparator,
            threshold: params.threshold,
            searchType: params.searchType,
            aggType: params.aggType,
            groupBy: params.groupBy,
            aggField: params.aggField,
            termField: params.termField,
            termSize: params.termSize,
            ...(params.excludeHitsFromPreviousRun !== undefined && {
              excludeHitsFromPreviousRun: params.excludeHitsFromPreviousRun,
            }),
            ...ruleParams,
          },
        })
        .expect(200);

      const ruleId = createdRule.id;
      objectRemover.add(Spaces.space1.id, ruleId, 'rule', 'alerting');

      return ruleId;
    }
  });
}
