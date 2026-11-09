/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';

import { getExceptionListItemSchemaMock } from '../../common/schemas/response/exception_list_item_schema.mock';
import { bulkCreateExceptionListItems } from '../services/exception_lists/bulk_create_exception_list_items';
import { createEndpointList } from '../services/exception_lists/create_endpoint_list';
import { createExceptionList } from '../services/exception_lists/create_exception_list';
import { createExceptionListItem } from '../services/exception_lists/create_exception_list_item';
import { getExceptionList } from '../services/exception_lists/get_exception_list';
import { getExceptionListItem } from '../services/exception_lists/get_exception_list_item';
import { updateOverwriteExceptionListItem } from '../services/exception_lists/update_overwrite_exception_list_item';
import { sortExceptionItemsToUpdateOrCreate } from '../services/exception_lists/utils/import/sort_exception_items_to_create_update';
import { getImportExceptionsListItemSchemaDecodedMock } from '../../common/schemas/request/import_exceptions_schema.mock';
import { getDetectionsExceptionListSchemaMock } from '../../common/schemas/response/exception_list_schema.mock';

import { exceptionListSchemaV1, exceptionListSchemaV2 } from './model_versions';

jest.mock('../services/exception_lists/get_exception_list');
jest.mock('../services/exception_lists/get_exception_list_item');

/**
 * Saved objects validate what they create against the schema of the latest model version, and the schemas of the
 * model versions are written by hand. These tests validate what the services really write.
 */
const response: SavedObject<Record<string, unknown>> = {
  attributes: { list_id: 'list-1', list_type: 'list', name: 'name', type: 'detection' },
  id: 'so-id',
  references: [],
  type: 'exception-list',
};

const expectValid = (attributes: unknown): void => {
  expect(() => exceptionListSchemaV1.validate(attributes)).not.toThrow();
  expect(() => exceptionListSchemaV2.validate(attributes)).not.toThrow();
};

describe('what the services write to the exception list saved objects', () => {
  const savedObjectsClient = savedObjectsClientMock.create();

  beforeEach(() => {
    jest.resetAllMocks();
    savedObjectsClient.create.mockResolvedValue(response);
    savedObjectsClient.bulkCreate.mockResolvedValue({ saved_objects: [] });
    (getExceptionList as jest.Mock).mockResolvedValue(getDetectionsExceptionListSchemaMock());
  });

  it('writes a valid list, with the version number that a list has', async () => {
    await createExceptionList({
      description: 'description',
      immutable: false,
      listId: 'list-1',
      meta: undefined,
      name: 'name',
      namespaceType: 'single',
      osTypes: [],
      savedObjectsClient,
      tags: ['tag'],
      type: 'detection',
      user: 'elastic',
      version: 1,
    });

    const [[, attributes]] = savedObjectsClient.create.mock.calls;
    expect(attributes).toEqual(expect.objectContaining({ version: 1 }));
    expectValid(attributes);
  });

  it('writes a valid list of the Endpoint exceptions', async () => {
    await createEndpointList({ savedObjectsClient, user: 'elastic', version: 1 });

    expectValid(savedObjectsClient.create.mock.calls[0][1]);
  });

  it.each([
    ['an item that does not say what it applies to', undefined, undefined],
    [
      'an item that applies to the ES|QL output columns',
      'esql_output_columns' as const,
      [
        {
          column_type: 'ip' as const,
          field: 'src_ip',
          operator: 'included' as const,
          type: 'match_any' as const,
          value: ['10.0.0.1', '10.0.0.0/24'],
        },
      ],
    ],
  ])('writes a valid item for %s', async (_, appliesTo, entries) => {
    await createExceptionListItem({
      appliesTo,
      comments: [{ comment: 'a comment' }],
      description: 'description',
      entries: entries ?? [
        { field: 'host.name', operator: 'included', type: 'match', value: 'dc-01' },
      ],
      expireTime: '2027-01-01T00:00:00.000Z',
      itemId: 'item-1',
      listId: 'list-1',
      meta: { temporaryUuid: 'abc' },
      name: 'name',
      namespaceType: 'single',
      osTypes: [],
      savedObjectsClient,
      tags: [],
      type: 'simple',
      user: 'elastic',
    });

    expectValid(savedObjectsClient.create.mock.calls[0][1]);
  });

  it('writes a valid item when it overwrites one, with no version that is not a number', async () => {
    (getExceptionListItem as jest.Mock).mockResolvedValue(
      getExceptionListItemSchemaMock({ _version: 'WzEsMV0=' })
    );

    await updateOverwriteExceptionListItem({
      _version: 'WzEsMV0=',
      comments: [],
      description: 'description',
      entries: [{ field: 'host.name', operator: 'included', type: 'match', value: 'dc-01' }],
      expireTime: undefined,
      id: undefined,
      itemId: 'item-1',
      meta: undefined,
      name: 'name',
      namespaceType: 'single',
      osTypes: [],
      savedObjectsClient,
      tags: [],
      type: 'simple',
      user: 'elastic',
    });

    const [[, attributes]] = savedObjectsClient.create.mock.calls;
    expect(Number.isNaN((attributes as { version?: number }).version)).toBe(false);
    expectValid(attributes);
  });

  it('writes valid items when it creates many', async () => {
    await bulkCreateExceptionListItems({
      items: [
        {
          description: 'description',
          entries: [{ field: 'host.name', operator: 'included', type: 'match', value: 'x' }],
          item_id: 'item-1',
          list_id: 'list-1',
          name: 'name',
          type: 'simple',
        },
      ],
      savedObjectsClient,
      user: 'elastic',
    });

    for (const { attributes } of savedObjectsClient.bulkCreate.mock.calls[0][0]) {
      expectValid(attributes);
    }
  });

  it('writes valid items when it imports them', () => {
    const { itemsToCreate, itemsToUpdate } = sortExceptionItemsToUpdateOrCreate({
      existingItems: {
        'item-id-2': getExceptionListItemSchemaMock({
          id: 'existing',
          item_id: 'item-id-2',
          list_id: 'list-id-1',
        }),
      },
      existingLists: {
        'list-id-1': { ...getDetectionsExceptionListSchemaMock(), list_id: 'list-id-1' },
      },
      isOverwrite: true,
      items: [
        getImportExceptionsListItemSchemaDecodedMock('item-id-1', 'list-id-1'),
        getImportExceptionsListItemSchemaDecodedMock('item-id-2', 'list-id-1'),
      ],
      user: 'elastic',
    });

    expect(itemsToCreate.length + itemsToUpdate.length).toBe(2);
    for (const { attributes } of [...itemsToCreate, ...itemsToUpdate]) {
      expectValid(attributes);
    }
  });
});
