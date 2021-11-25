/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { Spaces } from '../../scenarios';
import {
  ESTestIndexTool,
  ES_TEST_INDEX_NAME,
  getUrlPrefix,
  ObjectRemover,
} from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');
  const retry = getService('retry');
  const esTestIndexTool = new ESTestIndexTool(es, retry);

  describe('enqueue', () => {
    const objectRemover = new ObjectRemover(supertest);

    before(async () => {
      await esTestIndexTool.destroy();
      await esTestIndexTool.setup();
    });
    after(async () => {
      await esTestIndexTool.destroy();
      await objectRemover.removeAll();
    });

    it('should handle enqueue request appropriately', async () => {
      const { body: createdAction } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'My action',
          connector_type_id: 'test.index-record',
          config: {
            unencrypted: `This value shouldn't get encrypted`,
          },
          secrets: {
            encrypted: 'This value should be encrypted',
          },
        })
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdAction.id, 'action', 'actions');

      const reference = `actions-enqueue-1:${Spaces.space1.id}:${createdAction.id}`;
      const response = await supertest
        .post(
          `${getUrlPrefix(Spaces.space1.id)}/api/alerts_fixture/${createdAction.id}/enqueue_action`
        )
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            reference,
            index: ES_TEST_INDEX_NAME,
            message: 'Testing 123',
          },
        });

      expect(response.status).to.eql(204);
      await esTestIndexTool.waitForDocs('action:test.index-record', reference, 1);
    });

    it('should cleanup task after a failure', async () => {
      const testStart = new Date().toISOString();
      const { body: createdAction } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'My action',
          connector_type_id: 'test.failing',
          config: {},
          secrets: {},
        })
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdAction.id, 'action', 'actions');

      const reference = `actions-enqueue-2:${Spaces.space1.id}:${createdAction.id}`;
      await supertest
        .post(
          `${getUrlPrefix(Spaces.space1.id)}/api/alerts_fixture/${createdAction.id}/enqueue_action`
        )
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            reference,
            index: ES_TEST_INDEX_NAME,
          },
        })
        .expect(204);
      await esTestIndexTool.waitForDocs('action:test.failing', reference, 1);

      await retry.try(async () => {
        const searchResult = await es.search({
          index: '.kibana_task_manager',
          body: {
            query: {
              bool: {
                must: [
                  {
                    term: {
                      'task.taskType': 'actions:test.failing',
                    },
                  },
                  {
                    range: {
                      'task.scheduledAt': {
                        gte: testStart,
                      },
                    },
                  },
                ],
              },
            },
          },
        });
        expect((searchResult.hits.total as estypes.SearchTotalHits).value).to.eql(0);
      });
    });

    it('should never leaved a failed task, even if max attempts is reached', async () => {
      // We have to provide the test.rate-limit the next runAt, for testing purposes
      const retryDate = new Date(Date.now() + 1);
      const { body: createdAction } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'My action',
          connector_type_id: 'test.no-attempts-rate-limit',
          config: {},
          secrets: {},
        })
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdAction.id, 'action', 'actions');

      const reference = `actions-enqueue-2:${Spaces.space1.id}:${createdAction.id}`;
      await supertest
        .post(
          `${getUrlPrefix(Spaces.space1.id)}/api/alerts_fixture/${createdAction.id}/enqueue_action`
        )
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            reference,
            index: ES_TEST_INDEX_NAME,
            retryAt: retryDate.getTime(),
          },
        })
        .expect(204);

      await retry.try(async () => {
        const runningSearchResult = await es.search({
          index: '.kibana_task_manager',
          body: {
            query: {
              bool: {
                must: [
                  {
                    term: {
                      'task.taskType': 'actions:test.no-attempts-rate-limit',
                    },
                  },
                ],
              },
            },
          },
        });
        const total = (runningSearchResult.hits.total as estypes.SearchTotalHits).value;
        expect(total).to.eql(1);
      });

      await retry.try(async () => {
        const runningSearchResult = await es.search({
          index: '.kibana_task_manager',
          body: {
            query: {
              bool: {
                must: [
                  {
                    term: {
                      'task.taskType': 'actions:test.no-attempts-rate-limit',
                    },
                  },
                ],
              },
            },
          },
        });
        const total = (runningSearchResult.hits.total as estypes.SearchTotalHits).value;
        expect(total).to.eql(0);
      });
    });
  });
}
