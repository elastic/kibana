/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import type { CreateExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';

import { bulkCreateExceptionListItems } from './bulk_create_exception_list_items';

const item = (
  overrides: Partial<CreateExceptionListItemSchema> = {}
): CreateExceptionListItemSchema => ({
  description: 'item',
  entries: [{ field: 'host.name', operator: 'included', type: 'match', value: 'dc-01' }],
  item_id: 'item-1',
  list_id: 'list-1',
  name: 'item',
  type: 'simple',
  ...overrides,
});

describe('bulkCreateExceptionListItems', () => {
  it('creates the items with what they apply to, and the items that do not say it without it', async () => {
    const savedObjectsClient = savedObjectsClientMock.create();
    savedObjectsClient.bulkCreate.mockResolvedValue({ saved_objects: [] });

    await bulkCreateExceptionListItems({
      items: [
        item(),
        item({
          applies_to: 'esql_output_columns',
          entries: [
            {
              column_type: 'keyword',
              field: 'target_host',
              operator: 'included',
              type: 'match',
              value: 'x',
            },
          ],
          item_id: 'item-2',
        }),
      ],
      savedObjectsClient,
      user: 'elastic',
    });

    const [[objects]] = savedObjectsClient.bulkCreate.mock.calls;
    expect(objects[0].attributes).toEqual(expect.objectContaining({ applies_to: undefined }));
    expect(objects[1].attributes).toEqual(
      expect.objectContaining({
        applies_to: 'esql_output_columns',
        entries: [expect.objectContaining({ column_type: 'keyword' })],
      })
    );
  });
});
