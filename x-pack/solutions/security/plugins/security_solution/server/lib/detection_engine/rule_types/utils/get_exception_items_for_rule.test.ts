/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';

import { getExceptionItemsForRule } from './get_exception_items_for_rule';

describe('getExceptionItemsForRule', () => {
  const legacyItem = getExceptionListItemSchemaMock({ item_id: 'legacy' });
  const sourceItem = {
    ...getExceptionListItemSchemaMock({ item_id: 'source' }),
    applies_to: 'source_documents' as const,
  };
  const columnsItem = {
    ...getExceptionListItemSchemaMock({ item_id: 'columns' }),
    applies_to: 'esql_output_columns' as const,
  };
  const items = [legacyItem, sourceItem, columnsItem];

  it('gives an ES|QL rule the items on the source documents and the items on the output columns apart', () => {
    expect(getExceptionItemsForRule({ items, isEsqlRule: true })).toEqual({
      sourceItems: [legacyItem, sourceItem],
      outputColumnItems: [columnsItem],
    });
  });

  it('does not give another rule type the items that apply to the ES|QL output columns', () => {
    expect(getExceptionItemsForRule({ items, isEsqlRule: false })).toEqual({
      sourceItems: [legacyItem, sourceItem],
      outputColumnItems: [],
    });
  });

  it('gives another rule type every item that does not say what it applies to, as it always did', () => {
    expect(getExceptionItemsForRule({ items: [legacyItem], isEsqlRule: false })).toEqual({
      sourceItems: [legacyItem],
      outputColumnItems: [],
    });
  });
});
