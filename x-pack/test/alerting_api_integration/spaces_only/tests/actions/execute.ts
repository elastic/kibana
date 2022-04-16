/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Client } from '@elastic/elasticsearch';
import expect from '@kbn/expect';
import { IValidatedEvent } from '@kbn/event-log-plugin/server';
import { Spaces } from '../../scenarios';
import {
  ESTestIndexTool,
  ES_TEST_INDEX_NAME,
  getUrlPrefix,
  ObjectRemover,
  getEventLog,
} from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

const NANOS_IN_MILLIS = 1000 * 1000;

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es: Client = getService('es');
  const retry = getService('retry');
  const esTestIndexTool = new ESTestIndexTool(es, retry);

  const authorizationIndex = '.kibana-test-authorization';

  describe('execute', () => {
    const objectRemover = new ObjectRemover(supertest);

    before(async () => {
      await esTestIndexTool.destroy();
      await esTestIndexTool.setup();
      await es.indices.create({ index: authorizationIndex });
    });
    after(async () => {
      await esTestIndexTool.destroy();
      await es.indices.delete({ index: authorizationIndex });
      await objectRemover.removeAll();
    });

    it('should handle execute request appropriately', async () => {
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

      const reference = `actions-execute-1:${Spaces.space1.id}:${createdAction.id}`;
      const response = await supertest
        .post(
          `${getUrlPrefix(Spaces.space1.id)}/api/actions/connector/${createdAction.id}/_execute`
        )
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            reference,
            index: ES_TEST_INDEX_NAME,
            message: 'Testing 123',
          },
        });

      expect(response.status).to.eql(200);
      expect(response.body).to.be.an('object');
      const searchResult = await esTestIndexTool.search('action:test.index-record', reference);
      // @ts-expect-error doesn't handle total: number
      expect(searchResult.body.hits.total.value).to.eql(1);
      const indexedRecord = searchResult.body.hits.hits[0];
      expect(indexedRecord._source).to.eql({
        params: {
          reference,
          index: ES_TEST_INDEX_NAME,
          message: 'Testing 123',
        },
        config: {
          unencrypted: `This value shouldn't get encrypted`,
        },
        secrets: {
          encrypted: 'This value should be encrypted',
        },
        reference,
        source: 'action:test.index-record',
      });

      await validateEventLog({
        spaceId: Spaces.space1.id,
        actionId: createdAction.id,
        actionTypeId: 'test.index-record',
        outcome: 'success',
        message: `action executed: test.index-record:${createdAction.id}: My action`,
        startMessage: `action started: test.index-record:${createdAction.id}: My action`,
      });
    });

    it('should handle failed executions', async () => {
      const { body: createdAction } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'failing action',
          connector_type_id: 'test.failing',
        })
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdAction.id, 'action', 'actions');

      const reference = `actions-failure-1:${Spaces.space1.id}`;
      const response = await supertest
        .post(
          `${getUrlPrefix(Spaces.space1.id)}/api/actions/connector/${createdAction.id}/_execute`
        )
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            reference,
            index: ES_TEST_INDEX_NAME,
          },
        });

      expect(response.status).to.eql(200);
      expect(response.body).to.eql({
        connector_id: createdAction.id,
        status: 'error',
        message: 'an error occurred while running the action executor',
        service_message: `expected failure for ${ES_TEST_INDEX_NAME} ${reference}`,
        retry: false,
      });

      await validateEventLog({
        spaceId: Spaces.space1.id,
        actionId: createdAction.id,
        actionTypeId: 'test.failing',
        outcome: 'failure',
        message: `action execution failure: test.failing:${createdAction.id}: failing action`,
        errorMessage: `an error occurred while running the action executor: expected failure for .kibana-alerting-test-data actions-failure-1:space1`,
      });
    });

    it(`shouldn't execute an action from another space`, async () => {
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

      const reference = `actions-execute-2:${Spaces.space1.id}`;
      await supertest
        .post(`${getUrlPrefix(Spaces.other.id)}/api/actions/action/${createdAction.id}/_execute`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            reference,
            index: ES_TEST_INDEX_NAME,
            message: 'Testing 123',
          },
        })
        .expect(404, {
          statusCode: 404,
          error: 'Not Found',
          message: `Saved object [action/${createdAction.id}] not found`,
        });
    });

    it('should handle execute request appropriately and have proper callCluster and savedObjectsClient authorization', async () => {
      const reference = `actions-execute-3:${Spaces.space1.id}`;
      const { body: createdAction } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'My action',
          connector_type_id: 'test.authorization',
        })
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdAction.id, 'action', 'actions');

      const response = await supertest
        .post(
          `${getUrlPrefix(Spaces.space1.id)}/api/actions/connector/${createdAction.id}/_execute`
        )
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            callClusterAuthorizationIndex: authorizationIndex,
            savedObjectsClientType: 'dashboard',
            savedObjectsClientId: '1',
            index: ES_TEST_INDEX_NAME,
            reference,
          },
        });

      expect(response.status).to.eql(200);
      const searchResult = await esTestIndexTool.search('action:test.authorization', reference);
      // @ts-expect-error doesn't handle total: number
      expect(searchResult.body.hits.total.value).to.eql(1);
      const indexedRecord = searchResult.body.hits.hits[0];
      // @ts-expect-error _source is not typed
      expect(indexedRecord._source.state).to.eql({
        callClusterSuccess: true,
        callScopedClusterSuccess: true,
        savedObjectsClientSuccess: false,
        savedObjectsClientError: {
          // @ts-expect-error _source is not typed
          ...indexedRecord._source.state.savedObjectsClientError,
          output: {
            // @ts-expect-error _source is not typed
            ...indexedRecord._source.state.savedObjectsClientError.output,
            statusCode: 404,
          },
        },
      });
    });

    it('should notify feature usage when executing a gold action type', async () => {
      const { body: createdAction } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'Noop action type',
          connector_type_id: 'test.noop',
          secrets: {},
          config: {},
        })
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdAction.id, 'action', 'actions');

      const executionStart = new Date();
      await supertest
        .post(
          `${getUrlPrefix(Spaces.space1.id)}/api/actions/connector/${createdAction.id}/_execute`
        )
        .set('kbn-xsrf', 'foo')
        .send({
          params: {},
        })
        .expect(200);

      const {
        body: { features },
      } = await supertest.get(`${getUrlPrefix(Spaces.space1.id)}/api/licensing/feature_usage`);
      expect(features).to.be.an(Array);
      const noopFeature = features.find(
        (feature: { name: string }) => feature.name === 'Connector: Test: Noop'
      );
      expect(noopFeature).to.be.ok();
      expect(noopFeature.last_used).to.be.a('string');
      expect(new Date(noopFeature.last_used).getTime()).to.be.greaterThan(executionStart.getTime());
    });

    describe('legacy', () => {
      it('should handle execute request appropriately', async () => {
        const { body: createdAction } = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/action`)
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'My action',
            actionTypeId: 'test.index-record',
            config: {
              unencrypted: `This value shouldn't get encrypted`,
            },
            secrets: {
              encrypted: 'This value should be encrypted',
            },
          })
          .expect(200);
        objectRemover.add(Spaces.space1.id, createdAction.id, 'action', 'actions');

        const reference = `actions-execute-1:${Spaces.space1.id}:${createdAction.id}`;
        const response = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/action/${createdAction.id}/_execute`)
          .set('kbn-xsrf', 'foo')
          .send({
            params: {
              reference,
              index: ES_TEST_INDEX_NAME,
              message: 'Testing 123',
            },
          });

        expect(response.status).to.eql(200);
      });

      it('should handle failed executions', async () => {
        const { body: createdAction } = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/action`)
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'failing action',
            actionTypeId: 'test.failing',
          })
          .expect(200);
        objectRemover.add(Spaces.space1.id, createdAction.id, 'action', 'actions');

        const reference = `actions-failure-1:${Spaces.space1.id}:${createdAction.id}`;
        const response = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/action/${createdAction.id}/_execute`)
          .set('kbn-xsrf', 'foo')
          .send({
            params: {
              reference,
              index: ES_TEST_INDEX_NAME,
            },
          });

        expect(response.status).to.eql(200);
        expect(response.body).to.eql({
          actionId: createdAction.id,
          status: 'error',
          message: 'an error occurred while running the action executor',
          serviceMessage: `expected failure for ${ES_TEST_INDEX_NAME} ${reference}`,
          retry: false,
        });
      });
    });
  });

  interface ValidateEventLogParams {
    spaceId: string;
    actionId: string;
    actionTypeId: string;
    outcome: string;
    message: string;
    errorMessage?: string;
    startMessage?: string;
  }

  async function validateEventLog(params: ValidateEventLogParams): Promise<void> {
    const { spaceId, actionId, actionTypeId, outcome, message, startMessage, errorMessage } =
      params;

    const events: IValidatedEvent[] = await retry.try(async () => {
      return await getEventLog({
        getService,
        spaceId,
        type: 'action',
        id: actionId,
        provider: 'actions',
        actions: new Map([
          ['execute-start', { equal: 1 }],
          ['execute', { equal: 1 }],
        ]),
      });
    });

    const startExecuteEvent = events[0];
    const executeEvent = events[1];

    const duration = executeEvent?.event?.duration;
    const executeEventStart = Date.parse(executeEvent?.event?.start || 'undefined');
    const startExecuteEventStart = Date.parse(startExecuteEvent?.event?.start || 'undefined');
    const executeEventEnd = Date.parse(executeEvent?.event?.end || 'undefined');
    const dateNow = Date.now();

    expect(typeof duration).to.be('number');
    expect(executeEventStart).to.be.ok();
    expect(startExecuteEventStart).to.equal(executeEventStart);
    expect(executeEventEnd).to.be.ok();

    const durationDiff = Math.abs(
      Math.round(duration! / NANOS_IN_MILLIS) - (executeEventEnd - executeEventStart)
    );

    // account for rounding errors
    expect(durationDiff < 1).to.equal(true);
    expect(executeEventStart <= executeEventEnd).to.equal(true);
    expect(executeEventEnd <= dateNow).to.equal(true);

    expect(executeEvent?.event?.outcome).to.equal(outcome);

    expect(executeEvent?.kibana?.saved_objects).to.eql([
      {
        rel: 'primary',
        type: 'action',
        id: actionId,
        namespace: 'space1',
        type_id: actionTypeId,
      },
    ]);
    expect(startExecuteEvent?.kibana?.saved_objects).to.eql(executeEvent?.kibana?.saved_objects);

    expect(executeEvent?.message).to.eql(message);
    if (startMessage) {
      expect(startExecuteEvent?.message).to.eql(startMessage);
    }

    expect(executeEvent?.kibana?.task).to.eql(undefined);

    if (errorMessage) {
      expect(executeEvent?.error?.message).to.eql(errorMessage);
    }
  }
}
