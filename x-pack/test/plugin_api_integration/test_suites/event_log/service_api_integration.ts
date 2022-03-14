/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import uuid from 'uuid';
import expect from '@kbn/expect';
import { IEvent } from '../../../../plugins/event_log/server';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const es = getService('es');
  const supertest = getService('supertest');
  const log = getService('log');
  const config = getService('config');
  const retry = getService('retry');

  describe('Event Log service API', () => {
    it('should check if logging entries is enabled', async () => {
      const configValue = config
        .get('kbnTestServer.serverArgs')
        .find((val: string) => val === '--xpack.eventLog.logEntries=true');
      const result = await isEventLogServiceLoggingEntries();
      expect(configValue).to.be.eql(`--xpack.eventLog.logEntries=${result.body.isLoggingEntries}`);
    });

    it('should check if indexing entries is enabled', async () => {
      const configValue = config
        .get('kbnTestServer.serverArgs')
        .find((val: string) => val === '--xpack.eventLog.indexEntries=true');
      const result = await isIndexingEntries();
      const exists = await es.indices.exists({ index: '.kibana-event-log-*' });
      expect(exists).to.be.eql(true);
      expect(configValue).to.be.eql(
        `--xpack.eventLog.indexEntries=${result.body.isIndexingEntries}`
      );
    });

    it('should be able to check if provider actions is registered', async () => {
      const initResult = await isProviderActionRegistered('provider3', 'action1');

      if (!initResult.body.isProviderActionRegistered) {
        await registerProviderActions('provider3', ['action1']);
      }
      const result1 = await isProviderActionRegistered('provider3', 'action1');
      expect(result1.body.isProviderActionRegistered).to.be.eql(true);

      const result = await isProviderActionRegistered('provider3', 'action2');
      expect(result.body.isProviderActionRegistered).to.be.eql(false);
    });

    it('should return error message if provider is registered', async () => {
      const initResult = await isProviderActionRegistered('duplication', 'action1');

      if (!initResult.body.isProviderActionRegistered) {
        await registerProviderActions('duplication', ['action1', 'action2']);
      }

      const result = await registerProviderActions('duplication', ['action1', 'action2']);
      expect(result.badRequest).to.be.eql(true);
    });

    it('should allow to register provider actions and return all provider actions', async () => {
      const initResult = await isProviderActionRegistered('provider1', 'action1');

      if (!initResult.body.isProviderActionRegistered) {
        await registerProviderActions('provider1', ['action1', 'action2']);
      }

      const providerActions = await getRegisteredProviderActions('provider1');
      expect(providerActions.body.actions).to.be.eql(['action1', 'action2']);
    });

    it('should allow to log an event and then find it by saved object', async () => {
      const { provider, action } = await getTestProviderAction();
      const savedObject = getTestSavedObject();
      const event: IEvent = {
        event: { provider, action },
        kibana: { saved_objects: [savedObject] },
      };

      const indexedEvent = await logAndWaitUntilIndexed(event, savedObject.type, savedObject.id);

      expect(indexedEvent.event.provider).to.be.eql(event.event?.provider);
      expect(indexedEvent.event.action).to.be.eql(event.event?.action);
    });

    it('should respect event schema - properly index and preserve all the properties of an event', async () => {
      const { provider, action } = await getTestProviderAction();
      const savedObject = getTestSavedObject();
      const event: IEvent = {
        '@timestamp': '2042-03-25T11:53:24.911Z',
        message: 'some message',
        tags: ['some', 'tags'],
        event: {
          provider,
          action,
          category: ['some', 'categories'],
          code: '4242',
          created: '2042-03-25T11:53:24.911Z',
          dataset: `${provider}.dataset`,
          hash: '123456789012345678901234567890ABCD',
          id: '98506718-03ec-4d0a-a7bd-b8459a60a82d',
          ingested: '2042-03-25T11:53:24.911Z',
          kind: 'event',
          module: `${provider}.module`,
          original: 'Sep 19 08:26:10 host CEF:0&#124;Security&#124; worm successfully stopped',
          outcome: 'success',
          reason: 'Terminated an unexpected process',
          reference: 'https://system.example.com/event/#0001234',
          risk_score: 987.65,
          risk_score_norm: 42.5,
          sequence: 1234567890,
          severity: 20,
          timezone: 'Europe/Amsterdam',
          type: ['change', 'info'],
          url: 'https://mysystem.example.com/alert/5271dedb-f5b0-4218-87f0-4ac4870a38fe',
        },
        error: {
          code: '42000',
          id: 'f53be013-8a8c-4d39-b0f0-2781bb088a33',
          message: 'Unexpected error',
          stack_trace: `Error: Unexpected error
          at Context.<anonymous> (x-pack/test/plugin_api_integration/test_suites/event_log/service_api_integration.ts:160:13)
          at Object.apply (node_modules/@kbn/test/src/functional_test_runner/lib/mocha/wrap_function.js:73:16)
          at Object.apply (node_modules/@kbn/test/src/functional_test_runner/lib/mocha/wrap_function.js:73:16)`,
          type: 'Error',
        },
        log: {
          level: 'warning',
          logger: `${provider}.child-logger`,
        },
        rule: {
          author: ['Elastic', 'Security'],
          category: 'Attempted Information Leak',
          description: 'Block requests to public DNS over HTTPS / TLS protocols',
          id: '101',
          license: 'Apache 2.0',
          name: 'BLOCK_DNS_over_TLS',
          reference: 'https://en.wikipedia.org/wiki/DNS_over_TLS',
          ruleset: 'Standard_Protocol_Filters',
          uuid: '1fd3e1ad-1376-406f-ac63-df97db5d2fae',
          version: '1.1',
        },
        user: {
          name: 'elastic',
        },
        kibana: {
          saved_objects: [savedObject],
          space_ids: ['space id'],
          alert: {
            rule: {
              execution: {
                uuid: '1fef0e1a-25ba-11ec-9621-0242ac130002',
                status: 'succeeded',
                status_order: 10,
                metrics: {
                  total_indexing_duration_ms: 1000,
                  total_search_duration_ms: 2000,
                  execution_gap_duration_s: 3000,
                },
              },
            },
          },
          alerting: {
            instance_id: 'alert instance id',
            action_group_id: 'alert action group',
            action_subgroup: 'alert action subgroup',
            status: 'overall alert status, after alert execution',
          },
        },
      };

      const indexedEvent = await logAndWaitUntilIndexed(event, savedObject.type, savedObject.id);

      // Omit properties which are set by the event logger
      // NOTE: event.* properties are set by the `/api/log_event_fixture/${savedObjectId}/_log` route handler
      const propertiesToCheck = _.omit(indexedEvent, [
        'ecs',
        'event.start',
        'event.end',
        'event.duration',
        'kibana.server_uuid',
        'kibana.version',
      ]);

      expect(propertiesToCheck).to.be.eql(event);
    });
  });

  async function registerProviderActions(provider: string, actions: string[]) {
    log.debug(`registerProviderActions ${provider}`);
    return await supertest
      .post(`/api/log_event_fixture/${provider}/_registerProviderActions`)
      .set('kbn-xsrf', 'xxx')
      .send(actions);
  }

  async function isProviderActionRegistered(provider: string, action: string) {
    log.debug(`isProviderActionRegistered ${provider} for action ${action}`);
    return await supertest
      .get(`/api/log_event_fixture/${provider}/${action}/_isProviderActionRegistered`)
      .set('kbn-xsrf', 'foo')
      .expect(200);
  }

  async function getRegisteredProviderActions(provider: string) {
    log.debug(`getProviderActions ${provider}`);
    return await supertest
      .get(`/api/log_event_fixture/${provider}/getProviderActions`)
      .set('kbn-xsrf', 'xxx')
      .expect(200);
  }

  async function isIndexingEntries() {
    log.debug(`isIndexingEntries`);
    return await supertest
      .get(`/api/log_event_fixture/isIndexingEntries`)
      .set('kbn-xsrf', 'foo')
      .expect(200);
  }

  async function isEventLogServiceLoggingEntries() {
    log.debug(`isEventLogServiceLoggingEntries`);
    return await supertest
      .get(`/api/log_event_fixture/isEventLogServiceLoggingEntries`)
      .set('kbn-xsrf', 'foo')
      .expect(200);
  }

  async function getTestProviderAction() {
    const provider = `provider-${uuid.v4()}`;
    const action = `action-${uuid.v4()}`;

    const response = await isProviderActionRegistered(provider, action);
    if (!response.body.isProviderActionRegistered) {
      await registerProviderActions(provider, [action]);
    }

    return { provider, action };
  }

  function getTestSavedObject() {
    return { type: 'event_log_test', id: uuid.v4(), rel: 'primary' };
  }

  async function logEvent(event: IEvent, savedObjectId: string) {
    log.debug(`Logging Event for Saved Object ${savedObjectId}`);
    return await supertest
      .post(`/api/log_event_fixture/${savedObjectId}/_log`)
      .set('kbn-xsrf', 'foo')
      .send(event)
      .expect(200);
  }

  async function fetchEvents(savedObjectType: string, savedObjectId: string) {
    log.debug(`Fetching events of Saved Object ${savedObjectId}`);
    return await supertest
      .get(`/internal/event_log/${savedObjectType}/${savedObjectId}/_find`)
      .set('kbn-xsrf', 'foo')
      .expect(200);
  }

  // NOTE: It supports indexing only 1 event per test.
  async function logAndWaitUntilIndexed(
    event: IEvent,
    savedObjectType: string,
    savedObjectId: string
  ) {
    await logEvent(event, savedObjectId);

    const response = await retry.tryForTime(30000, async () => {
      const res = await fetchEvents(savedObjectType, savedObjectId);
      expect(res.body.data.length).to.be.eql(1);
      return res;
    });

    return response.body.data[0];
  }
}
