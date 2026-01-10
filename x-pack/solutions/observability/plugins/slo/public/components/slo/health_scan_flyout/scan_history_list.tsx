/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiBasicTable,
  type EuiBasicTableColumn,
  EuiButton,
  EuiButtonIcon,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { HealthScanSummary } from '@kbn/slo-schema';
import moment from 'moment';
import React from 'react';
import { useKibana } from '../../../hooks/use_kibana';

interface Props {
  scans: HealthScanSummary[];
  isLoading: boolean;
  onSelectScan: (scan: HealthScanSummary) => void;
  onRunScan: () => void;
  isScheduling: boolean;
}

export function ScanHistoryList({
  scans,
  onSelectScan,
  onRunScan,
  isLoading,
  isScheduling,
}: Props) {
  const { uiSettings } = useKibana().services;
  const dateFormat = uiSettings.get('dateFormat');

  const columns: Array<EuiBasicTableColumn<HealthScanSummary>> = [
    {
      field: 'latestTimestamp',
      name: i18n.translate('xpack.slo.healthScanFlyout.scanHistoryList.dateColumn', {
        defaultMessage: 'Date',
      }),
      render: (timestamp: string) => (
        <EuiText size="s">{moment(timestamp).format(dateFormat)}</EuiText>
      ),
      width: '40%',
    },
    {
      field: 'total',
      name: i18n.translate('xpack.slo.healthScanFlyout.scanHistoryList.scannedColumn', {
        defaultMessage: 'Scanned',
      }),
      render: (total: number) => <EuiText size="s">{total}</EuiText>,
      width: '20%',
    },
    {
      field: 'problematic',
      name: i18n.translate('xpack.slo.healthScanFlyout.scanHistoryList.issuesColumn', {
        defaultMessage: 'Issues',
      }),
      render: (problematic: number) => (
        <EuiBadge color={problematic > 0 ? 'danger' : 'success'}>{problematic}</EuiBadge>
      ),
      width: '20%',
    },
    {
      field: 'status',
      name: i18n.translate('xpack.slo.healthScanFlyout.scanHistoryList.statusColumn', {
        defaultMessage: 'Status',
      }),
      render: (status: string) => (
        <EuiBadge
          color={status === 'scheduled' ? 'hollow' : status === 'completed' ? 'success' : 'warning'}
        >
          {status}
        </EuiBadge>
      ),
      width: '20%',
    },
    {
      name: i18n.translate('xpack.slo.healthScanFlyout.scanHistoryList.actionsColumn', {
        defaultMessage: 'Actions',
      }),
      width: '20%',
      actions: [
        {
          render: (scan: HealthScanSummary) => (
            <EuiButtonIcon
              disabled={scan.status === 'pending'}
              iconType="inspect"
              aria-label={i18n.translate(
                'xpack.slo.healthScanFlyout.scanHistoryList.viewResultsAriaLabel',
                { defaultMessage: 'View results' }
              )}
              onClick={() => onSelectScan(scan)}
              data-test-subj={`healthScanViewResults-${scan.scanId}`}
            />
          ),
        },
      ],
    },
  ];

  if (isLoading && scans.length === 0) {
    return (
      <EuiFlexGroup alignItems="center" justifyContent="center" style={{ minHeight: 200 }}>
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="l" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <>
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <h3>
              {i18n.translate('xpack.slo.healthScanFlyout.scanHistoryList.title', {
                defaultMessage: 'Scan History',
              })}
            </h3>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            onClick={onRunScan}
            isLoading={isScheduling}
            iconType="play"
            size="s"
            data-test-subj="healthScanRunButton"
          >
            {i18n.translate('xpack.slo.healthScanFlyout.runScanButton', {
              defaultMessage: 'Run Scan',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      {scans.length === 0 ? (
        <EuiEmptyPrompt
          iconType="inspect"
          title={
            <h3>
              {i18n.translate('xpack.slo.healthScanFlyout.scanHistoryList.emptyTitle', {
                defaultMessage: 'No scans yet',
              })}
            </h3>
          }
          body={
            <p>
              {i18n.translate('xpack.slo.healthScanFlyout.scanHistoryList.emptyBody', {
                defaultMessage: 'Run a health scan to check all your SLOs for operational issues.',
              })}
            </p>
          }
        />
      ) : (
        <EuiBasicTable
          tableCaption="health scans"
          items={scans}
          columns={columns}
          rowProps={(scan) => ({
            'data-test-subj': `healthScanRow-${scan.scanId}`,
          })}
          data-test-subj="healthScanHistoryTable"
        />
      )}
    </>
  );
}
