/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import {
  EventsIndexCreateError,
  createEventsIndex,
  getEventsIndexSettings,
} from './analytics_events_index';

const esError = (statusCode: number, type: string, reason?: string): Error =>
  Object.assign(new Error(type), { statusCode, body: { error: { type, reason } } });

describe('getEventsIndexSettings', () => {
  it('asks for columnar mode sorted newest first', () => {
    expect(getEventsIndexSettings()).toEqual({
      mode: 'columnar',
      sort: { field: ['@timestamp'], order: ['desc'] },
    });
  });
});

describe('createEventsIndex', () => {
  let client: ReturnType<typeof elasticsearchServiceMock.createScopedClusterClient>;

  beforeEach(() => {
    client = elasticsearchServiceMock.createScopedClusterClient();
  });

  it('creates a columnar index with a time field as the caller', async () => {
    client.asCurrentUser.indices.create.mockResponse({
      acknowledged: true,
      shards_acknowledged: true,
      index: 'events',
    });

    await expect(createEventsIndex({ client, name: 'events' })).resolves.toEqual({
      index: 'events',
    });

    // The same request serves stateful and serverless: it names no shard or replica setting.
    expect(client.asCurrentUser.indices.create).toHaveBeenCalledWith({
      index: 'events',
      settings: {
        index: { mode: 'columnar', sort: { field: ['@timestamp'], order: ['desc'] } },
      },
      mappings: { properties: { '@timestamp': { type: 'date' } } },
    });
    expect(client.asInternalUser.indices.create).not.toHaveBeenCalled();
  });

  it('reports a conflict when the index exists', async () => {
    client.asCurrentUser.indices.create.mockRejectedValue(
      esError(400, 'resource_already_exists_exception')
    );

    const failure = createEventsIndex({ client, name: 'events' });

    await expect(failure).rejects.toBeInstanceOf(EventsIndexCreateError);
    await expect(failure).rejects.toMatchObject({
      statusCode: 409,
      message: 'An index named events already exists',
    });
  });

  it('reports why Elasticsearch does not take the name', async () => {
    client.asCurrentUser.indices.create.mockRejectedValue(
      esError(
        400,
        'invalid_index_name_exception',
        'Invalid index name [events], already exists as alias'
      )
    );

    await expect(createEventsIndex({ client, name: 'events' })).rejects.toMatchObject({
      statusCode: 400,
      message: 'Invalid index name [events], already exists as alias',
    });
  });

  it.each([
    ['a missing privilege', esError(403, 'security_exception')],
    ['settings Elasticsearch does not know', esError(400, 'illegal_argument_exception')],
  ])('throws what Elasticsearch answers for %s', async (_, error) => {
    client.asCurrentUser.indices.create.mockRejectedValue(error);

    await expect(createEventsIndex({ client, name: 'events' })).rejects.toBe(error);
  });
});
