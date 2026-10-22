/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiIcon,
  EuiInMemoryTable,
  EuiText,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { EngineSignal } from '@kbn/significant-events-detection-engine-plugin/common';
import React from 'react';
import { formatTime, formatValue } from './format';
import { OUTCOME_COLORS, OUTCOME_LABELS, STRATEGY_ICONS, STRATEGY_LABELS } from './labels';

const PAGE_SIZE = 20;

interface ISignalsListProps {
  signals: EngineSignal[];
}

/** Every signal of one event, minute by minute, with what the engine did with it. */
export function SignalsList({ signals }: ISignalsListProps) {
  const columns: Array<EuiBasicTableColumn<EngineSignal>> = [
    {
      field: 'bucket_start',
      name: i18n.translate('xpack.significantEventsApp.detectionEngine.signalsList.minute', {
        defaultMessage: 'Minute',
      }),
      width: '90px',
      sortable: true,
      render: (bucketStart: string) => formatTime(bucketStart),
    },
    {
      field: 'title',
      name: i18n.translate('xpack.significantEventsApp.detectionEngine.signalsList.signal', {
        defaultMessage: 'Signal',
      }),
      render: (title: string, signal: EngineSignal) => (
        <EuiText size="xs">
          <EuiIcon
            type={STRATEGY_ICONS[signal.strategy]}
            aria-label={STRATEGY_LABELS[signal.strategy]}
          />{' '}
          {title}
        </EuiText>
      ),
    },
    {
      field: 'value',
      name: i18n.translate('xpack.significantEventsApp.detectionEngine.signalsList.value', {
        defaultMessage: 'Value / normal up to',
      }),
      width: '150px',
      render: (value: number, signal: EngineSignal) => (
        <EuiText size="xs">
          {formatValue(value, signal.unit)}
          {signal.baseline.threshold !== undefined &&
            ` / ${formatValue(signal.baseline.threshold, signal.unit)}`}
        </EuiText>
      ),
    },
    {
      field: 'outcome',
      name: i18n.translate('xpack.significantEventsApp.detectionEngine.signalsList.outcome', {
        defaultMessage: 'What the engine did',
      }),
      render: (outcome: EngineSignal['outcome'], signal: EngineSignal) => (
        <EuiText size="xs">
          <EuiBadge color={OUTCOME_COLORS[outcome]}>{OUTCOME_LABELS[outcome]}</EuiBadge>{' '}
          {signal.outcome_reason}
        </EuiText>
      ),
    },
  ];

  return (
    <EuiInMemoryTable
      data-test-subj="detectionEngineEventSignals"
      tableCaption={i18n.translate(
        'xpack.significantEventsApp.detectionEngine.signalsList.caption',
        { defaultMessage: 'Signals behind this event' }
      )}
      compressed
      items={signals}
      itemId="signal_id"
      columns={columns}
      pagination={{ pageSize: PAGE_SIZE, showPerPageOptions: false }}
      sorting={{ sort: { field: 'bucket_start', direction: 'desc' } }}
    />
  );
}
