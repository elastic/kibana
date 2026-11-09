/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { BadRequestError } from '@kbn/securitysolution-es-utils';
import type { ExceptionListItemEntryArray } from '@kbn/securitysolution-exceptions-common/api';

import { getExceptionListItemSchemaMock } from '../../../common/schemas/response/exception_list_item_schema.mock';
import {
  getDetectionsExceptionListSchemaMock,
  getExceptionListSchemaMock,
  getTrustedAppsListSchemaMock,
} from '../../../common/schemas/response/exception_list_schema.mock';

import { createExceptionListItem } from './create_exception_list_item';
import { getExceptionList } from './get_exception_list';
import { getExceptionListItem } from './get_exception_list_item';
import { updateExceptionListItem } from './update_exception_list_item';
import { updateOverwriteExceptionListItem } from './update_overwrite_exception_list_item';

jest.mock('./get_exception_list');
jest.mock('./get_exception_list_item');

const esqlEntries: ExceptionListItemEntryArray = [
  {
    column_type: 'keyword',
    field: 'target_host',
    operator: 'included',
    type: 'match',
    value: 'dc-01',
  },
  {
    column_type: 'ip',
    field: 'src_ip',
    operator: 'included',
    type: 'match_any',
    value: ['10.0.0.1', '10.0.0.0/24'],
  },
];

const legacyEntries: ExceptionListItemEntryArray = [
  { field: 'host.name', operator: 'included', type: 'match', value: 'dc-01' },
];

const savedObject = (
  attributes: Record<string, unknown>
): SavedObject<Record<string, unknown>> => ({
  attributes: {
    comments: [],
    created_at: '2026-10-01T00:00:00.000Z',
    created_by: 'elastic',
    description: 'description',
    entries: legacyEntries,
    item_id: 'item-1',
    list_id: 'list-1',
    list_type: 'item',
    name: 'name',
    os_types: [],
    tags: [],
    tie_breaker_id: 'tie-breaker',
    type: 'simple',
    updated_by: 'elastic',
    ...attributes,
  },
  id: 'so-id-1',
  references: [],
  type: 'exception-list',
  updated_at: '2026-10-01T00:00:00.000Z',
  version: 'WzEsMV0=',
});

type CreateOptions = Omit<Parameters<typeof createExceptionListItem>[0], 'savedObjectsClient'>;
type OverwriteOptions = Omit<
  Parameters<typeof updateOverwriteExceptionListItem>[0],
  'savedObjectsClient'
>;
type PatchOptions = Omit<Parameters<typeof updateExceptionListItem>[0], 'savedObjectsClient'>;

const createOptions = (overrides: Partial<CreateOptions> = {}): CreateOptions => ({
  comments: [],
  description: 'description',
  entries: legacyEntries,
  expireTime: undefined,
  itemId: 'item-1',
  listId: 'list-1',
  meta: undefined,
  name: 'name',
  namespaceType: 'single' as const,
  osTypes: [],
  tags: [],
  type: 'simple' as const,
  user: 'elastic',
  ...overrides,
});

