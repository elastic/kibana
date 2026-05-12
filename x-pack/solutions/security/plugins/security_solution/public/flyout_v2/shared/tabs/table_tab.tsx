/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { ALERT_NAMESPACE, EVENT_KIND } from '@kbn/rule-data-utils';
import type { DataTableRecord } from '@kbn/discover-utils';
import { getFieldValue } from '@kbn/discover-utils';
import { TableTab as SharedTableTab, type TableTabItem } from './base_table_tab';
import { TABLE_TAB_TEST_ID } from '../components/test_ids';
import { TableFieldNameCell } from '../components/table_field_name_cell';
import { EventKind } from '../../document/main/constants/event_kinds';
import { TableTabSettingButton } from '../components/table_tab_setting_button';
import { FLYOUT_STORAGE_KEYS } from '../../document/main/constants/local_storage';
import { useKibana } from '../../../common/lib/kibana';
import { useHighlightedFields } from '../../document/main/hooks/use_highlighted_fields';
import type { CellActionRenderer } from '../components/cell_actions';
import { TableTabTour } from '../components/table_tab_tour';

export interface TableTabState {
  pinnedFields: string[];
  showHighlightedFields: boolean;
  hideEmptyFields: boolean;
  hideAlertFields: boolean;
}

const DEFAULT_STATE: TableTabState = {
  pinnedFields: [],
  showHighlightedFields: false,
  hideEmptyFields: false,
  hideAlertFields: false,
};

export interface TableTabProps {
  hit: DataTableRecord;
  renderCellActions: CellActionRenderer;
  scopeId?: string;
}

const TABLE_CAPTION = i18n.translate(
  'xpack.securitySolution.flyout.document.table.documentFieldsCaption',
  { defaultMessage: 'Document fields' }
);

const SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.flyout.document.table.filterPlaceholderLabel',
  { defaultMessage: 'Filter by field or value...' }
);

export const TableTab = memo(({ hit, renderCellActions, scopeId = '' }: TableTabProps) => {
  const { storage } = useKibana().services;

  const isAlert = useMemo(
    () => (getFieldValue(hit, EVENT_KIND) as string) === EventKind.signal,
    [hit]
  );

  const investigationFields = useMemo<string[]>(() => {
    const raw = hit.flattened['kibana.alert.investigation_fields.field_names'];
    if (Array.isArray(raw)) return raw.map(String);
    if (raw != null) return [String(raw)];
    return [];
  }, [hit]);

  const highlightedFieldsResult = useHighlightedFields({ hit, investigationFields });
  const highlightedFieldNames = useMemo(
    () => Object.keys(highlightedFieldsResult),
    [highlightedFieldsResult]
  );

  const [tableTabState, setTableTabStateInternal] = useState<TableTabState>(() => {
    const stored = storage.get(FLYOUT_STORAGE_KEYS.TABLE_TAB_STATE);
    return stored != null ? { ...DEFAULT_STATE, ...stored } : DEFAULT_STATE;
  });

  const setTableTabState = useCallback(
    (state: TableTabState) => {
      setTableTabStateInternal(state);
      storage.set(FLYOUT_STORAGE_KEYS.TABLE_TAB_STATE, state);
    },
    [storage]
  );

  const onPinField = useCallback(
    (field: string, action: 'pin' | 'unpin') => {
      setTableTabState({
        ...tableTabState,
        pinnedFields:
          action === 'pin'
            ? [...tableTabState.pinnedFields, field]
            : tableTabState.pinnedFields.filter((f) => f !== field),
      });
    },
    [tableTabState, setTableTabState]
  );

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const allItems = useMemo<TableTabItem[]>(
    () =>
      Object.entries(hit.flattened)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([field, value]) => ({
          field,
          value: Array.isArray(value) ? value.join(', ') : String(value ?? ''),
          rawValue: value,
        })),
    [hit.flattened]
  );

  const items = useMemo<TableTabItem[]>(() => {
    const { showHighlightedFields, hideEmptyFields, hideAlertFields, pinnedFields } = tableTabState;
    const filtered = allItems.filter(({ field, value }) => {
      if (hideEmptyFields && (value === '' || value === 'null' || value === 'undefined')) {
        return false;
      }
      if (hideAlertFields && (field.startsWith(ALERT_NAMESPACE) || field.startsWith('signal.'))) {
        return false;
      }
      if (showHighlightedFields && !highlightedFieldNames.includes(field)) {
        return false;
      }
      return true;
    });
    const pinned = filtered.filter(({ field }) => pinnedFields.includes(field));
    const rest = filtered.filter(({ field }) => !pinnedFields.includes(field));
    return [...pinned, ...rest];
  }, [allItems, tableTabState, highlightedFieldNames]);

  const renderFieldName = useCallback(
    (field: string) => <TableFieldNameCell field={field} rawValue={hit.flattened[field]} />,
    [hit.flattened]
  );

  const toolsRight = useMemo(
    () => [
      <TableTabSettingButton
        tableTabState={tableTabState}
        setTableTabState={setTableTabState}
        isPopoverOpen={isPopoverOpen}
        setIsPopoverOpen={setIsPopoverOpen}
        isAlert={isAlert}
      />,
    ],
    [tableTabState, setTableTabState, isPopoverOpen, isAlert]
  );

  return (
    <>
      <TableTabTour setIsPopoverOpen={setIsPopoverOpen} />
      <SharedTableTab
        items={items}
        tableCaption={TABLE_CAPTION}
        data-test-subj={TABLE_TAB_TEST_ID}
        paginated
        searchPlaceholder={SEARCH_PLACEHOLDER}
        fieldColumnWidth="40%"
        toolsRight={toolsRight}
        pinnedFields={tableTabState.pinnedFields}
        onPinField={onPinField}
        renderFieldName={renderFieldName}
        highlightedFields={highlightedFieldNames}
        renderCellActions={renderCellActions}
        scopeId={scopeId}
        rowFontSize="xs"
      />
    </>
  );
});

TableTab.displayName = 'TableTab';
