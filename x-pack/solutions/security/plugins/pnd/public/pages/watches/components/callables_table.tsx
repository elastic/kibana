/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiText,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import type { Watch, WatchCallableRef } from '@kbn/pnd-common';
import * as i18n from '../translations';

/**
 * One row per distinct callable id (dedupe across watches — several Watches
 * can reference the same skill/workflow, e.g. a shared `produce_draft_forensic_report`
 * skill). `watches` lists every Watch that references this callable, since the
 * per-watch `AgentCapabilitiesList` view already covers the single-watch case;
 * this aggregate view is "where is this callable used across the whole fleet".
 */
export interface CallableRow {
  callable: WatchCallableRef;
  watches: Array<{ id: string; name: string; color: string }>;
}

export const buildCallableRows = (
  watches: Watch[],
  kind: WatchCallableRef['kind']
): CallableRow[] => {
  const byId = new Map<string, CallableRow>();
  for (const watch of watches) {
    for (const callable of watch.callables) {
      if (callable.kind !== kind) continue;
      const existing = byId.get(callable.id);
      const watchRef = { id: watch.id, name: watch.name, color: watch.color };
      if (existing) {
        existing.watches.push(watchRef);
        // A callable enabled on any referencing watch should read as enabled
        // overall — this view answers "is this usable anywhere", not
        // "is it uniformly configured".
        existing.callable = {
          ...existing.callable,
          enabled: existing.callable.enabled || callable.enabled,
          lastRun:
            !existing.callable.lastRun ||
            (callable.lastRun && callable.lastRun > existing.callable.lastRun)
              ? callable.lastRun
              : existing.callable.lastRun,
        };
      } else {
        byId.set(callable.id, { callable, watches: [watchRef] });
      }
    }
  }
  return [...byId.values()].sort((a, b) => a.callable.name.localeCompare(b.callable.name));
};

interface CallablesTableProps {
  rows: CallableRow[];
  getHref?: (callableId: string) => string;
  onNavigateToWatch?: (watchId: string) => void;
  emptyMessage: string;
}

export const CallablesTable: React.FC<CallablesTableProps> = ({
  rows,
  getHref,
  onNavigateToWatch,
  emptyMessage,
}) => {
  const columns = useMemo<Array<EuiBasicTableColumn<CallableRow>>>(
    () => [
      {
        field: 'callable.name',
        name: i18n.COL_NAME,
        render: (_value, row) => {
          const href = getHref?.(row.callable.id);
          return href ? (
            <EuiLink
              href={href}
              target="_blank"
              data-test-subj={`pndCallableLink-${row.callable.id}`}
            >
              <strong>{row.callable.name}</strong>
            </EuiLink>
          ) : (
            <strong>{row.callable.name}</strong>
          );
        },
      },
      {
        field: 'callable.summary',
        name: i18n.COL_SUMMARY,
        render: (_value, row) => (
          <EuiText size="s" color="subdued">
            {row.callable.summary}
          </EuiText>
        ),
      },
      {
        name: i18n.COL_USED_BY,
        render: (row: CallableRow) => (
          <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
            {row.watches.map((watch) =>
              onNavigateToWatch ? (
                <EuiFlexItem grow={false} key={watch.id}>
                  <EuiLink
                    onClick={() => onNavigateToWatch(watch.id)}
                    data-test-subj={`pndCallableUsedByLink-${watch.id}`}
                  >
                    <EuiBadge color="hollow">{watch.name}</EuiBadge>
                  </EuiLink>
                </EuiFlexItem>
              ) : (
                <EuiFlexItem grow={false} key={watch.id}>
                  <EuiBadge color="hollow">{watch.name}</EuiBadge>
                </EuiFlexItem>
              )
            )}
          </EuiFlexGroup>
        ),
      },
      {
        name: i18n.COL_STATUS,
        width: '140px',
        render: (row: CallableRow) => (
          <EuiFlexGroup gutterSize="xs" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiBadge color={row.callable.enabled ? 'success' : 'default'}>
                {row.callable.enabled ? i18n.STATUS_ENABLED : i18n.STATUS_DISABLED}
              </EuiBadge>
            </EuiFlexItem>
            {row.callable.gated ? (
              <EuiFlexItem grow={false}>
                <EuiBadge color="warning">{i18n.GATED_BADGE}</EuiBadge>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        ),
      },
      {
        name: i18n.COL_LAST_RUN,
        width: '180px',
        render: (row: CallableRow) => (
          <EuiText size="s" color="subdued">
            {row.callable.lastRun ?? i18n.NEVER_RUN_CAPABILITY}
          </EuiText>
        ),
      },
    ],
    [getHref, onNavigateToWatch]
  );

  if (rows.length === 0) {
    return (
      <EuiText size="s" color="subdued">
        {emptyMessage}
      </EuiText>
    );
  }

  return <EuiBasicTable items={rows} columns={columns} tableLayout="auto" itemId="callable.id" />;
};
