/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { SearchTotalHits } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { ObjectRemover } from '../../../common/lib';

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
          requesterId: 'functional_tester',
          id: 'my-test-email',
          params: {
            to: ['you@test.com'],
            subject: 'hello from Kibana!',
            message: 'does this work??',
          },
          spaceId: 'default',
        })
        .expect(200);
      expect(response.body.status).to.eql('success');
      expect(response.body.result.actionId).to.eql('my-test-email');
      expect(response.body.result.status).to.eql('ok');

      await retry.try(async () => {
        const searchResult = await es.search({
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
                        gte: testStart,
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
                                  value: 'my-test-email',
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
        });
        expect((searchResult.hits.total as SearchTotalHits).value).to.eql(1);

        const hit = searchResult.hits.hits[0];
        // @ts-expect-error _source: unknown
        expect(hit?._source?.event?.outcome).to.eql('success');
        // @ts-expect-error _source: unknown
        expect(hit?._source?.message).to.eql(
          `action executed: .email:my-test-email: TestEmail#xyz`
        );
      });
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
  });
}
