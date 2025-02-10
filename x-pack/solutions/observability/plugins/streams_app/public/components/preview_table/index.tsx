/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiDataGrid } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { RecursiveRecord } from '@kbn/streams-schema';
import { isEmpty } from 'lodash';
import React, { useMemo } from 'react';

export function PreviewTable({
  documents,
  displayColumns,
}: {
  documents: RecursiveRecord[];
  displayColumns?: string[];
}) {
  const columns = useMemo(() => {
    if (displayColumns && !isEmpty(displayColumns)) return displayColumns;

    const cols = new Set<string>();
    documents.forEach((doc) => {
      if (!doc || typeof doc !== 'object') {
        return;
      }
      Object.keys(doc).forEach((key) => {
        cols.add(key);
      });
    });
    return Array.from(cols);
  }, [displayColumns, documents]);

  const gridColumns = useMemo(() => {
    return columns.map((column) => ({
      id: column,
      displayAsText: column,
      initialWidth: columns.length > 10 ? 250 : undefined,
    }));
  }, [columns]);

  return (
    <EuiDataGrid
      aria-label={i18n.translate('xpack.streams.resultPanel.euiDataGrid.previewLabel', {
        defaultMessage: 'Preview',
      })}
      columns={gridColumns}
      columnVisibility={{
        visibleColumns: columns,
        setVisibleColumns: () => {},
        canDragAndDropColumns: false,
      }}
      toolbarVisibility={false}
      rowCount={documents.length}
      renderCellValue={({ rowIndex, columnId }) => {
        const doc = documents[rowIndex];
        if (!doc || typeof doc !== 'object') {
          return '';
        }
        const value = (doc as RecursiveRecord)[columnId];
        if (value === undefined || value === null) {
          return '';
        }
        if (typeof value === 'object') {
          return JSON.stringify(value);
        }
        return String(value);
      }}
    />
  );
}
