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
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ServiceSummary } from '@kbn/significant-events-plugin/common';
import React from 'react';
import { useDetectionEngineServices } from '../../../../hooks/use_detection_engine_services';
import { STRATEGY_LABELS } from './labels';

/** What the engine watches and found, organised by service rather than by object type. */
export function ServicesTable() {
  const { data, isLoading } = useDetectionEngineServices();

  const columns: Array<EuiBasicTableColumn<ServiceSummary>> = [
    {
      field: 'service',
      name: i18n.translate('xpack.significantEventsApp.detectionEngine.services.service', {
        defaultMessage: 'Service',
      }),
      width: '160px',
      render: (service: string) => <strong>{service}</strong>,
    },
    {
      field: 'watched_by',
      name: i18n.translate('xpack.significantEventsApp.detectionEngine.services.watchedBy', {
        defaultMessage: 'Watched by (series, last hour)',
      }),
      render: (watchedBy: ServiceSummary['watched_by']) => (
        <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
          {watchedBy.map(({ strategy, series }) => (
            <EuiFlexItem grow={false} key={strategy}>
              <EuiBadge color="hollow">
                {STRATEGY_LABELS[strategy]}: {series}
              </EuiBadge>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      ),
    },
    {
      field: 'detections_last_hour',
      name: i18n.translate('xpack.significantEventsApp.detectionEngine.services.detections', {
        defaultMessage: 'Detections, last hour',
      }),
      width: '160px',
    },
    {
      field: 'open_events',
      name: i18n.translate('xpack.significantEventsApp.detectionEngine.services.openEvents', {
        defaultMessage: 'Open events',
      }),
      width: '120px',
      render: (openEvents: number) =>
        openEvents > 0 ? <EuiBadge color="danger">{openEvents}</EuiBadge> : openEvents,
    },
    {
      field: 'last_event_title',
      name: i18n.translate('xpack.significantEventsApp.detectionEngine.services.lastEvent', {
        defaultMessage: 'Latest event',
      }),
      render: (title?: string) => title ?? '-',
    },
  ];

  return (
    <EuiBasicTable
      data-test-subj="detectionEngineServicesTable"
      tableCaption={i18n.translate('xpack.significantEventsApp.detectionEngine.services.caption', {
        defaultMessage: 'Services the detection engine watches',
      })}
      items={data?.services ?? []}
      columns={columns}
      loading={isLoading}
    />
  );
}
