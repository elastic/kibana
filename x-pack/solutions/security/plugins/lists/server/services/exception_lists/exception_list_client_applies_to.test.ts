/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import type { ExceptionListItemEntryArray } from '@kbn/securitysolution-exceptions-common/api';

import type { ExtensionPointStorageContextMock } from '../extension_points/extension_point_storage.mock';
import { createExtensionPointStorageMock } from '../extension_points/extension_point_storage.mock';

import { ExceptionListClient } from './exception_list_client';
import type { CreateExceptionListItemOptions } from './exception_list_client_types';
import { getCreateExceptionListItemOptionsMock } from './exception_list_client.mock';

const esqlEntries: ExceptionListItemEntryArray = [
  {
    column_type: 'keyword',
    field: 'target_host',
    operator: 'included',
    type: 'match',
    value: 'dc-01',
  },
  { column_type: 'double', field: 'score', operator: 'excluded', type: 'exists' },
];

const listSavedObject = {
  attributes: {
    created_at: '2026-10-01T00:00:00.000Z',
    created_by: 'elastic',
    description: 'list',
    immutable: false,
    list_id: 'list-1',
    list_type: 'list',
    name: 'list',
    os_types: [],
    tags: [],
    tie_breaker_id: 'tie-breaker',
    type: 'rule_default',
    updated_by: 'elastic',
    version: 1,
  },
  id: 'list-so-id',
  references: [],
  score: 1,
  type: 'exception-list',
  updated_at: '2026-10-01T00:00:00.000Z',
};

const itemSavedObject = (
  attributes: Record<string, unknown>
): SavedObject<Record<string, unknown>> => ({
  attributes: {
    comments: [],
    created_at: '2026-10-01T00:00:00.000Z',
    created_by: 'elastic',
    description: 'item',
    entries: [],
    item_id: 'item-1',
    list_id: 'list-1',
    list_type: 'item',
    name: 'item',
    os_types: [],
    tags: [],
    tie_breaker_id: 'tie-breaker',
    type: 'simple',
    updated_by: 'elastic',
    ...attributes,
  },
  id: 'item-so-id',
  references: [],
  type: 'exception-list',
  updated_at: '2026-10-01T00:00:00.000Z',
  version: 'WzEsMV0=',
});

interface ClientFixture {
  client: ExceptionListClient;
  extensionPointStorageContext: ExtensionPointStorageContextMock;
  savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;
}

describe('ExceptionListClient and the items that apply to the ES|QL output columns', () => {
  const buildClient = (): ClientFixture => {
    const savedObjectsClient = savedObjectsClientMock.create();
    savedObjectsClient.find.mockResolvedValue({
      page: 1,
      per_page: 1,
      saved_objects: [listSavedObject],
      total: 1,
    });
    savedObjectsClient.create.mockResolvedValue(
      itemSavedObject({ applies_to: 'esql_output_columns', entries: esqlEntries })
    );
    const extensionPointStorageContext = createExtensionPointStorageMock();
    const client = new ExceptionListClient({
      savedObjectsClient,
      serverExtensionsClient: extensionPointStorageContext.extensionPointStorage.getClient(),
      user: 'elastic',
    });
    return { client, extensionPointStorageContext, savedObjectsClient };
  };

  const esqlItem = (): CreateExceptionListItemOptions => ({
    ...getCreateExceptionListItemOptionsMock(),
    appliesTo: 'esql_output_columns' as const,
    entries: esqlEntries,
    listId: 'list-1',
    osTypes: [],
  });

  it('creates them', async () => {
    const { client, savedObjectsClient } = buildClient();

    const item = await client.createExceptionListItem(esqlItem());

    expect(item.applies_to).toBe('esql_output_columns');
    expect(savedObjectsClient.create).toHaveBeenCalledWith(
      'exception-list',
      expect.objectContaining({ applies_to: 'esql_output_columns', entries: esqlEntries })
    );
  });

  it('still creates the items that do not say what they apply to', async () => {
    const { client, savedObjectsClient } = buildClient();
    savedObjectsClient.create.mockResolvedValue(itemSavedObject({}));

    const item = await client.createExceptionListItem(getCreateExceptionListItemOptionsMock());

    expect(item).not.toHaveProperty('applies_to');
  });

  it('passes the item through the server extension points, whose validation accepts the new properties', async () => {
    const { client, extensionPointStorageContext } = buildClient();

    await client.createExceptionListItem(esqlItem());

    expect(extensionPointStorageContext.exceptionPreCreate.callback).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ appliesTo: 'esql_output_columns', entries: esqlEntries }),
      })
    );
  });
});