describe('exception items and what they apply to', () => {
  let savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;

  beforeEach(() => {
    jest.resetAllMocks();
    savedObjectsClient = savedObjectsClientMock.create();
    (getExceptionList as jest.Mock).mockResolvedValue(getDetectionsExceptionListSchemaMock());
  });

  describe('createExceptionListItem', () => {
    it('creates an item that does not say what it applies to, as before, without reading its list', async () => {
      savedObjectsClient.create.mockResolvedValue(savedObject({}));

      const item = await createExceptionListItem({
        ...createOptions(),
        savedObjectsClient,
      });

      expect(getExceptionList).not.toHaveBeenCalled();
      expect(savedObjectsClient.create).toHaveBeenCalledWith(
        'exception-list',
        expect.objectContaining({
          applies_to: undefined,
          entries: legacyEntries,
          list_type: 'item',
        })
      );
      expect(item).not.toHaveProperty('applies_to');
    });

    it('creates an item that applies to the source documents', async () => {
      savedObjectsClient.create.mockResolvedValue(savedObject({ applies_to: 'source_documents' }));

      const item = await createExceptionListItem({
        ...createOptions({ appliesTo: 'source_documents' }),
        savedObjectsClient,
      });

      expect(savedObjectsClient.create).toHaveBeenCalledWith(
        'exception-list',
        expect.objectContaining({ applies_to: 'source_documents' })
      );
      expect(item.applies_to).toBe('source_documents');
    });

    it.each(['detection', 'rule_default'] as const)(
      'creates an item that applies to the ES|QL output columns in a %s list',
      async (listType) => {
        (getExceptionList as jest.Mock).mockResolvedValue({
          ...getExceptionListSchemaMock(),
          type: listType,
        });
        savedObjectsClient.create.mockResolvedValue(
          savedObject({ applies_to: 'esql_output_columns', entries: esqlEntries })
        );

        const item = await createExceptionListItem({
          ...createOptions({
            appliesTo: 'esql_output_columns',
            entries: esqlEntries,
          }),
          savedObjectsClient,
        });

        expect(getExceptionList).toHaveBeenCalledWith(
          expect.objectContaining({ listId: 'list-1', namespaceType: 'single' })
        );
        expect(savedObjectsClient.create).toHaveBeenCalledWith(
          'exception-list',
          expect.objectContaining({ applies_to: 'esql_output_columns', entries: esqlEntries })
        );
        expect(item.applies_to).toBe('esql_output_columns');
        expect(item.entries).toEqual(esqlEntries);
      }
    );

    it('rejects an item that applies to the ES|QL output columns in a list of an Endpoint artifact', async () => {
      (getExceptionList as jest.Mock).mockResolvedValue(getTrustedAppsListSchemaMock());

      await expect(
        createExceptionListItem({
          ...createOptions({
            appliesTo: 'esql_output_columns',
            entries: esqlEntries,
          }),
          savedObjectsClient,
        })
      ).rejects.toThrow('can only be in a detection or rule_default list');
      expect(savedObjectsClient.create).not.toHaveBeenCalled();
    });

    it('rejects an entry that has a column_type in an item that applies to the source documents', async () => {
      await expect(
        createExceptionListItem({
          ...createOptions({ entries: esqlEntries }),
          savedObjectsClient,
        })
      ).rejects.toThrow('column_type can only be set on the entries of an item that applies to');
      expect(savedObjectsClient.create).not.toHaveBeenCalled();
    });

    it('rejects a value that does not fit its column_type, and an operation that the type does not support', async () => {
      const entries: ExceptionListItemEntryArray = [
        { column_type: 'ip', field: 'src_ip', operator: 'included', type: 'match', value: 'bogus' },
        {
          column_type: 'long',
          field: 'count',
          operator: 'included',
          type: 'wildcard',
          value: '1*',
        },
        { column_type: 'double', field: 'ratio', operator: 'included', type: 'match', value: '1' },
        { field: 'plain', operator: 'included', type: 'match', value: 'x' },
      ];

      const create = createExceptionListItem({
        ...createOptions({
          appliesTo: 'esql_output_columns',
          entries,
        }),
        savedObjectsClient,
      });

      await expect(create).rejects.toThrow('value "bogus" is not valid for a column of type ip');
      await expect(create).rejects.toThrow(
        'of type wildcard is not supported on a column of type long'
      );
      await expect(create).rejects.toThrow(
        'of type match is not supported on a column of type double'
      );
      await expect(create).rejects.toThrow('the entry on the field "plain" needs a column_type');
      expect(savedObjectsClient.create).not.toHaveBeenCalled();
    });

    it('rejects an item with os_types, a value list and a nested entry', async () => {
      const create = createExceptionListItem({
        ...createOptions({
          appliesTo: 'esql_output_columns',
          entries: [
            { field: 'ip', list: { id: 'l', type: 'ip' }, operator: 'included', type: 'list' },
            {
              entries: [{ field: 'name', operator: 'included', type: 'match', value: 'x' }],
              field: 'process',
              type: 'nested',
            },
          ],
          osTypes: ['linux'],
        }),
        savedObjectsClient,
      });

      await expect(create).rejects.toThrow('cannot have os_types');
      await expect(create).rejects.toThrow('has the type "list"');
      await expect(create).rejects.toThrow('has the type "nested"');
    });
  });

  describe('updateOverwriteExceptionListItem', () => {
    const updateOptions = (overrides: Partial<OverwriteOptions> = {}): OverwriteOptions => ({
      _version: undefined,
      comments: [],
      description: 'description',
      entries: legacyEntries,
      expireTime: undefined,
      id: undefined,
      itemId: 'item-1',
      meta: undefined,
      name: 'name',
      namespaceType: 'single' as const,
      osTypes: [],
      tags: [],
      type: 'simple' as const,
      user: 'elastic',
      ...overrides,
    });

    it('updates an item that does not say what it applies to, as before', async () => {
      (getExceptionListItem as jest.Mock).mockResolvedValue(getExceptionListItemSchemaMock());
      savedObjectsClient.create.mockResolvedValue(savedObject({}));

      const item = await updateOverwriteExceptionListItem({
        ...updateOptions(),
        savedObjectsClient,
      });

      expect(getExceptionList).not.toHaveBeenCalled();
      expect(savedObjectsClient.create).toHaveBeenCalledWith(
        'exception-list',
        expect.objectContaining({ applies_to: undefined }),
        expect.objectContaining({ overwrite: true })
      );
      expect(item).not.toHaveProperty('applies_to');
    });

    it('updates an item that applies to the ES|QL output columns and keeps what it applies to', async () => {
      (getExceptionListItem as jest.Mock).mockResolvedValue(
        getExceptionListItemSchemaMock({
          applies_to: 'esql_output_columns',
          entries: esqlEntries,
          list_id: 'list-1',
        })
      );
      savedObjectsClient.create.mockResolvedValue(
        savedObject({ applies_to: 'esql_output_columns', entries: esqlEntries })
      );

      const item = await updateOverwriteExceptionListItem({
        ...updateOptions({
          appliesTo: 'esql_output_columns',
          entries: esqlEntries,
        }),
        savedObjectsClient,
      });

      expect(savedObjectsClient.create).toHaveBeenCalledWith(
        'exception-list',
        expect.objectContaining({ applies_to: 'esql_output_columns', entries: esqlEntries }),
        expect.anything()
      );
      expect(item?.applies_to).toBe('esql_output_columns');
    });

    it('rejects an update that does not say what an item on the ES|QL output columns applies to, as a client that does not know applies_to would send', async () => {
      (getExceptionListItem as jest.Mock).mockResolvedValue(
        getExceptionListItemSchemaMock({ applies_to: 'esql_output_columns', entries: esqlEntries })
      );

      const update = updateOverwriteExceptionListItem({
        ...updateOptions(),
        savedObjectsClient,
      });

      await expect(update).rejects.toThrow(BadRequestError);
      await expect(update).rejects.toThrow(
        'it applies to "esql_output_columns" and cannot change to "source_documents"'
      );
      expect(savedObjectsClient.create).not.toHaveBeenCalled();
    });

    it('rejects an update that turns an item on the source documents into one on the ES|QL output columns', async () => {
      (getExceptionListItem as jest.Mock).mockResolvedValue(getExceptionListItemSchemaMock());

      await expect(
        updateOverwriteExceptionListItem({
          ...updateOptions({
            appliesTo: 'esql_output_columns',
            entries: esqlEntries,
          }),
          savedObjectsClient,
        })
      ).rejects.toThrow(
        'it applies to "source_documents" and cannot change to "esql_output_columns"'
      );
      expect(savedObjectsClient.create).not.toHaveBeenCalled();
    });

    it('accepts an update that says source_documents for an item that does not say what it applies to', async () => {
      (getExceptionListItem as jest.Mock).mockResolvedValue(getExceptionListItemSchemaMock());
      savedObjectsClient.create.mockResolvedValue(savedObject({ applies_to: 'source_documents' }));

      await expect(
        updateOverwriteExceptionListItem({
          ...updateOptions({ appliesTo: 'source_documents' }),
          savedObjectsClient,
        })
      ).resolves.toBeDefined();
    });

    it('validates the new entries of an item on the ES|QL output columns', async () => {
      (getExceptionListItem as jest.Mock).mockResolvedValue(
        getExceptionListItemSchemaMock({ applies_to: 'esql_output_columns', entries: esqlEntries })
      );

      await expect(
        updateOverwriteExceptionListItem({
          ...updateOptions({
            appliesTo: 'esql_output_columns',
            entries: [
              {
                column_type: 'ip',
                field: 'src_ip',
                operator: 'included',
                type: 'match',
                value: 'bogus',
              },
            ],
          }),
          savedObjectsClient,
        })
      ).rejects.toThrow('value "bogus" is not valid for a column of type ip');
    });
  });

  describe('updateExceptionListItem', () => {
    const patchOptions = (overrides: Partial<PatchOptions> = {}): PatchOptions => ({
      _version: undefined,
      comments: [],
      description: undefined,
      entries: legacyEntries,
      expireTime: undefined,
      id: undefined,
      itemId: 'item-1',
      meta: undefined,
      name: undefined,
      namespaceType: 'single' as const,
      osTypes: [],
      tags: undefined,
      type: undefined,
      user: 'elastic',
      ...overrides,
    });

    it('updates an item that does not say what it applies to, as before', async () => {
      (getExceptionListItem as jest.Mock).mockResolvedValue(getExceptionListItemSchemaMock());
      savedObjectsClient.update.mockResolvedValue(savedObject({}) as never);

      await expect(
        updateExceptionListItem({ ...patchOptions(), savedObjectsClient })
      ).resolves.toBeDefined();
      expect(getExceptionList).not.toHaveBeenCalled();
    });

    it('keeps what an item applies to when the update does not say it, and validates the entries for it', async () => {
      (getExceptionListItem as jest.Mock).mockResolvedValue(
        getExceptionListItemSchemaMock({ applies_to: 'esql_output_columns', entries: esqlEntries })
      );
      savedObjectsClient.update.mockResolvedValue(
        savedObject({ applies_to: 'esql_output_columns', entries: esqlEntries }) as never
      );

      await expect(
        updateExceptionListItem({
          ...patchOptions({ entries: esqlEntries }),
          savedObjectsClient,
        })
      ).resolves.toEqual(expect.objectContaining({ applies_to: 'esql_output_columns' }));

      await expect(
        updateExceptionListItem({
          ...patchOptions({ entries: legacyEntries }),
          savedObjectsClient,
        })
      ).rejects.toThrow('the entry on the field "host.name" needs a column_type');
    });

    it('rejects a change of what an item applies to', async () => {
      (getExceptionListItem as jest.Mock).mockResolvedValue(
        getExceptionListItemSchemaMock({ applies_to: 'esql_output_columns', entries: esqlEntries })
      );

      await expect(
        updateExceptionListItem({
          ...patchOptions({ appliesTo: 'source_documents', entries: esqlEntries }),
          savedObjectsClient,
        })
      ).rejects.toThrow('cannot change to "source_documents"');
      expect(savedObjectsClient.update).not.toHaveBeenCalled();
    });
  });
});
