/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiBasicTable, EuiButtonIcon, formatDate, type EuiBasicTableColumn } from '@elastic/eui';
import { SnapshotJsonFlyout } from './snapshot_json_flyout';
import * as i18n from './event_tab_translations';

export interface SnapshotEventItem {
  id: string;
  snapshot: string;
  timestamp: string | undefined;
}

/** Matches event table timestamp format (e.g. Mar 20, 2026 @ 01:30:32.156) */
const TIMESTAMP_DATE_FORMAT = 'MMM D, YYYY @ HH:mm:ss.SSS';

const getTimestampFromSnapshot = (snapshot: string): string | undefined => {
  try {
    const parsed = JSON.parse(snapshot) as Record<string, unknown>;
    const ts = parsed['@timestamp'] ?? parsed.timestamp;
    if (typeof ts === 'string') return ts;
    if (Array.isArray(ts) && ts.length > 0 && typeof ts[0] === 'string') return ts[0];
    return undefined;
  } catch {
    return undefined;
  }
};

export interface SnapshotEventsTableProps {
  items: SnapshotEventItem[];
}

export const SnapshotEventsTable: React.FC<SnapshotEventsTableProps> = ({ items }) => {
  const [flyoutSnapshot, setFlyoutSnapshot] = useState<string | null>(null);

  const openFlyout = useCallback((snapshot: string) => {
    setFlyoutSnapshot(snapshot);
  }, []);

  const closeFlyout = useCallback(() => {
    setFlyoutSnapshot(null);
  }, []);

  const columns: Array<EuiBasicTableColumn<SnapshotEventItem>> = [
    {
      field: 'actions',
      name: '',
      width: '48px',
      render: (_: unknown, item: SnapshotEventItem) => (
        <EuiButtonIcon
          iconType="eye"
          aria-label={i18n.VIEW_JSON_ARIA_LABEL}
          onClick={() => openFlyout(item.snapshot)}
          data-test-subj={`case-view-snapshot-open-${item.id}`}
        />
      ),
    },
    {
      field: 'timestamp',
      name: i18n.TIMESTAMP_COLUMN_TITLE,
      render: (timestamp: string | undefined) =>
        timestamp ? formatDate(timestamp, TIMESTAMP_DATE_FORMAT) : '—',
    },
  ];

  return (
    <>
      <EuiBasicTable<SnapshotEventItem>
        items={items}
        columns={columns}
        tableLayout="auto"
        tableCaption={i18n.DOCUMENT_SNAPSHOTS_TITLE}
        data-test-subj="case-view-snapshot-events-table"
      />
      {flyoutSnapshot != null && (
        <SnapshotJsonFlyout snapshot={flyoutSnapshot} onClose={closeFlyout} />
      )}
    </>
  );
};

SnapshotEventsTable.displayName = 'SnapshotEventsTable';

export { getTimestampFromSnapshot };
