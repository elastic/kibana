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
import React, { useState } from 'react';
import { ScanHistoryList } from './scan_history_list';
import { ScanResultsPanel } from './scan_results_panel';

interface Props {
  onClose: () => void;
}

export function HealthScanFlyout({ onClose }: Props) {
  const flyoutTitleId = useGeneratedHtmlId({ prefix: 'healthScanFlyout' });
  const [selectedScanId, setSelectedScanId] = useState<string | null>();

  const handleBackToList = () => {
    setSelectedScanId(null);
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
          {selectedScanId && (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                iconType="arrowLeft"
                onClick={handleBackToList}
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
                {selectedScanId
                  ? i18n.translate('xpack.slo.healthScanFlyout.resultsTitle', {
                      defaultMessage: 'Health Scan Results',
                    })
                  : i18n.translate('xpack.slo.healthScanFlyout.title', {
                      defaultMessage: 'Health Scans',
                    })}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {selectedScanId ? (
          <ScanResultsPanel scanId={selectedScanId} />
        ) : (
          <ScanHistoryList onSelectScanId={setSelectedScanId} />
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
