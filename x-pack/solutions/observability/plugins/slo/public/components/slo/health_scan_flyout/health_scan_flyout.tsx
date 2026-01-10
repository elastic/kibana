/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { HealthScanSummary } from '@kbn/slo-schema';
import React, { useState } from 'react';
import { useListHealthScans } from '../../../hooks/use_list_health_scans';
import { useScheduleHealthScan } from '../../../hooks/use_schedule_health_scan';
import { ScanHistoryList } from './scan_history_list';
import { ScanResultsPanel } from './scan_results_panel';

interface Props {
  onClose: () => void;
}

export function HealthScanFlyout({ onClose }: Props) {
  const flyoutTitleId = useGeneratedHtmlId({ prefix: 'healthScanFlyout' });
  const [selectedScan, setSelectedScan] = useState<HealthScanSummary | null>(null);

  const { data: scansData, isLoading: isLoadingScans } = useListHealthScans({
    refetchInterval: 10000,
  });
  const { mutate: scheduleHealthScan, isLoading: isScheduling } = useScheduleHealthScan();

  const handleRunScan = () => {
    scheduleHealthScan({ force: true });
  };

  const handleBackToHistory = () => {
    setSelectedScan(null);
  };

  return (
    <EuiFlyout
      onClose={onClose}
      aria-labelledby={flyoutTitleId}
      size="m"
      data-test-subj="healthScanFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center" gutterSize="s">
          {selectedScan && (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                iconType="arrowLeft"
                onClick={handleBackToHistory}
                data-test-subj="healthScanBackButton"
                size="s"
              >
                {i18n.translate('xpack.slo.healthScanFlyout.backButton', {
                  defaultMessage: 'Back',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          )}
          <EuiFlexItem>
            <EuiTitle size="m">
              <h2 id={flyoutTitleId}>
                {selectedScan
                  ? i18n.translate('xpack.slo.healthScanFlyout.resultsTitle', {
                      defaultMessage: 'Scan Results',
                    })
                  : i18n.translate('xpack.slo.healthScanFlyout.title', {
                      defaultMessage: 'Health Scan',
                    })}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {selectedScan ? (
          <ScanResultsPanel scan={selectedScan} />
        ) : (
          <ScanHistoryList
            scans={scansData?.scans ?? []}
            isLoading={isLoadingScans}
            onSelectScan={setSelectedScan}
            onRunScan={handleRunScan}
            isScheduling={isScheduling}
          />
        )}
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButton onClick={onClose} data-test-subj="healthScanCloseButton">
              {i18n.translate('xpack.slo.healthScanFlyout.closeButton', {
                defaultMessage: 'Close',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}
