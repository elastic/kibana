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
} from '../../../../../common/lib';
import { createEsDocuments } from '../lib/create_test_data';

const ALERT_TYPE_ID = '.es-query';
const ACTION_TYPE_ID = '.index';
const ES_TEST_INDEX_SOURCE = 'builtin-alert:es-query';
const ES_TEST_INDEX_REFERENCE = '-na-';
const ES_TEST_OUTPUT_INDEX_NAME = `${ES_TEST_INDEX_NAME}-output`;

const ALERT_INTERVALS_TO_WRITE = 5;
const ALERT_INTERVAL_SECONDS = 3;
const ALERT_INTERVAL_MILLIS = ALERT_INTERVAL_SECONDS * 1000;
const ES_GROUPS_TO_WRITE = 3;

// eslint-disable-next-line import/no-default-export
export default function alertTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const retry = getService('retry');
  const indexPatterns = getService('indexPatterns');
  const es = getService('es');
  const esTestIndexTool = new ESTestIndexTool(es, retry);
  const esTestIndexToolOutput = new ESTestIndexTool(es, retry, ES_TEST_OUTPUT_INDEX_NAME);

  // FLAKY: https://github.com/elastic/kibana/issues/129380
  describe.skip('alert', async () => {
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
    });

    afterEach(async () => {
      await objectRemover.removeAll();
      await esTestIndexTool.destroy();
      await esTestIndexToolOutput.destroy();
    });

    [
      [
        'esQuery',
        async () => {
          await createAlert({
            name: 'never fire',
            esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
            size: 100,
            thresholdComparator: '<',
            threshold: [0],
          });
          await createAlert({
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
          await createAlert({
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
          await createAlert({
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
      it(`runs correctly: threshold on hit count < > for ${searchType} search type`, async () => {
        // write documents from now to the future end date in groups
        createEsDocumentsInGroups(ES_GROUPS_TO_WRITE);
        await initData();

        const docs = await waitForDocs(2);
        for (let i = 0; i < docs.length; i++) {
          const doc = docs[i];
          const { previousTimestamp, hits } = doc._source;
          const { name, title, message } = doc._source.params;

          expect(name).to.be('always fire');
          expect(title).to.be(`alert 'always fire' matched query`);
          const messagePattern =
            /alert 'always fire' is active:\n\n- Value: \d+\n- Conditions Met: Number of matching documents is greater than -1 over 15s\n- Timestamp: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/;
          expect(message).to.match(messagePattern);
          expect(hits).not.to.be.empty();

          // during the first execution, the latestTimestamp value should be empty
          // since this alert always fires, the latestTimestamp value should be updated each execution
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
          await createAlert({
            name: 'never fire',
            size: 100,
            thresholdComparator: '<',
            threshold: [0],
            timeField: 'date_epoch_millis',
            esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
          });
          await createAlert({
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
          await createAlert({
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
          await createAlert({
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
        createEsDocumentsInGroups(ES_GROUPS_TO_WRITE);
        await initData();

        const docs = await waitForDocs(2);
        for (let i = 0; i < docs.length; i++) {
          const doc = docs[i];
          const { previousTimestamp, hits } = doc._source;
          const { name, title, message } = doc._source.params;

          expect(name).to.be('always fire');
          expect(title).to.be(`alert 'always fire' matched query`);
          const messagePattern =
            /alert 'always fire' is active:\n\n- Value: \d+\n- Conditions Met: Number of matching documents is greater than -1 over 15s\n- Timestamp: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/;
          expect(message).to.match(messagePattern);
          expect(hits).not.to.be.empty();

          // during the first execution, the latestTimestamp value should be empty
          // since this alert always fires, the latestTimestamp value should be updated each execution
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
          await createAlert({
            name: 'never fire',
            esQuery: JSON.stringify(rangeQuery(ES_GROUPS_TO_WRITE * ALERT_INTERVALS_TO_WRITE + 1)),
            size: 100,
            thresholdComparator: '<',
            threshold: [-1],
          });
          await createAlert({
            name: 'fires once',
            esQuery: JSON.stringify(
              rangeQuery(Math.floor((ES_GROUPS_TO_WRITE * ALERT_INTERVALS_TO_WRITE) / 2))
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
          await createAlert({
            name: 'never fire',
            size: 100,
            thresholdComparator: '<',
            threshold: [-1],
            searchType: 'searchSource',
            searchConfiguration: {
              query: {
                query: `testedValue > ${ES_GROUPS_TO_WRITE * ALERT_INTERVALS_TO_WRITE + 1}`,
                language: 'kuery',
              },
              index: esTestDataView.id,
              filter: [],
            },
          });
          await createAlert({
            name: 'fires once',
            size: 100,
            thresholdComparator: '>=',
            threshold: [0],
            searchType: 'searchSource',
            searchConfiguration: {
              query: {
                query: `testedValue > ${Math.floor(
                  (ES_GROUPS_TO_WRITE * ALERT_INTERVALS_TO_WRITE) / 2
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
        createEsDocumentsInGroups(ES_GROUPS_TO_WRITE);
        await initData();

        const docs = await waitForDocs(1);
        for (const doc of docs) {
          const { previousTimestamp, hits } = doc._source;
          const { name, title, message } = doc._source.params;

          expect(name).to.be('fires once');
          expect(title).to.be(`alert 'fires once' matched query`);
          const messagePattern =
            /alert 'fires once' is active:\n\n- Value: \d+\n- Conditions Met: Number of matching documents is greater than or equal to 0 over 15s\n- Timestamp: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/;
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
          await createAlert({
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

          await createAlert({
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
          expect(title).to.be(`alert 'always fire' matched query`);
          const messagePattern =
            /alert 'always fire' is active:\n\n- Value: 0+\n- Conditions Met: Number of matching documents is less than 1 over 15s\n- Timestamp: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/;
          expect(message).to.match(messagePattern);
          expect(hits).to.be.empty();

          // during the first execution, the latestTimestamp value should be empty
          // since this alert always fires, the latestTimestamp value should be updated each execution
          if (!i) {
            expect(previousTimestamp).to.be.empty();
          } else {
            expect(previousTimestamp).not.to.be.empty();
          }
        }
      })
    );

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
      size: number;
      thresholdComparator: string;
      threshold: number[];
      timeWindowSize?: number;
      esQuery?: string;
      timeField?: string;
      searchConfiguration?: unknown;
      searchType?: 'searchSource';
    }

    async function createAlert(params: CreateAlertParams): Promise<string> {
      const action = {
        id: actionId,
        group: 'query matched',
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
              hits: '{{context.hits}}',
              date: '{{{context.date}}}',
              previousTimestamp: '{{{state.latestTimestamp}}}',
            },
          ],
        },
      };

      const alertParams =
        params.searchType === 'searchSource'
          ? {
              searchConfiguration: params.searchConfiguration,
            }
          : {
              index: [ES_TEST_INDEX_NAME],
              timeField: params.timeField || 'date',
              esQuery: params.esQuery,
            };

      const { body: createdAlert } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: params.name,
          consumer: 'alerts',
          enabled: true,
          rule_type_id: ALERT_TYPE_ID,
          schedule: { interval: `${ALERT_INTERVAL_SECONDS}s` },
          actions: [action],
          notify_when: 'onActiveAlert',
          params: {
            size: params.size,
            timeWindowSize: params.timeWindowSize || ALERT_INTERVAL_SECONDS * 5,
            timeWindowUnit: 's',
            thresholdComparator: params.thresholdComparator,
            threshold: params.threshold,
            searchType: params.searchType,
            ...alertParams,
          },
        })
        .expect(200);

      const alertId = createdAlert.id;
      objectRemover.add(Spaces.space1.id, alertId, 'rule', 'alerting');

      return alertId;
    }
  });
}

async function createAction(supertest: any, objectRemover: ObjectRemover): Promise<string> {
  const { body: createdAction } = await supertest
    .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector`)
    .set('kbn-xsrf', 'foo')
    .send({
      name: 'index action for es query FT',
      connector_type_id: ACTION_TYPE_ID,
      config: {
        index: ES_TEST_OUTPUT_INDEX_NAME,
      },
      secrets: {},
    })
    .expect(200);

  const actionId = createdAction.id;
  objectRemover.add(Spaces.space1.id, actionId, 'connector', 'actions');

  return actionId;
}
