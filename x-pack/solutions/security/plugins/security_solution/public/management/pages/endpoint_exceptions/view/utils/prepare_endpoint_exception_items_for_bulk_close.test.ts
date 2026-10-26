/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntriesArray, ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';
import { getExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';

import { prepareEndpointExceptionItemsForBulkClose } from './prepare_endpoint_exception_items_for_bulk_close';

describe('prepareEndpointExceptionItemsForBulkClose', () => {
  const getEndpointExceptionListItem = (entries: EntriesArray): ExceptionListItemSchema =>
    getExceptionListItemSchemaMock({
      entries,
      list_id: ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id,
    });

  test('it should return no exceptions when passed in an empty array', () => {
    const payload: ExceptionListItemSchema[] = [];
    const result = prepareEndpointExceptionItemsForBulkClose(payload);
    expect(result).toEqual([]);
  });

  test('should not update non-endpoint exception list items', () => {
    const payload = [
      getExceptionListItemSchemaMock({
        entries: [
          {
            field: 'process.executable.caseless',
            operator: 'included',
            type: 'wildcard',
            value: 'C:\\Users\\*\\app.exe',
          },
        ],
      }),
    ];
    const result = prepareEndpointExceptionItemsForBulkClose(payload);
    expect(result).toEqual(payload);
    expect(result[0]).toBe(payload[0]);
  });

  test('should escape backslashes for endpoint wildcard entries', () => {
    const payload = [
      getEndpointExceptionListItem([
        {
          field: 'process.executable.caseless',
          operator: 'included',
          type: 'wildcard',
          value: 'C:\\Users\\*\\app.exe',
        },
      ]),
    ];
    const result = prepareEndpointExceptionItemsForBulkClose(payload);
    expect(result[0].entries[0]).toEqual({
      field: 'process.executable.caseless',
      operator: 'included',
      type: 'wildcard',
      value: 'C:\\\\Users\\\\*\\\\app.exe',
    });
    expect(payload[0].entries[0]).toEqual({
      field: 'process.executable.caseless',
      operator: 'included',
      type: 'wildcard',
      value: 'C:\\Users\\*\\app.exe',
    });
  });

  test('should preserve wildcard characters and excluded operators', () => {
    const payload = [
      getEndpointExceptionListItem([
        {
          field: 'file.path.caseless',
          operator: 'excluded',
          type: 'wildcard',
          value: 'C:\\Users\\?\\*.exe',
        },
      ]),
    ];
    const result = prepareEndpointExceptionItemsForBulkClose(payload);
    expect(result[0].entries[0]).toEqual({
      field: 'file.path.caseless',
      operator: 'excluded',
      type: 'wildcard',
      value: 'C:\\\\Users\\\\?\\\\*.exe',
    });
  });

  test('should leave non-wildcard entries unchanged', () => {
    const payload = [
      getEndpointExceptionListItem([
        {
          field: 'process.executable.caseless',
          operator: 'included',
          type: 'match',
          value: 'C:\\Windows\\explorer.exe',
        },
        {
          field: 'file.path.caseless',
          operator: 'included',
          type: 'match_any',
          value: ['C:\\Windows\\explorer.exe'],
        },
        {
          field: 'file.hash.sha256',
          operator: 'included',
          type: 'exists',
        },
      ]),
    ];
    const result = prepareEndpointExceptionItemsForBulkClose(payload);
    expect(result[0].entries).toEqual(payload[0].entries);
  });

  test('should escape every backslash in endpoint wildcard entries', () => {
    const payload = [
      getEndpointExceptionListItem([
        {
          field: 'file.path.caseless',
          operator: 'included',
          type: 'wildcard',
          value: 'C:\\\\server\\\\share',
        },
      ]),
    ];
    const result = prepareEndpointExceptionItemsForBulkClose(payload);
    expect(result[0].entries[0]).toEqual({
      field: 'file.path.caseless',
      operator: 'included',
      type: 'wildcard',
      value: 'C:\\\\\\\\server\\\\\\\\share',
    });
  });
});
