/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as Rx from 'rxjs';
import { startWith, switchMap, take } from 'rxjs/operators';
import expect from '@kbn/expect/expect.js';
import { IEvent } from '../../../../plugins/event_log/server';
import { IEventLogger } from '../../../../plugins/event_log/server/types';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function({ getService }: FtrProviderContext) {
  const es = getService('legacyEs');
  const supertest = getService('supertest');
  const log = getService('log');
  const config = getService('config');

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
      const exists = await es.indices.exists({ index: '.kibana-event-log-8.0.0-000001' });
      expect(exists).to.be.eql(true);
      expect(configValue).to.be.eql(
        `--xpack.eventLog.indexEntries=${result.body.isIndexingEntries}`
      );
    });

    it('should allow to register provider actions and return all provider actions', async () => {
      await registerProviderActions('provider1', ['action1', 'action2']);

      const providerActions = await getProviderActions();
      expect(providerActions.body.actions).to.be.eql(['action1', 'action2']);
    });

    it('should allow to get event logger if it is registered', async () => {
      await registerProviderActions('provider2', ['action1', 'action2']);
      const eventLogger = await getEventLogger('provider2');
      expect(eventLogger.body.eventLogger).not.be(null);

      const eventLoggerNotExist = await getEventLogger('000');
      expect(eventLoggerNotExist.body.eventLogger).to.be(null);
    });

    it('should be able to check if provider actions is registered', async () => {
      await registerProviderActions('provider3', ['action1']);
      const result = await isProviderActionRegistered('provider3', 'action2');
      expect(result.body.isProviderActionRegistered).to.be.eql(false);

      const result1 = await isProviderActionRegistered('provider3', 'action1');
      expect(result1.body.isProviderActionRegistered).to.be.eql(true);
    });

    it('should allow write an event to index document if indexing entries is enabled', async () => {
      await registerProviderActions('provider4', ['action1', 'action2']);
      const eventLogger = (await getEventLogger('provider4')).body.eventLogger as IEventLogger;

      const eventId = '1';
      const event: IEvent = {
        event: { action: 'action1', provider: 'provider4' },
        kibana: { saved_objects: [{ type: 'action', id: eventId }] },
      };
      eventLogger.startTiming(event);
      setTimeout(() => log.debug('doing some action'), 500);
      eventLogger.stopTiming(event);
      eventLogger.logEvent(event);

      const uri = `/api/event_log/provider4/${eventId}/_find`;
      log.debug(`calling ${uri}`);
      const result = await supertest
        .get(uri)
        .set('kbn-xsrf', 'foo')
        .expect(200);
      expect(result.body.data).to.be.eql([event]);
    });

    it('should allow write an event to system logger if logging entries is enabled', async () => {
      await registerProviderActions('provider5', ['test']);
      const eventLogger = (await getEventLogger('provider5')).body.eventLogger as IEventLogger;

      const eventId = '1';
      const event: IEvent = {
        event: { action: 'action1', provider: 'provider5' },
        kibana: { saved_objects: [{ type: 'action', id: eventId }] },
      };
      eventLogger.startTiming(event);
      setTimeout(() => log.debug('doing some action'), 500);
      eventLogger.stopTiming(event);
      eventLogger.logEvent(event);

      const promise = log
        .getWritten$()
        .pipe(
          startWith(null),
          switchMap(() => Rx.timer(5000)),
          take(1)
        )
        .toPromise();
      expect(await promise).to.be.eql('');

      // (`${EVENT_LOGGED_PREFIX}${JSON.stringify(doc.body)}`);
    });
  });

  async function registerProviderActions(provider: string, actions: string[]) {
    log.debug(`/api/log_event_fixture/${provider}/setup`);
    return await supertest
      .post(`/api/log_event_fixture/${provider}/setup`)
      .set('kbn-xsrf', 'xxx')
      .send(actions)
      .expect(200);
  }

  async function isProviderActionRegistered(provider: string, action: string) {
    log.debug(`isProviderActionRegistered ${provider} for action ${action}`);
    return await supertest
      .get(`/api/log_event_fixture/${provider}/${action}/_isProviderActionRegistered`)
      .set('kbn-xsrf', 'foo')
      .expect(200);
  }

  async function getProviderActions() {
    log.debug(`getProviderActions`);
    return await supertest
      .get(`/api/log_event_fixture/getProviderActions`)
      .set('kbn-xsrf', 'foo')
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
}
