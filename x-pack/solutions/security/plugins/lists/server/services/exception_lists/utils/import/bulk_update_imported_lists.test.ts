/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsBulkUpdateObject, SavedObjectsClientContract } from '@kbn/core/server';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';

import { ExceptionListSoSchema } from '../../../../schemas/saved_objects/exceptions_list_so_schema';

import { bulkUpdateImportedLists } from './bulk_update_imported_lists';

describe('bulkUpdateImportedLists', () => {
  const sampleLists: Array<SavedObjectsBulkUpdateObject<ExceptionListSoSchema>> = [
    {
      attributes: {
        description: 'updated description',
        meta: undefined,
        name: 'updated list',
        tags: [],
        type: 'detection',
        updated_by: 'elastic',
      },
      id: '1234',
      type: 'exception-list',
    },
  ];
  let savedObjectsClient: jest.Mocked<SavedObjectsClientContract>;

  beforeEach(() => {
    savedObjectsClient = savedObjectsClientMock.create();
  });

  it('returns empty array if no lists to create', async () => {
    const response = await bulkUpdateImportedLists({
      listsToUpdate: [],
      savedObjectsClient,
    });

    expect(response).toEqual([]);
    expect(savedObjectsClient.bulkUpdate).not.toHaveBeenCalled();
  });

  it('returns formatted error responses', async () => {
    savedObjectsClient.bulkUpdate.mockResolvedValue({
      saved_objects: [
        {
          attributes: {},
          error: {
            error: 'Internal Server Error',
            message: 'Unexpected bulk response [400]',
            statusCode: 500,
          },
          id: '0dc73480-5664-11ec-af96-8349972169c7',
          references: [],
          type: 'exception-list',
        },
      ],
    });

    const response = await bulkUpdateImportedLists({
      listsToUpdate: sampleLists,
      savedObjectsClient,
    });

    expect(response).toEqual([
      {
        error: {
          message: 'Unexpected bulk response [400]',
          status_code: 500,
        },
        list_id: '(unknown list_id)',
      },
    ]);
    expect(savedObjectsClient.bulkUpdate).toHaveBeenCalled();
  });

  it('returns formatted success responses', async () => {
    savedObjectsClient.bulkUpdate.mockResolvedValue({
      saved_objects: [
        {
          attributes: {
            description: 'some description',
            name: 'Query with a rule id',
            tags: [],
            type: 'detection',
            updated_by: 'elastic',
          },
          id: '14aec120-5667-11ec-ae56-7ddc0e93145f',
          namespaces: ['default'],
          references: [],
          type: 'exception-list',
          updated_at: '2021-12-06T07:35:27.941Z',
          version: 'WzE0MTc5MiwxXQ==',
        },
      ],
    });

    const response = await bulkUpdateImportedLists({
      listsToUpdate: sampleLists,
      savedObjectsClient,
    });

    expect(response).toEqual([
      {
        id: '14aec120-5667-11ec-ae56-7ddc0e93145f',
        status_code: 200,
      },
    ]);
    expect(savedObjectsClient.bulkUpdate).toHaveBeenCalled();
  });
});
