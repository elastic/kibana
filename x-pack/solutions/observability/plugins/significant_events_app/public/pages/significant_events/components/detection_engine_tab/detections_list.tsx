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
import type { EngineDetection } from '@kbn/significant-events-detection-engine-plugin/common';
import React from 'react';
import { formatTime, formatValue } from './format';
import { OUTCOME_COLORS, OUTCOME_LABELS, STRATEGY_ICONS, STRATEGY_LABELS } from './labels';

const PAGE_SIZE = 20;

interface IDetectionsListProps {
  detections: EngineDetection[];
}

/** Every detection of one event, minute by minute, with what the engine did with it. */
export function DetectionsList({ detections }: IDetectionsListProps) {
  const columns: Array<EuiBasicTableColumn<EngineDetection>> = [
    {
      field: 'bucket_start',
      name: i18n.translate('xpack.significantEventsApp.detectionEngine.detectionsList.minute', {
        defaultMessage: 'Minute',
      }),
      width: '90px',
      sortable: true,
      render: (bucketStart: string) => formatTime(bucketStart),
    },
    {
      field: 'title',
      name: i18n.translate('xpack.significantEventsApp.detectionEngine.detectionsList.signal', {
        defaultMessage: 'Signal',
      }),
      render: (title: string, detection: EngineDetection) => (
        <EuiText size="xs">
          <EuiIcon
            type={STRATEGY_ICONS[detection.strategy]}
            aria-label={STRATEGY_LABELS[detection.strategy]}
          />{' '}
          {title}
        </EuiText>
      ),
    },
    {
      field: 'value',
      name: i18n.translate('xpack.significantEventsApp.detectionEngine.detectionsList.value', {
        defaultMessage: 'Value / normal up to',
      }),
      width: '150px',
      render: (value: number, detection: EngineDetection) => (
        <EuiText size="xs">
          {formatValue(value, detection.unit)}
          {detection.baseline.threshold !== undefined &&
            ` / ${formatValue(detection.baseline.threshold, detection.unit)}`}
        </EuiText>
      ),
    },
    {
      field: 'outcome',
      name: i18n.translate('xpack.significantEventsApp.detectionEngine.detectionsList.outcome', {
        defaultMessage: 'What the engine did',
      }),
      render: (outcome: EngineDetection['outcome'], detection: EngineDetection) => (
        <EuiText size="xs">
          <EuiBadge color={OUTCOME_COLORS[outcome]}>{OUTCOME_LABELS[outcome]}</EuiBadge>{' '}
          {detection.outcome_reason}
        </EuiText>
      ),
    },
  ];

  return (
    <EuiInMemoryTable
      data-test-subj="detectionEngineEventDetections"
      tableCaption={i18n.translate(
        'xpack.significantEventsApp.detectionEngine.detectionsList.caption',
        { defaultMessage: 'Detections behind this event' }
      )}
      compressed
      items={detections}
      itemId="detection_id"
      columns={columns}
      pagination={{ pageSize: PAGE_SIZE, showPerPageOptions: false }}
      sorting={{ sort: { field: 'bucket_start', direction: 'desc' } }}
    />
  );
}
