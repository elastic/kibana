/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiInMemoryTable, EuiText } from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getFlattenedObject } from '@kbn/std';
import type { EntityStoreRecord } from '../hooks/use_entity_from_store';
import {
  ENTITY_PANEL_TABLE_CONTENT_TEST_ID,
  ENTITY_PANEL_TABLE_SEARCH_INPUT_TEST_ID,
} from './right/test_ids';

const SEARCH_CONFIG = {
  box: {
    incremental: true,
    placeholder: i18n.translate(
      'xpack.securitySolution.flyout.entityDetails.table.filterPlaceholderLabel',
      { defaultMessage: 'Filter by field or value' }
    ),
    schema: true,
    'data-test-subj': ENTITY_PANEL_TABLE_SEARCH_INPUT_TEST_ID,
  },
};

export interface EntityStoreFieldItem {
  field: string;
  value: string;
}

/**
 * Flattens a nested object into dot-notation field/value pairs.
 */
export const flattenEntityRecord = (record: Record<string, unknown>): EntityStoreFieldItem[] =>
  Object.entries(getFlattenedObject(record))
    .filter(([, v]) => v != null)
    .map(([field, v]) => ({
      field,
      value: Array.isArray(v) ? v.join(', ') : String(v),
    }))
    .sort((a, b) => a.field.localeCompare(b.field));

const columns: Array<EuiBasicTableColumn<EntityStoreFieldItem>> = [
  {
    field: 'field',
    name: (
      <EuiText size="xs">
        <strong>
          {i18n.translate('xpack.securitySolution.flyout.entityDetails.table.fieldCellLabel', {
            defaultMessage: 'Field',
          })}
        </strong>
      </EuiText>
    ),
    width: '30%',
    render: (field: string) => (
      <EuiText size="xs">
        <strong>{field}</strong>
      </EuiText>
    ),
  },
  {
    field: 'value',
    name: (
      <EuiText size="xs">
        <strong>
          {i18n.translate('xpack.securitySolution.flyout.entityDetails.table.valueCellLabel', {
            defaultMessage: 'Value',
          })}
        </strong>
      </EuiText>
    ),
    render: (value: string) => <EuiText size="xs">{value}</EuiText>,
  },
];

interface EntityStoreTableTabProps {
  entityRecord: EntityStoreRecord;
}

export const EntityStoreTableTab = memo(({ entityRecord }: EntityStoreTableTabProps) => {
  const items = useMemo(
    () => flattenEntityRecord(entityRecord as unknown as Record<string, unknown>),
    [entityRecord]
  );

  return (
    <EuiInMemoryTable
      items={items}
      itemId="field"
      columns={columns}
      pagination={false}
      search={SEARCH_CONFIG}
      sorting={false}
      data-test-subj={ENTITY_PANEL_TABLE_CONTENT_TEST_ID}
      tableCaption={i18n.translate(
        'xpack.securitySolution.flyout.entityDetails.table.documentFieldsCaption',
        { defaultMessage: 'Entity fields' }
      )}
    />
  );
});

EntityStoreTableTab.displayName = 'EntityStoreTableTab';
