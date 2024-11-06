/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import getPort from 'get-port';
import expect from '@kbn/expect';
import type { SearchTotalHits } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { getWebhookServer } from '@kbn/actions-simulators-plugin/server/plugin';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { ObjectRemover } from '../../../common/lib';
import { Spaces } from '../../scenarios';
import { createWebhookConnector } from './connector_types/stack/webhook';

// eslint-disable-next-line import/no-default-export
export default function createUnsecuredActionTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const es = getService('es');
  const retry = getService('retry');

  describe('execute unsecured action', () => {
    const objectRemover = new ObjectRemover(supertest);

    // need to wait for kibanaServer to settle ...
    before(() => {
      kibanaServer.resolveUrl(`/api/execute_unsecured_action`);
    });

    after(() => objectRemover.removeAll());

    it('should successfully execute email action', async () => {
      const testStart = new Date().toISOString();
      const response = await supertest
        .post(`/api/execute_unsecured_action`)
        .set('kbn-xsrf', 'xxx')
        .send({
          requesterId: 'background_task',
          id: 'my-test-email',
          params: {
            to: ['you@test.com'],
            subject: 'hello from Kibana!',
            message: 'does this work??',
          },
          spaceId: 'default',
          relatedSavedObjects: [
            {
              id: 'task:123',
              type: 'task',
              typeId: 'taskType',
            },
          ],
        })
        .expect(200);
      expect(response.body.status).to.eql('success');
      expect(response.body.result.actionId).to.eql('my-test-email');
      expect(response.body.result.status).to.eql('ok');

      const query = getEventLogExecuteQuery(testStart, 'my-test-email');
      await retry.try(async () => {
        const searchResult = await es.search(query);
        expect((searchResult.hits.total as SearchTotalHits).value).to.eql(1);

        const hit = searchResult.hits.hits[0];
        // @ts-expect-error _source: unknown
        expect(hit?._source?.event?.outcome).to.eql('success');
        // @ts-expect-error _source: unknown
        expect(hit?._source?.message).to.eql(
          `action executed: .email:my-test-email: TestEmail#xyz`
        );
        // @ts-expect-error _source: unknown
        expect(hit?._source?.kibana?.action?.execution?.source).to.eql('background_task');

        // @ts-expect-error _source: unknown
        const savedObjects = hit?._source?.kibana?.saved_objects;
        const taskSORef = (savedObjects ?? []).find((so: any) => so.type === 'task');
        expect(taskSORef).to.eql({
          rel: 'primary',
          type: 'task',
          id: 'task:123',
          type_id: 'taskType',
        });

        // @ts-expect-error _source: unknown
        expect(hit?._source?.kibana?.space_ids).to.eql(['default']);
      });
    });

    it('should successfully execute email action for custom space', async () => {
      const testStart = new Date().toISOString();
      const response = await supertest
        .post(`/api/execute_unsecured_action`)
        .set('kbn-xsrf', 'xxx')
        .send({
          requesterId: 'background_task',
          id: 'my-test-email',
          params: {
            to: ['you@test.com'],
            subject: 'hello from Kibana!',
            message: 'does this work??',
          },
          spaceId: Spaces.other.id,
          relatedSavedObjects: [
            {
              id: 'task:123',
              type: 'task',
              typeId: 'taskType',
            },
          ],
        })
        .expect(200);
      expect(response.body.status).to.eql('success');
      expect(response.body.result.actionId).to.eql('my-test-email');
      expect(response.body.result.status).to.eql('ok');

      const query = getEventLogExecuteQuery(testStart, 'my-test-email');
      await retry.try(async () => {
        const searchResult = await es.search(query);
        expect((searchResult.hits.total as SearchTotalHits).value).to.eql(1);

        const hit = searchResult.hits.hits[0];
        // @ts-expect-error _source: unknown
        expect(hit?._source?.event?.outcome).to.eql('success');
        // @ts-expect-error _source: unknown
        expect(hit?._source?.message).to.eql(
          `action executed: .email:my-test-email: TestEmail#xyz`
        );
        // @ts-expect-error _source: unknown
        expect(hit?._source?.kibana?.action?.execution?.source).to.eql('background_task');

        // @ts-expect-error _source: unknown
        const savedObjects = hit?._source?.kibana?.saved_objects;
        const taskSORef = (savedObjects ?? []).find((so: any) => so.type === 'task');
        expect(taskSORef).to.eql({
          rel: 'primary',
          type: 'task',
          id: 'task:123',
          type_id: 'taskType',
        });

        // @ts-expect-error _source: unknown
        expect(hit?._source?.kibana?.space_ids).to.eql(['other']);
      });
    });

    it('should successfully execute webhook action', async () => {
      const testStart = new Date().toISOString();
      const webhookServer = await getWebhookServer();
      const availablePort = await getPort({ port: 9000 });
      webhookServer.listen(availablePort);
      const webhookConnectorId = await createWebhookConnector(
        supertest,
        `http://localhost:${availablePort}`
      );

      const response = await supertest
        .post(`/api/execute_unsecured_action`)
        .set('kbn-xsrf', 'xxx')
        .send({
          requesterId: 'background_task',
          id: webhookConnectorId,
          params: {
            body: 'success',
          },
          spaceId: 'default',
          relatedSavedObjects: [
            {
              id: 'task:123',
              type: 'task',
              typeId: 'taskType',
            },
          ],
        })
        .expect(200);
      expect(response.body.status).to.eql('success');
      expect(response.body.result.actionId).to.eql(webhookConnectorId);
      expect(response.body.result.status).to.eql('ok');

      const query = getEventLogExecuteQuery(testStart, webhookConnectorId);
      await retry.try(async () => {
        const searchResult = await es.search(query);
        expect((searchResult.hits.total as SearchTotalHits).value).to.eql(1);

        const hit = searchResult.hits.hits[0];
        // @ts-expect-error _source: unknown
        expect(hit?._source?.event?.outcome).to.eql('success');
        // @ts-expect-error _source: unknown
        expect(hit?._source?.message).to.eql(
          `action executed: .webhook:${webhookConnectorId}: A generic Webhook connector`
        );
        // @ts-expect-error _source: unknown
        expect(hit?._source?.kibana?.action?.execution?.source).to.eql('background_task');

        // @ts-expect-error _source: unknown
        const savedObjects = hit?._source?.kibana?.saved_objects;
        const taskSORef = (savedObjects ?? []).find((so: any) => so.type === 'task');
        expect(taskSORef).to.eql({
          rel: 'primary',
          type: 'task',
          id: 'task:123',
          type_id: 'taskType',
        });

        // @ts-expect-error _source: unknown
        expect(hit?._source?.kibana?.space_ids).to.eql(['default']);
      });

      webhookServer.close();
    });

    it('should not allow executing email action from unallowed requester', async () => {
      const response = await supertest
        .post(`/api/execute_unsecured_action`)
        .set('kbn-xsrf', 'xxx')
        .send({
          requesterId: 'not_allowed',
          id: 'my-test-email',
          params: {
            to: ['you@test.com'],
            subject: 'hello from Kibana!',
            message: 'does this work??',
          },
          spaceId: 'default',
        })
        .expect(200);
      expect(response.body.status).to.eql('error');
      expect(response.body.error).to.eql(
        `Error: "not_allowed" feature is not allow-listed for UnsecuredActionsClient access.`
      );
    });

    it('should not allow executing action from unallowed connector types', async () => {
      const testStart = new Date().toISOString();
      const { body: result } = await supertest
        .post(`/api/execute_unsecured_action`)
        .set('kbn-xsrf', 'xxx')
        .send({
          requesterId: 'background_task',
          id: 'preconfigured-es-index-action',
          params: {
            documents: [{ test: 'test' }],
            indexOverride: null,
          },
          spaceId: 'default',
        })
        .expect(200);
      expect(result.status).to.eql('success');
      expect(result.result).to.eql({
        actionId: 'preconfigured-es-index-action',
        status: 'error',
        message: 'Cannot execute unsecured ".index" action - execution of this type is not allowed',
        retry: false,
        errorSource: 'user',
      });

      const query = getEventLogExecuteQuery(testStart, 'preconfigured-es-index-action');
      await retry.try(async () => {
        const searchResult = await es.search(query);
        expect((searchResult.hits.total as SearchTotalHits).value).to.eql(1);

        const hit = searchResult.hits.hits[0];
        // @ts-expect-error _source: unknown
        expect(hit?._source?.event?.outcome).to.eql('failure');
        // @ts-expect-error _source: unknown
        expect(hit?._source?.message).to.eql(
          `action execution failure: .index:preconfigured-es-index-action: preconfigured_es_index_action`
        );
      });
    });
  });

  function getEventLogExecuteQuery(start: string, actionId: string) {
    return {
      index: '.kibana-event-log*',
      body: {
        query: {
          bool: {
            filter: [
              {
                term: {
                  'event.provider': {
                    value: 'actions',
                  },
                },
              },
              {
                term: {
                  'event.action': 'execute',
                },
              },
              {
                range: {
                  '@timestamp': {
                    gte: start,
                  },
                },
              },
              {
                nested: {
                  path: 'kibana.saved_objects',
                  query: {
                    bool: {
                      filter: [
                        {
                          term: {
                            'kibana.saved_objects.id': {
                              value: actionId,
                            },
                          },
                        },
                        {
                          term: {
                            'kibana.saved_objects.type': 'action',
                          },
                        },
                      ],
                    },
                  },
                },
              },
            ],
          },
        },
      },
    };
  }
}
