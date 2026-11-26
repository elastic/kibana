/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBadge,
  EuiBasicTable,
  EuiLink,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import type { StrategyRunResult, TickResult } from '../../common/tick';
import { formatMinute } from './format_minute';

const STATUS_COLOR: Record<TickResult['status'], string> = {
  completed: 'success',
  busy: 'warning',
  unavailable: 'danger',
};

const STRATEGY_COLUMNS: Array<EuiBasicTableColumn<StrategyRunResult>> = [
  { field: 'id', name: 'Strategy', width: '18%' },
  {
    name: 'Window',
    width: '22%',
    render: ({ from, to }: StrategyRunResult) => `${formatMinute(from)} → ${formatMinute(to)}`,
  },
  { field: 'signals', name: 'Signals', width: '8%', dataType: 'number' },
  { field: 'skipped_minutes', name: 'Skipped min', width: '9%', dataType: 'number' },
  {
    field: 'notes',
    name: 'Notes',
    render: (notes: string[]) =>
      notes.length === 0 ? (
        '-'
      ) : (
        <EuiText size="xs">
          <ul>
            {notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </EuiText>
      ),
  },
  {
    field: 'error',
    name: 'Error',
    width: '20%',
    render: (error?: string) =>
      error ? (
        <EuiText size="xs" color="danger">
          {error}
        </EuiText>
      ) : (
        '-'
      ),
  },
];

interface TickResultViewProps {
  result: TickResult;
  /** This tick's signals in Discover, when it wrote any and Discover can be linked to. */
  signalsHref?: string;
}

/** One tick: its status and run id, then what each due strategy covered and wrote. */
export function TickResultView({ result, signalsHref }: TickResultViewProps) {
  return (
    <div data-test-subj="nightshiftDetectionInspectorTick">
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiBadge color={STATUS_COLOR[result.status]}>{result.status}</EuiBadge>
        </EuiFlexItem>
        {result.status === 'unavailable' && (
          <EuiFlexItem grow={false}>
            <EuiText size="xs">Unmet requirement: {result.reason}</EuiText>
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            run {result.run_id}
          </EuiText>
        </EuiFlexItem>
        {signalsHref && (
          <EuiFlexItem grow={false}>
            <EuiText size="xs">
              <EuiLink
                href={signalsHref}
                data-test-subj="nightshiftDetectionInspectorTickSignalsLink"
              >
                Signals of this tick in Discover
              </EuiLink>
            </EuiText>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      {result.strategies.length === 0 ? (
        <EuiText size="s" color="subdued">
          <p>No strategy was due.</p>
        </EuiText>
      ) : (
        <EuiBasicTable
          tableCaption="Strategies run in this tick"
          items={result.strategies}
          columns={STRATEGY_COLUMNS}
          compressed
        />
      )}
    </div>
  );
}
