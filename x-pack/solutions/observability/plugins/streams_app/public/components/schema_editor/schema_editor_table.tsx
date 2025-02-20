/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
import {
  EuiDataGridColumnSortingConfig,
  EuiSearchBar,
  EuiScreenReaderOnly,
  EuiDataGrid,
  EuiDataGridCellProps,
  EuiDataGridControlColumn,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { WiredStreamDefinition } from '@kbn/streams-schema';
import { isEmpty } from 'lodash';
import { TABLE_COLUMNS, EMPTY_CONTENT } from './constants';
import { FieldActionsCell } from './field_actions';
import { FieldParent } from './field_parent';
import { FieldStatusBadge } from './field_status';
import { TControls } from './hooks/use_controls';
import { SchemaField } from './types';
import { FieldType } from './field_type';

export function FieldsTable({
  fields,
  controls,
  stream,
  withTableActions,
}: {
  fields: SchemaField[];
  controls: TControls;
  stream: WiredStreamDefinition;
  withTableActions: boolean;
}) {
  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState(Object.keys(TABLE_COLUMNS));
  // Column sorting
  const [sortingColumns, setSortingColumns] = useState<EuiDataGridColumnSortingConfig[]>([]);

  const filteredFields = useMemo(
    () => filterFieldsByControls(fields, controls),
    [fields, controls]
  );

  const trailingColumns = useMemo(() => {
    if (!withTableActions) return undefined;

    return [createFieldActionsCellRenderer(filteredFields)];
  }, [withTableActions, filteredFields]);

  const RenderCellValue = useMemo(
    () => createCellRenderer(filteredFields, stream),
    [filteredFields, stream]
  );

  return (
    <EuiDataGrid
      aria-label={i18n.translate(
        'xpack.streams.streamDetailSchemaEditor.fieldsTable.actionsTitle',
        { defaultMessage: 'Preview' }
      )}
      columns={Object.entries(TABLE_COLUMNS).map(([columnId, value]) => ({
        id: columnId,
        ...value,
      }))}
      columnVisibility={{
        visibleColumns,
        setVisibleColumns,
        canDragAndDropColumns: false,
      }}
      sorting={{ columns: sortingColumns, onSort: setSortingColumns }}
      toolbarVisibility={true}
      rowCount={filteredFields.length}
      renderCellValue={RenderCellValue}
      trailingControlColumns={trailingColumns}
      gridStyle={{
        border: 'none',
        rowHover: 'none',
        header: 'underline',
      }}
      inMemory={{ level: 'sorting' }}
    />
  );
}

const createCellRenderer =
  (fields: SchemaField[], stream: WiredStreamDefinition): EuiDataGridCellProps['renderCellValue'] =>
  ({ rowIndex, columnId }) => {
    const field = fields[rowIndex];
    if (!field) return null;
    const { parent, status } = field;

    if (columnId === 'type') {
      if (!field.type) return EMPTY_CONTENT;
      return <FieldType type={field.type} />;
    }

    if (columnId === 'parent') {
      return <FieldParent parent={parent} linkEnabled={field.parent !== stream.name} />;
    }

    if (columnId === 'status') {
      return <FieldStatusBadge status={status} />;
    }

    return <>{field[columnId as keyof SchemaField] || EMPTY_CONTENT}</>;
  };

const createFieldActionsCellRenderer = (fields: SchemaField[]): EuiDataGridControlColumn => ({
  id: 'field-actions',
  width: 40,
  headerCellRender: () => (
    <EuiScreenReaderOnly>
      <span>
        {i18n.translate('xpack.streams.streamDetailSchemaEditorFieldsTableActionsTitle', {
          defaultMessage: 'Field actions',
        })}
      </span>
    </EuiScreenReaderOnly>
  ),
  rowCellRender: ({ rowIndex }) => {
    const field = fields[rowIndex];

    if (!field) return null;

    return <FieldActionsCell field={field} />;
  },
});

const filterFieldsByControls = (fields: SchemaField[], controls: TControls) => {
  if (!controls.query && isEmpty(controls.type) && isEmpty(controls.status)) {
    return fields;
  }

  const matchingQueryFields = EuiSearchBar.Query.execute(controls.query, fields, {
    defaultFields: ['name', 'type'],
  });

  const filteredByGroupsFields = matchingQueryFields.filter((field) => {
    return (
      (isEmpty(controls.type) || (field.type && controls.type.includes(field.type))) && // Filter by applied type
      (isEmpty(controls.status) || controls.status.includes(field.status)) // Filter by applied status
    );
  });

  return filteredByGroupsFields;
};
