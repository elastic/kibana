/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiLink,
  EuiSelect,
  EuiSpacer,
  EuiText,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  SIGNAL_OUTCOMES,
  SIGNAL_STRATEGY_IDS,
  type SignalOutcome,
  type SignalStrategyId,
  type EngineSignal,
} from '@kbn/significant-events-detection-engine-plugin/common';
import React, { useState } from 'react';
import { useDetectionEngineSignals } from '../../../../hooks/use_detection_engine_signals';
import { formatValue } from './format';
import { OUTCOME_COLORS, OUTCOME_LABELS, STRATEGY_ICONS, STRATEGY_LABELS } from './labels';

const ALL = '__all__';

interface ISignalsTableProps {
  onOpenEvent: (eventId: string) => void;
}

/**
 * Every signal in the common format, with what the pipeline did with it. This is where "why
 * did this not become an event?" gets its answer.
 */
export function SignalsTable({ onOpenEvent }: ISignalsTableProps) {
  const [strategy, setStrategy] = useState<SignalStrategyId | undefined>();
  const [outcome, setOutcome] = useState<SignalOutcome | undefined>();
  const { data, isLoading } = useDetectionEngineSignals({ strategy, outcome });

  const columns: Array<EuiBasicTableColumn<EngineSignal>> = [
    {
      field: 'bucket_start',
      name: i18n.translate('xpack.significantEventsApp.detectionEngine.signals.bucket', {
        defaultMessage: 'Minute',
      }),
      width: '100px',
      render: (bucketStart: string) => new Date(bucketStart).toLocaleTimeString(),
    },
    {
      field: 'title',
      name: i18n.translate('xpack.significantEventsApp.detectionEngine.signals.what', {
        defaultMessage: 'What looks off',
      }),
      render: (title: string, signal: EngineSignal) => (
        <div>
          <EuiIcon type={STRATEGY_ICONS[signal.strategy]} aria-hidden={true} /> {title}
          <EuiText size="xs" color="subdued">
            {STRATEGY_LABELS[signal.strategy]} · {signal.service} ·{' '}
            {i18n.translate('xpack.significantEventsApp.detectionEngine.signals.importance', {
              defaultMessage: 'importance {importance}',
              values: { importance: signal.importance },
            })}
          </EuiText>
        </div>
      ),
    },
    {
      field: 'baseline',
      name: i18n.translate('xpack.significantEventsApp.detectionEngine.signals.baseline', {
        defaultMessage: 'Value vs normal',
      }),
      width: '220px',
      render: (baseline: EngineSignal['baseline'], signal: EngineSignal) => (
        <EuiText size="xs">
          {i18n.translate('xpack.significantEventsApp.detectionEngine.signals.valueVsNormal', {
            defaultMessage:
              '{value}; normal up to {threshold} (median {median}, {samples} minutes)',
            values: {
              value: formatValue(signal.value, signal.unit),
              median:
                baseline.median === undefined ? '-' : formatValue(baseline.median, signal.unit),
              threshold:
                baseline.threshold === undefined
                  ? '-'
                  : formatValue(baseline.threshold, signal.unit),
              samples: baseline.samples,
            },
          })}
          {baseline.excludedSamples > 0 &&
            i18n.translate('xpack.significantEventsApp.detectionEngine.signals.excluded', {
              defaultMessage: '; {excluded} minutes left out while an event was open',
              values: { excluded: baseline.excludedSamples },
            })}
        </EuiText>
      ),
    },
    {
      field: 'outcome',
      name: i18n.translate('xpack.significantEventsApp.detectionEngine.signals.outcome', {
        defaultMessage: 'Outcome',
      }),
      render: (value: SignalOutcome, signal: EngineSignal) => (
        <div>
          <EuiBadge color={OUTCOME_COLORS[value]}>{OUTCOME_LABELS[value]}</EuiBadge>
          <EuiText size="xs" color="subdued">
            {signal.outcome_reason}
          </EuiText>
          {signal.event_id && (
            <EuiLink
              data-test-subj="significantEventsAppColumnsOpenEventLink"
              onClick={() => onOpenEvent(signal.event_id!)}
            >
              {i18n.translate('xpack.significantEventsApp.detectionEngine.signals.openEvent', {
                defaultMessage: 'Open event',
              })}
            </EuiLink>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <EuiFlexGroup gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiFormRow
            display="rowCompressed"
            label={i18n.translate('xpack.significantEventsApp.detectionEngine.signals.strategy', {
              defaultMessage: 'Strategy',
            })}
          >
            <EuiSelect
              data-test-subj="significantEventsAppSignalsTableSelect"
              compressed
              value={strategy ?? ALL}
              options={[
                {
                  value: ALL,
                  text: i18n.translate('xpack.significantEventsApp.detectionEngine.signals.all', {
                    defaultMessage: 'All',
                  }),
                },
                ...SIGNAL_STRATEGY_IDS.map((id) => ({ value: id, text: STRATEGY_LABELS[id] })),
              ]}
              onChange={(event) =>
                setStrategy(
                  event.target.value === ALL ? undefined : (event.target.value as SignalStrategyId)
                )
              }
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow
            display="rowCompressed"
            label={i18n.translate(
              'xpack.significantEventsApp.detectionEngine.signals.outcomeFilter',
              {
                defaultMessage: 'Outcome',
              }
            )}
          >
            <EuiSelect
              compressed
              data-test-subj="detectionEngineOutcomeFilter"
              value={outcome ?? ALL}
              options={[
                {
                  value: ALL,
                  text: i18n.translate(
                    'xpack.significantEventsApp.detectionEngine.signals.allOutcomes',
                    {
                      defaultMessage: 'All',
                    }
                  ),
                },
                ...SIGNAL_OUTCOMES.map((id) => ({ value: id, text: OUTCOME_LABELS[id] })),
              ]}
              onChange={(event) =>
                setOutcome(
                  event.target.value === ALL ? undefined : (event.target.value as SignalOutcome)
                )
              }
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiBasicTable
        data-test-subj="detectionEngineSignalsTable"
        tableCaption={i18n.translate('xpack.significantEventsApp.detectionEngine.signals.caption', {
          defaultMessage: 'Signals and what the pipeline did with each',
        })}
        items={data?.signals ?? []}
        columns={columns}
        loading={isLoading}
      />
    </>
  );
}
