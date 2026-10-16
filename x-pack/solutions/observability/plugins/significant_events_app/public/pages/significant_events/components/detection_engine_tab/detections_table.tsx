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
  DETECTION_OUTCOMES,
  DETECTION_STRATEGY_IDS,
  type DetectionOutcome,
  type DetectionStrategyId,
  type EngineDetection,
} from '@kbn/significant-events-detection-engine-plugin/common';
import React, { useState } from 'react';
import { useDetectionEngineDetections } from '../../../../hooks/use_detection_engine_detections';
import { OUTCOME_COLORS, OUTCOME_LABELS, STRATEGY_ICONS, STRATEGY_LABELS } from './labels';

const ALL = '__all__';

interface IDetectionsTableProps {
  onOpenEvent: (eventId: string) => void;
}

/**
 * Every detection in the common format, with what the pipeline did with it. This is where "why
 * did this not become an event?" gets its answer.
 */
export function DetectionsTable({ onOpenEvent }: IDetectionsTableProps) {
  const [strategy, setStrategy] = useState<DetectionStrategyId | undefined>();
  const [outcome, setOutcome] = useState<DetectionOutcome | undefined>();
  const { data, isLoading } = useDetectionEngineDetections({ strategy, outcome });

  const columns: Array<EuiBasicTableColumn<EngineDetection>> = [
    {
      field: 'bucket_start',
      name: i18n.translate('xpack.significantEventsApp.detectionEngine.detections.bucket', {
        defaultMessage: 'Bucket',
      }),
      width: '100px',
      render: (bucketStart: string) => new Date(bucketStart).toLocaleTimeString(),
    },
    {
      field: 'title',
      name: i18n.translate('xpack.significantEventsApp.detectionEngine.detections.what', {
        defaultMessage: 'What looks off',
      }),
      render: (title: string, detection: EngineDetection) => (
        <div>
          <EuiIcon type={STRATEGY_ICONS[detection.strategy]} aria-hidden={true} /> {title}
          <EuiText size="xs" color="subdued">
            {STRATEGY_LABELS[detection.strategy]} · {detection.service} ·{' '}
            {i18n.translate('xpack.significantEventsApp.detectionEngine.detections.importance', {
              defaultMessage: 'importance {importance}',
              values: { importance: detection.importance },
            })}
          </EuiText>
        </div>
      ),
    },
    {
      field: 'baseline',
      name: i18n.translate('xpack.significantEventsApp.detectionEngine.detections.baseline', {
        defaultMessage: 'Value vs normal',
      }),
      width: '220px',
      render: (baseline: EngineDetection['baseline'], detection: EngineDetection) => (
        <EuiText size="xs">
          {i18n.translate('xpack.significantEventsApp.detectionEngine.detections.valueVsNormal', {
            defaultMessage:
              '{value} {unit}; median {median}, threshold {threshold}, {samples} samples',
            values: {
              value: Math.round(detection.value * 1000) / 1000,
              unit: detection.unit,
              median:
                baseline.median === undefined ? '-' : Math.round(baseline.median * 1000) / 1000,
              threshold:
                baseline.threshold === undefined
                  ? '-'
                  : Math.round(baseline.threshold * 1000) / 1000,
              samples: baseline.samples,
            },
          })}
          {baseline.excludedSamples > 0 &&
            i18n.translate('xpack.significantEventsApp.detectionEngine.detections.excluded', {
              defaultMessage: ' ({excluded} left out: an event was open)',
              values: { excluded: baseline.excludedSamples },
            })}
        </EuiText>
      ),
    },
    {
      field: 'outcome',
      name: i18n.translate('xpack.significantEventsApp.detectionEngine.detections.outcome', {
        defaultMessage: 'Outcome',
      }),
      render: (value: DetectionOutcome, detection: EngineDetection) => (
        <div>
          <EuiBadge color={OUTCOME_COLORS[value]}>{OUTCOME_LABELS[value]}</EuiBadge>
          <EuiText size="xs" color="subdued">
            {detection.outcome_reason}
          </EuiText>
          {detection.event_id && (
            <EuiLink
              data-test-subj="significantEventsAppColumnsOpenEventLink"
              onClick={() => onOpenEvent(detection.event_id!)}
            >
              {i18n.translate('xpack.significantEventsApp.detectionEngine.detections.openEvent', {
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
            label={i18n.translate(
              'xpack.significantEventsApp.detectionEngine.detections.strategy',
              {
                defaultMessage: 'Strategy',
              }
            )}
          >
            <EuiSelect
              data-test-subj="significantEventsAppDetectionsTableSelect"
              compressed
              value={strategy ?? ALL}
              options={[
                {
                  value: ALL,
                  text: i18n.translate(
                    'xpack.significantEventsApp.detectionEngine.detections.all',
                    {
                      defaultMessage: 'All',
                    }
                  ),
                },
                ...DETECTION_STRATEGY_IDS.map((id) => ({ value: id, text: STRATEGY_LABELS[id] })),
              ]}
              onChange={(event) =>
                setStrategy(
                  event.target.value === ALL
                    ? undefined
                    : (event.target.value as DetectionStrategyId)
                )
              }
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow
            display="rowCompressed"
            label={i18n.translate(
              'xpack.significantEventsApp.detectionEngine.detections.outcomeFilter',
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
                    'xpack.significantEventsApp.detectionEngine.detections.allOutcomes',
                    {
                      defaultMessage: 'All',
                    }
                  ),
                },
                ...DETECTION_OUTCOMES.map((id) => ({ value: id, text: OUTCOME_LABELS[id] })),
              ]}
              onChange={(event) =>
                setOutcome(
                  event.target.value === ALL ? undefined : (event.target.value as DetectionOutcome)
                )
              }
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiBasicTable
        data-test-subj="detectionEngineDetectionsTable"
        tableCaption={i18n.translate(
          'xpack.significantEventsApp.detectionEngine.detections.caption',
          {
            defaultMessage: 'Detections and what the pipeline did with each',
          }
        )}
        items={data?.detections ?? []}
        columns={columns}
        loading={isLoading}
      />
    </>
  );
}
