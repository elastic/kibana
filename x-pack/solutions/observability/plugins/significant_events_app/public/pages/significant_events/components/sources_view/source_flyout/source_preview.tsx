/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiDataGrid,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingElastic,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { SignificantEventsSearchBar } from '../../../../../components/search_bar';
import { getFormattedError } from '../../../../../util/errors';
import { useSourcePreview } from './use_source_preview';

interface SourcePreviewProps {
  /** Last query the user ran; typing alone does not refresh the preview. */
  esql: string;
  /** Changes on every run, so running the same query again refetches it. */
  runId: number;
}

export function SourcePreview({ esql, runId }: SourcePreviewProps) {
  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="none"
      data-test-subj="significantEventsAppSourcePreview"
    >
      <EuiFlexItem grow={false}>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" wrap>
          <EuiFlexGroup component="span" gutterSize="s" alignItems="center" responsive={false}>
            <EuiIcon type="inspect" aria-hidden={true} />
            <EuiTitle size="xxs">
              <h3>{PREVIEW_TITLE}</h3>
            </EuiTitle>
          </EuiFlexGroup>
          <SignificantEventsSearchBar showDatePicker />
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiSpacer size="m" />
      <EuiFlexItem grow>
        <SourcePreviewContent esql={esql} runId={runId} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function SourcePreviewContent({ esql, runId }: SourcePreviewProps) {
  const { data, error, isFetching } = useSourcePreview({ esql, runId });

  if (esql.trim() === '') {
    return <EuiEmptyPrompt titleSize="xxs" title={<h4>{PREVIEW_IDLE_TITLE}</h4>} />;
  }
  if (error) {
    return (
      <EuiEmptyPrompt
        color="danger"
        iconType="error"
        titleSize="xxs"
        title={<h4>{PREVIEW_ERROR_TITLE}</h4>}
        body={<p>{getFormattedError(error).message}</p>}
      />
    );
  }
  if (!data) {
    return isFetching ? (
      <EuiFlexGroup justifyContent="center">
        <EuiLoadingElastic size="xl" />
      </EuiFlexGroup>
    ) : null;
  }
  if (data.rows.length === 0) {
    return <EuiEmptyPrompt titleSize="xxs" title={<h4>{PREVIEW_EMPTY_TITLE}</h4>} />;
  }
  // Remount on a new column set so the column visibility starts from the new columns.
  return <SourcePreviewGrid key={data.columns.join(',')} columns={data.columns} rows={data.rows} />;
}

function SourcePreviewGrid({
  columns,
  rows,
}: {
  columns: string[];
  rows: Array<Record<string, unknown>>;
}) {
  const [visibleColumns, setVisibleColumns] = useState(columns);

  return (
    <EuiDataGrid
      aria-label={PREVIEW_TITLE}
      columns={columns.map((id) => ({ id }))}
      columnVisibility={{ visibleColumns, setVisibleColumns }}
      rowCount={rows.length}
      renderCellValue={({ rowIndex, columnId }) => formatCellValue(rows[rowIndex]?.[columnId])}
      toolbarVisibility={{
        showDisplaySelector: false,
        showSortSelector: false,
        showKeyboardShortcuts: false,
      }}
      gridStyle={{ fontSize: 's', border: 'horizontal' }}
    />
  );
}

const formatCellValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '-';
  }
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
};

const PREVIEW_TITLE = i18n.translate('xpack.significantEventsApp.sources.flyout.previewTitle', {
  defaultMessage: 'Data preview',
});

const PREVIEW_IDLE_TITLE = i18n.translate(
  'xpack.significantEventsApp.sources.flyout.previewIdleTitle',
  { defaultMessage: 'Run the query to preview its data' }
);

const PREVIEW_ERROR_TITLE = i18n.translate(
  'xpack.significantEventsApp.sources.flyout.previewErrorTitle',
  { defaultMessage: 'Could not load the preview' }
);

const PREVIEW_EMPTY_TITLE = i18n.translate(
  'xpack.significantEventsApp.sources.flyout.previewEmptyTitle',
  { defaultMessage: 'No documents in this time range' }
);
