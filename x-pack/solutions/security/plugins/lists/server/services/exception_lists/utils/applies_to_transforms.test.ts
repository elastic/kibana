/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject, SavedObjectsUpdateResponse } from '@kbn/core/server';
import {
  createExceptionListItemSchema,
  updateExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';

import type { ExceptionListSoSchema } from '../../../schemas/saved_objects';
import { getCreateExceptionListItemOptionsMock } from '../exception_list_client.mock';
import { getUpdateExceptionListItemOptionsMock } from '../exception_list_client.mock';
import { getExceptionListItemSchemaMock } from '../../../../common/schemas/response/exception_list_item_schema.mock';

import { validateData } from './validate_data';

import {
  transformCreateExceptionListItemOptionsToCreateExceptionListItemSchema,
  transformSavedObjectToExceptionListItem,
  transformSavedObjectUpdateToExceptionListItem,
  transformUpdateExceptionListItemOptionsToUpdateExceptionListItemSchema,
} from '.';

const itemSavedObject = (
  attributes: Partial<ExceptionListSoSchema>
): SavedObject<ExceptionListSoSchema> =>
  ({
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
    id: 'so-id',
    references: [],
    type: 'exception-list',
    updated_at: '2026-10-01T00:00:00.000Z',
    version: 'WzEsMV0=',
  } as unknown as SavedObject<ExceptionListSoSchema>);

describe('transforms of the items and what they apply to', () => {
  describe('transformSavedObjectToExceptionListItem', () => {
    it('does not add applies_to to an item that does not say it', () => {
      expect(
        transformSavedObjectToExceptionListItem({ savedObject: itemSavedObject({}) })
      ).not.toHaveProperty('applies_to');
    });

    it.each(['source_documents', 'esql_output_columns'] as const)(
      'reads applies_to %s',
      (appliesTo) => {
        expect(
          transformSavedObjectToExceptionListItem({
            savedObject: itemSavedObject({ applies_to: appliesTo }),
          }).applies_to
        ).toBe(appliesTo);
      }
    );

    it('reads the column_type of the entries', () => {
      const entries = [
        { column_type: 'keyword', field: 'f', operator: 'included', type: 'match', value: 'v' },
      ] as ExceptionListSoSchema['entries'];
      expect(
        transformSavedObjectToExceptionListItem({ savedObject: itemSavedObject({ entries }) })
          .entries
      ).toEqual(entries);
    });
  });

  describe('transformSavedObjectUpdateToExceptionListItem', () => {
    const update = (
      attributes: Partial<ExceptionListSoSchema>
    ): SavedObjectsUpdateResponse<ExceptionListSoSchema> =>
      ({
        attributes,
        id: 'so-id',
        references: [],
        type: 'exception-list',
        updated_at: '2026-10-02T00:00:00.000Z',
        version: 'WzIsMV0=',
      } as unknown as SavedObjectsUpdateResponse<ExceptionListSoSchema>);

    it('keeps what the item applies to when the update does not say it', () => {
      expect(
        transformSavedObjectUpdateToExceptionListItem({
          exceptionListItem: getExceptionListItemSchemaMock({ applies_to: 'esql_output_columns' }),
          savedObject: update({ name: 'new name' }),
        }).applies_to
      ).toBe('esql_output_columns');
    });

    it('does not add applies_to to an item that did not have it', () => {
      expect(
        transformSavedObjectUpdateToExceptionListItem({
          exceptionListItem: getExceptionListItemSchemaMock(),
          savedObject: update({ name: 'new name' }),
        })
      ).not.toHaveProperty('applies_to');
    });
  });

  describe('the options that the extension points validate', () => {
    it('writes applies_to as the schema names it, and validates', () => {
      const schema = transformCreateExceptionListItemOptionsToCreateExceptionListItemSchema({
        ...getCreateExceptionListItemOptionsMock(),
        appliesTo: 'esql_output_columns',
      });

      expect(schema).toHaveProperty('applies_to', 'esql_output_columns');
      expect(schema).not.toHaveProperty('appliesTo');
      expect(() => validateData(createExceptionListItemSchema, schema)).not.toThrow();
    });

    it('does not write applies_to when the options do not have it', () => {
      expect(
        transformCreateExceptionListItemOptionsToCreateExceptionListItemSchema(
          getCreateExceptionListItemOptionsMock()
        )
      ).not.toHaveProperty('applies_to');
      expect(
        transformUpdateExceptionListItemOptionsToUpdateExceptionListItemSchema(
          getUpdateExceptionListItemOptionsMock()
        )
      ).not.toHaveProperty('applies_to');
    });

    it('writes applies_to of an update as the schema names it, and validates', () => {
      const schema = transformUpdateExceptionListItemOptionsToUpdateExceptionListItemSchema({
        ...getUpdateExceptionListItemOptionsMock(),
        appliesTo: 'source_documents',
      });

      expect(schema).toHaveProperty('applies_to', 'source_documents');
      expect(() => validateData(updateExceptionListItemSchema, schema)).not.toThrow();
    });
  });
});
