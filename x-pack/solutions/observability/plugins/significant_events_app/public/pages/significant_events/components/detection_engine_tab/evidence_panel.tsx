/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { useDetectionEngineEvidence } from '../../../../hooks/use_detection_engine_evidence';
import { formatTime } from './format';

/** Columns people read first in log rows, in this order, when the query returns them. */
const PREFERRED_COLUMNS = [
  '@timestamp',
  'service.name',
  'log.level',
  'severity_text',
  'http.response.status_code',
  'event.duration',
  'pattern',
  'count',
  'message',
  'body.text',
];
/** Free-text columns get the remaining width; the others are short values. */
const TEXT_COLUMNS = ['message', 'body.text'];
const MAX_COLUMNS = 6;
const MAX_CELL_CHARS = 300;

type TEvidenceRow = Record<string, unknown> & { __row: number };

function cellText(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return text.length > MAX_CELL_CHARS ? `${text.slice(0, MAX_CELL_CHARS)}…` : text;
}

/** The columns worth showing: the readable ones first, then others that hold any value. */
function pickColumns({
  columns,
  rows,
  showAll,
}: {
  columns: string[];
  rows: Array<Record<string, unknown>>;
  showAll: boolean;
}): { shown: string[]; withValues: number } {
  const withValues = columns.filter((column) =>
    rows.some((row) => row[column] !== null && row[column] !== undefined)
  );
  const ordered = [
    ...PREFERRED_COLUMNS.filter((column) => withValues.includes(column)),
    ...withValues.filter((column) => !PREFERRED_COLUMNS.includes(column)),
  ].filter(
    // OTel logs carry some values twice, such as `message` and `body.text`; the first of each
    // in reading order stays.
    (column, index, all) =>
      !all
        .slice(0, index)
        .some((earlier) => rows.every((row) => cellText(row[earlier]) === cellText(row[column])))
  );
  return { shown: showAll ? ordered : ordered.slice(0, MAX_COLUMNS), withValues: ordered.length };
}

interface IEvidencePanelProps {
  eventId: string;
  fingerprint: string;
  query: string;
  discoverHref?: string;
}

/** A signal's evidence query, and the rows it returns when someone runs it. */
export function EvidencePanel({ eventId, fingerprint, query, discoverHref }: IEvidencePanelProps) {
  const [isRequested, setIsRequested] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const { data, isFetching, refetch } = useDetectionEngineEvidence({
    eventId,
    fingerprint,
    enabled: isRequested,
  });

  const rows: TEvidenceRow[] = (data?.rows ?? []).map((row, index) => ({ ...row, __row: index }));
  const { shown, withValues } = pickColumns({
    columns: data?.columns ?? [],
    rows: data?.rows ?? [],
    showAll,
  });
  const columns: Array<EuiBasicTableColumn<TEvidenceRow>> = shown.map((column) => {
    const isText = TEXT_COLUMNS.includes(column);
    return {
      field: column,
      name: column,
      truncateText: !isText,
      width: isText ? undefined : column === '@timestamp' ? '110px' : '130px',
      render: (value: unknown) => (
        <EuiText size="xs">
          <span style={{ wordBreak: 'break-word' }}>
            {column === '@timestamp' && typeof value === 'string'
              ? formatTime(value)
              : cellText(value)}
          </span>
        </EuiText>
      ),
    };
  });

  return (
    <div data-test-subj="detectionEngineEvidencePanel">
      <EuiCodeBlock language="sql" fontSize="s" paddingSize="s" isCopyable transparentBackground>
        {query}
      </EuiCodeBlock>
      <EuiSpacer size="xs" />
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            iconType="play"
            isLoading={isFetching}
            data-test-subj="detectionEngineRunEvidence"
            onClick={() => (isRequested ? refetch() : setIsRequested(true))}
          >
            {isRequested
              ? i18n.translate('xpack.significantEventsApp.detectionEngine.evidence.rerun', {
                  defaultMessage: 'Run again',
                })
              : i18n.translate('xpack.significantEventsApp.detectionEngine.evidence.run', {
                  defaultMessage: 'Show the rows',
                })}
          </EuiButton>
        </EuiFlexItem>
        {discoverHref && (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              iconType="discoverApp"
              href={discoverHref}
              target="_blank"
              data-test-subj="detectionEngineEvidenceLink"
            >
              {i18n.translate('xpack.significantEventsApp.detectionEngine.evidence.discover', {
                defaultMessage: 'Open in Discover',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
        {data && !data.error && (
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {i18n.translate('xpack.significantEventsApp.detectionEngine.evidence.summary', {
                defaultMessage: '{rows} {rows, plural, one {row} other {rows}} in {ms} ms',
                values: { rows: data.rows.length, ms: data.took_ms },
              })}
            </EuiText>
          </EuiFlexItem>
        )}
        {data && withValues > MAX_COLUMNS && (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="xs"
              data-test-subj="detectionEngineEvidenceColumns"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll
                ? i18n.translate('xpack.significantEventsApp.detectionEngine.evidence.fewer', {
                    defaultMessage: 'Show fewer columns',
                  })
                : i18n.translate('xpack.significantEventsApp.detectionEngine.evidence.all', {
                    defaultMessage: 'Show all {count} columns',
                    values: { count: withValues },
                  })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      {data?.error && (
        <>
          <EuiSpacer size="xs" />
          <EuiCallOut
            announceOnMount
            size="s"
            color="danger"
            iconType="error"
            title={i18n.translate('xpack.significantEventsApp.detectionEngine.evidence.failed', {
              defaultMessage: 'The query failed: {error}',
              values: { error: data.error },
            })}
          />
        </>
      )}
      {data && !data.error && rows.length === 0 && (
        <EuiText size="xs" color="subdued">
          {i18n.translate('xpack.significantEventsApp.detectionEngine.evidence.empty', {
            defaultMessage: 'No rows match this query.',
          })}
        </EuiText>
      )}
      {rows.length > 0 && (
        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
          <EuiBasicTable
            compressed
            tableCaption={i18n.translate(
              'xpack.significantEventsApp.detectionEngine.evidence.caption',
              { defaultMessage: 'Rows returned by the evidence query' }
            )}
            items={rows}
            itemId="__row"
            columns={columns}
            data-test-subj="detectionEngineEvidenceRows"
          />
        </div>
      )}
    </div>
  );
}
