/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { SearchTotalHits } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { Spaces } from '../../scenarios';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { getUrlPrefix, ObjectRemover } from '../../../common/lib';

// eslint-disable-next-line import/no-default-export
export default function createUnsecuredActionTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const es = getService('es');
  const retry = getService('retry');

  describe('schedule unsecured action', () => {
    const objectRemover = new ObjectRemover(supertest);

    // need to wait for kibanaServer to settle ...
    before(() => {
      kibanaServer.resolveUrl(`/api/sample_unsecured_action`);
    });

    after(() => objectRemover.removeAll());

    it('should successfully schedule email action', async () => {
      const testStart = new Date().toISOString();
      const { body: result } = await supertest
        .post(`/api/sample_unsecured_action`)
        .set('kbn-xsrf', 'xxx')
        .send({
          requesterId: 'functional_tester',
          id: 'my-test-email',
          params: {
            to: ['you@test.com'],
            subject: 'hello from Kibana!',
            message: 'does this work??',
          },
        })
        .expect(200);
      expect(result.status).to.eql('success');

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

    it('should not allow scheduling email action from unallowed requester', async () => {
      const { body: result } = await supertest
        .post(`/api/sample_unsecured_action`)
        .set('kbn-xsrf', 'xxx')
        .send({
          requesterId: 'not_allowed',
          id: 'my-test-email',
          params: {
            to: ['you@test.com'],
            subject: 'hello from Kibana!',
            message: 'does this work??',
          },
        })
        .expect(200);
      expect(result.status).to.eql('error');
      expect(result.error).to.eql(
        `Error: "not_allowed" feature is not allow-listed for UnsecuredActionsClient access.`
      );
    });

    it('should not allow scheduling action from unallowed connector types', async () => {
      const { body: result } = await supertest
        .post(`/api/sample_unsecured_action`)
        .set('kbn-xsrf', 'xxx')
        .send({
          requesterId: 'functional_tester',
          id: 'my-slack1',
          params: {
            message: 'does this work??',
          },
        })
        .expect(200);
      expect(result.status).to.eql('error');
      expect(result.error).to.eql(
        `Error: .slack actions cannot be scheduled for unsecured actions execution`
      );
    });

    it('should not allow scheduling action from non preconfigured connectors', async () => {
      const response = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'My email action',
          connector_type_id: '.email',
          config: {
            from: 'me@test.com',
            service: '__json',
          },
          secrets: {
            user: 'user',
            password: 'password',
          },
        });
      expect(response.status).to.eql(200);

      const connectorId = response.body.id;
      objectRemover.add(Spaces.space1.id, connectorId, 'action', 'actions');
      const { body: result } = await supertest
        .post(`/api/sample_unsecured_action`)
        .set('kbn-xsrf', 'xxx')
        .send({
          requesterId: 'functional_tester',
          id: connectorId,
          params: {
            to: ['you@test.com'],
            subject: 'hello from Kibana!',
            message: 'does this work??',
          },
        })
        .expect(200);
      expect(result.status).to.eql('error');
      expect(result.error).to.eql(
        `Error: ${connectorId} are not preconfigured connectors and can't be scheduled for unsecured actions execution`
      );
    });
  });
}
