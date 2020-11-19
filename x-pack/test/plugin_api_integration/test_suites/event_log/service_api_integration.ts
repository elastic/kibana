/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import uuid from 'uuid';
import expect from '@kbn/expect/expect.js';
import { IEvent } from '../../../../plugins/event_log/server';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const es = getService('legacyEs');
  const supertest = getService('supertest');
  const log = getService('log');
  const config = getService('config');
  const retry = getService('retry');

  describe('Event Log service API', () => {
    it('should check if it is enabled', async () => {
      const configValue = config
        .get('kbnTestServer.serverArgs')
        .find((val: string) => val === '--xpack.eventLog.enabled=true');
      const result = await isEventLogServiceEnabled();
      expect(configValue).to.be.eql(`--xpack.eventLog.enabled=${result.body.isEnabled}`);
    });

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

      const providerActions = await getProviderActions('provider1');
      expect(providerActions.body.actions).to.be.eql(['action1', 'action2']);
    });

    it('should allow to get event logger event log service', async () => {
      const initResult = await isProviderActionRegistered('provider2', 'action1');

      if (!initResult.body.isProviderActionRegistered) {
        await registerProviderActions('provider2', ['action1', 'action2']);
      }
      const eventLogger = await getEventLogger('provider2');
      expect(eventLogger.body.eventLogger.initialProperties).to.be.eql({
        event: { provider: 'provider2' },
      });
    });

    it('should allow write an event to index document if indexing entries is enabled', async () => {
      const initResult = await isProviderActionRegistered('provider4', 'action1');

      if (!initResult.body.isProviderActionRegistered) {
        await registerProviderActions('provider4', ['action1', 'action2']);
      }

      const eventId = uuid.v4();
      const event: IEvent = {
        event: { action: 'action1', provider: 'provider4' },
        kibana: { saved_objects: [{ rel: 'primary', type: 'event_log_test', id: eventId }] },
      };
      await logTestEvent(eventId, event);

      await retry.try(async () => {
        const uri = `/api/event_log/event_log_test/${eventId}/_find`;
        log.debug(`calling ${uri}`);
        const result = await supertest.get(uri).set('kbn-xsrf', 'foo').expect(200);
        expect(result.body.data.length).to.be.eql(1);
      });
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

  async function getProviderActions(provider: string) {
    log.debug(`getProviderActions ${provider}`);
    return await supertest
      .get(`/api/log_event_fixture/${provider}/getProviderActions`)
      .set('kbn-xsrf', 'xxx')
      .expect(200);
  }

  async function getEventLogger(event: string) {
    log.debug(`isProviderActionRegistered for event ${event}`);
    return await supertest
      .get(`/api/log_event_fixture/getEventLogger/${event}`)
      .set('kbn-xsrf', 'foo')
      .expect(200);
  }

  async function isIndexingEntries() {
    log.debug(`isIndexingEntries`);
    return await supertest
      .get(`/api/log_event_fixture/isIndexingEntries`)
      .set('kbn-xsrf', 'foo')
      .expect(200);
  }

  async function isEventLogServiceEnabled() {
    log.debug(`isEventLogServiceEnabled`);
    return await supertest
      .get(`/api/log_event_fixture/isEventLogServiceEnabled`)
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

  async function logTestEvent(id: string, event: IEvent) {
    log.debug(`Logging Event for Saved Object ${id}`);
    return await supertest
      .post(`/api/log_event_fixture/${id}/_log`)
      .set('kbn-xsrf', 'foo')
      .send(event)
      .expect(200);
  }
}
