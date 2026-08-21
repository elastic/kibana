/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiBadge, EuiBasicTable, EuiLink, EuiText, type EuiBasicTableColumn } from '@elastic/eui';
import type { Watch, WatchRecentRun } from '@kbn/pnd-common';
import * as i18n from '../translations';

/** One recent run tagged with which watch produced it, for the cross-watch feed. */
export interface ActivityRow extends WatchRecentRun {
  watchId: string;
  watchName: string;
  watchColor: string;
}

/** Flattens every watch's `recentRuns[]` into one feed, newest first. */
export const buildActivityFeed = (watches: Watch[]): ActivityRow[] => {
  const rows: ActivityRow[] = watches.flatMap((watch) =>
    watch.recentRuns.map((run) => ({
      ...run,
      watchId: watch.id,
      watchName: watch.name,
      watchColor: watch.color,
    }))
  );
  return rows.sort((a, b) => (a.startedAt < b.startedAt ? 1 : a.startedAt > b.startedAt ? -1 : 0));
};

interface ActivityFeedTableProps {
  rows: ActivityRow[];
  onNavigateToWatch?: (watchId: string) => void;
  getInvestigationHref?: (investigationId: string) => string;
  onNavigateToInvestigation?: (investigationId: string) => void;
}

export const ActivityFeedTable: React.FC<ActivityFeedTableProps> = ({
  rows,
  onNavigateToWatch,
  getInvestigationHref,
  onNavigateToInvestigation,
}) => {
  const columns = useMemo<Array<EuiBasicTableColumn<ActivityRow>>>(
    () => [
      {
        field: 'startedAt',
        name: i18n.COL_TIME,
        width: '160px',
        render: (startedAt: string) => (
          <EuiText size="s">
            <code>{startedAt}</code>
          </EuiText>
        ),
      },
      {
        field: 'watchName',
        name: i18n.COL_WATCH,
        width: '160px',
        render: (_value, row: ActivityRow) =>
          onNavigateToWatch ? (
            <EuiLink
              onClick={() => onNavigateToWatch(row.watchId)}
              data-test-subj={`pndActivityWatchLink-${row.watchId}`}
            >
              {row.watchName}
            </EuiLink>
          ) : (
            row.watchName
          ),
      },
      {
        field: 'status',
        name: i18n.COL_STATUS,
        width: '120px',
        render: (status: string) => <EuiBadge color="hollow">{status}</EuiBadge>,
      },
      {
        field: 'summary',
        name: i18n.COL_SUMMARY,
        truncateText: true,
        render: (_summary: string, run: ActivityRow) => {
          if (run.steps.length > 0) {
            return run.steps.map((s) => s.name).join(' → ');
          }
          return run.summary;
        },
      },
      {
        field: 'triggerType',
        name: i18n.COL_TRIGGER,
        width: '120px',
        render: (triggerType: string | undefined) => triggerType ?? '—',
      },
      {
        field: 'investigationId',
        name: i18n.COL_INVESTIGATION,
        width: '160px',
        render: (investigationId: string | undefined) => {
          if (!investigationId) {
            return '—';
          }
          const href = getInvestigationHref?.(investigationId);
          if (!href) {
            return investigationId;
          }
          return (
            <EuiLink
              href={href}
              data-test-subj={`pndActivityInvestigationLink-${investigationId}`}
              onClick={(event: React.MouseEvent) => {
                if (onNavigateToInvestigation) {
                  event.preventDefault();
                  onNavigateToInvestigation(investigationId);
                }
              }}
            >
              {investigationId}
            </EuiLink>
          );
        },
      },
    ],
    [onNavigateToWatch, getInvestigationHref, onNavigateToInvestigation]
  );

  if (rows.length === 0) {
    return (
      <EuiText size="s" color="subdued">
        {i18n.ACTIVITY_EMPTY_MESSAGE}
      </EuiText>
    );
  }

  return <EuiBasicTable items={rows} columns={columns} tableLayout="auto" itemId="executionId" />;
};
