/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { NightshiftSource } from '@kbn/nightshift-shared';
import { createSourceChangeEmitter, type SourceChangeEvent } from './source_change_emitter';

const source: NightshiftSource = {
  id: 'source-1',
  title: 'nginx errors',
  tags: [],
  esql: 'FROM logs-nginx-*',
  type: 'logs',
  slug: 'nginx-errors',
  view_name: '$.nightshift.sources.default.nginx-errors',
  enabled: true,
  created_by: 'marco',
  created_at: '2026-09-01T00:00:00.000Z',
  updated_at: '2026-09-01T00:00:00.000Z',
  esql_updated_at: '2026-09-01T00:00:00.000Z',
};

const deletedEvent: SourceChangeEvent = {
  type: 'deleted',
  source,
  request: httpServerMock.createKibanaRequest(),
};

describe('createSourceChangeEmitter', () => {
  it('awaits every listener with the event', async () => {
    const emitter = createSourceChangeEmitter(loggingSystemMock.createLogger());
    const handled: string[] = [];
    emitter.subscribe(async (event) => {
      await Promise.resolve();
      handled.push(`first:${event.type}`);
    });
    emitter.subscribe(async (event) => {
      handled.push(`second:${event.type}`);
    });

    await emitter.emit(deletedEvent);

    expect(handled.sort()).toEqual(['first:deleted', 'second:deleted']);
  });

  it('logs a failing listener without throwing or skipping the others', async () => {
    const logger = loggingSystemMock.createLogger();
    const emitter = createSourceChangeEmitter(logger);
    const healthy = jest.fn().mockResolvedValue(undefined);
    emitter.subscribe(jest.fn().mockRejectedValue(new Error('rules unavailable')));
    emitter.subscribe(healthy);

    await expect(emitter.emit(deletedEvent)).resolves.toBeUndefined();

    expect(healthy).toHaveBeenCalledWith(deletedEvent);
    expect(logger.error).toHaveBeenCalledWith(
      'A listener failed to handle the deleted event of source source-1: Error: rules unavailable'
    );
  });

  it('logs a listener that throws synchronously instead of rejecting the write', async () => {
    const logger = loggingSystemMock.createLogger();
    const emitter = createSourceChangeEmitter(logger);
    emitter.subscribe(() => {
      throw new Error('not async');
    });

    await expect(emitter.emit(deletedEvent)).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalledWith(
      'A listener failed to handle the deleted event of source source-1: Error: not async'
    );
  });

  it('stops calling a listener once it unsubscribes', async () => {
    const emitter = createSourceChangeEmitter(loggingSystemMock.createLogger());
    const listener = jest.fn().mockResolvedValue(undefined);
    const unsubscribe = emitter.subscribe(listener);

    unsubscribe();
    await emitter.emit(deletedEvent);

    expect(listener).not.toHaveBeenCalled();
  });
});
