/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { Spaces } from '../../scenarios';
import {
  ESTestIndexTool,
  ES_TEST_INDEX_NAME,
  getUrlPrefix,
  ObjectRemover,
  getEventLog,
} from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { IValidatedEvent } from '../../../../../plugins/event_log/server';

const NANOS_IN_MILLIS = 1000 * 1000;

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('legacyEs');
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

      const reference = `actions-execute-1:${Spaces.space1.id}`;
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
      expect(response.body).to.be.an('object');
      const searchResult = await esTestIndexTool.search('action:test.index-record', reference);
      expect(searchResult.hits.total.value).to.eql(1);
      const indexedRecord = searchResult.hits.hits[0];
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
        outcome: 'success',
        message: `action executed: test.index-record:${createdAction.id}: My action`,
      });
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

      const reference = `actions-failure-1:${Spaces.space1.id}`;
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

      await validateEventLog({
        spaceId: Spaces.space1.id,
        actionId: createdAction.id,
        outcome: 'failure',
        message: `action execution failure: test.failing:${createdAction.id}: failing action`,
        errorMessage: `an error occurred while running the action executor: expected failure for .kibana-alerting-test-data actions-failure-1:space1`,
      });
    });

    it(`shouldn't execute an action from another space`, async () => {
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
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/action`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'My action',
          actionTypeId: 'test.authorization',
        })
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdAction.id, 'action', 'actions');

      const response = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/action/${createdAction.id}/_execute`)
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
      expect(searchResult.hits.total.value).to.eql(1);
      const indexedRecord = searchResult.hits.hits[0];
      expect(indexedRecord._source.state).to.eql({
        callClusterSuccess: true,
        callScopedClusterSuccess: true,
        savedObjectsClientSuccess: false,
        savedObjectsClientError: {
          ...indexedRecord._source.state.savedObjectsClientError,
          output: {
            ...indexedRecord._source.state.savedObjectsClientError.output,
            statusCode: 404,
          },
        },
      });
    });
  });

  interface ValidateEventLogParams {
    spaceId: string;
    actionId: string;
    outcome: string;
    message: string;
    errorMessage?: string;
  }

  async function validateEventLog(params: ValidateEventLogParams): Promise<void> {
    const { spaceId, actionId, outcome, message, errorMessage } = params;

    const events: IValidatedEvent[] = await retry.try(async () => {
      return await getEventLog({
        getService,
        spaceId,
        type: 'action',
        id: actionId,
        provider: 'actions',
        actions: ['execute'],
      });
    });

    expect(events.length).to.equal(1);

    const event = events[0];

    const duration = event?.event?.duration;
    const eventStart = Date.parse(event?.event?.start || 'undefined');
    const eventEnd = Date.parse(event?.event?.end || 'undefined');
    const dateNow = Date.now();

    expect(typeof duration).to.be('number');
    expect(eventStart).to.be.ok();
    expect(eventEnd).to.be.ok();

    const durationDiff = Math.abs(
      Math.round(duration! / NANOS_IN_MILLIS) - (eventEnd - eventStart)
    );

    // account for rounding errors
    expect(durationDiff < 1).to.equal(true);
    expect(eventStart <= eventEnd).to.equal(true);
    expect(eventEnd <= dateNow).to.equal(true);

    expect(event?.event?.outcome).to.equal(outcome);

    expect(event?.kibana?.saved_objects).to.eql([
      {
        rel: 'primary',
        type: 'action',
        id: actionId,
        namespace: 'space1',
      },
    ]);

    expect(event?.message).to.eql(message);

    if (errorMessage) {
      expect(event?.error?.message).to.eql(errorMessage);
    }
  }
}
