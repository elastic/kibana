/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCallOut,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import type { DiscoverLinks } from '../signals_in_discover';
import { formatMinute } from '../format_minute';
import type { LiveSignals, StoredSignalRow } from './use_live_signals';
import { SIGNALS_REFRESH_MS } from './use_live_signals';

const HOUR_MS = 60 * 60_000;
/** How far before its bucket an evidence query may look, so Discover's time picker doesn't cut it. */
const EVIDENCE_LOOKBACK_MS = 7 * 24 * HOUR_MS;

const STATUS_COLOR: Record<string, string> = {
  breached: 'danger',
  recovered: 'success',
};

/** A signal row keyed by its document id, which stays the same as newer signals arrive. */
interface SignalItem {
  key: string;
  row: StoredSignalRow;
}

function readText(value: unknown): string | undefined {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : undefined;
}

function formatEpoch(value: unknown): string {
  const text = readText(value);
  return text === undefined ? '-' : formatMinute(Number(text));
}

/** ES|QL returns a `flattened` field's nested keys as dotted names, such as `entity.type`. */
function formatEntity(data: Record<string, unknown>): string {
  const type = readText(data['entity.type']);
  const name = readText(data['entity.name']);
  return type === undefined && name === undefined ? '-' : `${type ?? '?'}: ${name ?? '?'}`;
}

function SignalDetails({
  row,
  discoverLinks,
}: {
  row: StoredSignalRow;
  discoverLinks?: DiscoverLinks;
}) {
  const evidence = readText(row.data.evidence_esql);
  const bucketEnd = Number(readText(row.data.bucket_end));
  const evidenceHref =
    evidence !== undefined && discoverLinks !== undefined && Number.isFinite(bucketEnd)
      ? discoverLinks.getEsqlHref({
          esql: evidence,
          timeRange: {
            from: new Date(bucketEnd - EVIDENCE_LOOKBACK_MS).toISOString(),
            to: new Date(bucketEnd + HOUR_MS).toISOString(),
          },
        })
      : undefined;

  return (
    <div style={{ width: '100%' }}>
      <EuiText size="xs">
        <strong>Evidence query</strong>
        {evidenceHref !== undefined && (
          <>
            {' · '}
            <EuiLink
              data-test-subj="nightshiftDetectionSignalDetailsOpenInDiscoverLink"
              href={evidenceHref}
              target="_blank"
            >
              Open in Discover
            </EuiLink>
          </>
        )}
      </EuiText>
      <EuiCodeBlock language="esql" fontSize="s" paddingSize="s" isCopyable>
        {evidence ?? '-'}
      </EuiCodeBlock>
      <EuiSpacer size="s" />
      <EuiText size="xs">
        <strong>Signal</strong>
      </EuiText>
      <EuiCodeBlock language="json" fontSize="s" paddingSize="s" isCopyable overflowHeight={400}>
        {JSON.stringify(row, null, 2)}
      </EuiCodeBlock>
    </div>
  );
}

interface SignalsPanelProps {
  live: LiveSignals;
  isLive: boolean;
  onLiveChange: (isLive: boolean) => void;
  discoverLinks?: DiscoverLinks;
}

/** The space's newest detection signals, read again while live; a row opens its evidence. */
export function SignalsPanel({ live, isLive, onLiveChange, discoverLinks }: SignalsPanelProps) {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const { signals, error, isLoading, updatedAt, refresh } = live;

  const items: SignalItem[] = signals.map((row) => ({ key: row._id, row }));

  const toggleExpanded = (key: string) =>
    setExpandedKeys((previous) => {
      const next = new Set(previous);
      if (!next.delete(key)) {
        next.add(key);
      }
      return next;
    });

  const columns: Array<EuiBasicTableColumn<SignalItem>> = [
    {
      name: 'Tick minute',
      width: '13%',
      render: ({ row }: SignalItem) => formatMinute(Date.parse(row['@timestamp'])),
    },
    {
      name: 'Bucket',
      width: '13%',
      render: ({ row }: SignalItem) => formatEpoch(row.data.bucket_start),
    },
    {
      name: 'Status',
      width: '9%',
      render: ({ row }: SignalItem) => (
        <EuiBadge color={STATUS_COLOR[row.status] ?? 'hollow'}>{row.status}</EuiBadge>
      ),
    },
    {
      name: 'Strategy',
      width: '11%',
      render: ({ row }: SignalItem) => readText(row.data.strategy) ?? '-',
    },
    {
      name: 'Entity',
      width: '16%',
      render: ({ row }: SignalItem) => formatEntity(row.data),
    },
    { name: 'Title', render: ({ row }: SignalItem) => readText(row.data.title) ?? '-' },
    {
      name: 'Value',
      width: '10%',
      render: ({ row }: SignalItem) =>
        `${readText(row.data.value) ?? '-'} ${readText(row.data.unit) ?? ''}`.trim(),
    },
    {
      width: '40px',
      isExpander: true,
      render: ({ key }: SignalItem) => {
        const label = expandedKeys.has(key) ? 'Hide the signal' : 'Show the signal';
        return (
          <EuiToolTip content={label} disableScreenReaderOutput>
            <EuiButtonIcon
              data-test-subj="nightshiftDetectionInspectorSignalToggle"
              aria-label={label}
              iconType={expandedKeys.has(key) ? 'chevronSingleDown' : 'chevronSingleRight'}
              onClick={() => toggleExpanded(key)}
            />
          </EuiToolTip>
        );
      },
    },
  ];

  const itemIdToExpandedRowMap = Object.fromEntries(
    items
      .filter(({ key }) => expandedKeys.has(key))
      .map(({ key, row }) => [key, <SignalDetails row={row} discoverLinks={discoverLinks} />])
  );

  return (
    <EuiPanel hasBorder data-test-subj="nightshiftDetectionInspectorSignals">
      <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3>Signals</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSwitch
            compressed
            label={`Live, every ${SIGNALS_REFRESH_MS / 1000} s`}
            checked={isLive}
            onChange={(event) => onLiveChange(event.target.checked)}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            data-test-subj="nightshiftDetectionSignalsPanelRefreshButton"
            size="xs"
            iconType="refresh"
            isLoading={isLoading}
            onClick={refresh}
          >
            Refresh
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {signals.length} newest
            {updatedAt !== undefined && ` · read ${new Date(updatedAt).toLocaleTimeString()}`}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      {error !== undefined && (
        <>
          <EuiCallOut announceOnMount size="s" color="danger" title="Could not read the signals">
            <p>{error}</p>
          </EuiCallOut>
          <EuiSpacer size="s" />
        </>
      )}
      <EuiBasicTable
        tableCaption="Detection signals of this space, newest first"
        items={items}
        itemId="key"
        itemIdToExpandedRowMap={itemIdToExpandedRowMap}
        columns={columns}
        loading={isLoading && signals.length === 0}
        noItemsMessage="No signals stored in this space yet."
        compressed
      />
    </EuiPanel>
  );
}
