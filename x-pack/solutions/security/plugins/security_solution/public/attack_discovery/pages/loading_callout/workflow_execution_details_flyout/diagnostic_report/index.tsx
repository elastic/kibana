/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import React, { useCallback, useState } from 'react';

import { downloadBlob } from '../../../../../common/utils/download_blob';
import type { BuildDiagnosticReportParams } from './helpers/build_diagnostic_report';
import { buildDiagnosticReport } from './helpers/build_diagnostic_report';
import { InspectDiagnosticReportFlyout } from './inspect_diagnostic_report_flyout';
import * as i18n from './translations';

export interface DiagnosticReportProps extends BuildDiagnosticReportParams {
  executionUuid?: string;
}

const DiagnosticReportComponent: React.FC<DiagnosticReportProps> = (props) => {
  const [isCopied, setIsCopied] = useState(false);
  const [isInspecting, setIsInspecting] = useState(false);

  const report = buildDiagnosticReport(props);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(report);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  }, [report]);

  const handleDownload = useCallback(() => {
    const filename =
      props.executionUuid != null
        ? `attack-discovery-diagnostic-${props.executionUuid}.md`
        : 'attack-discovery-diagnostic.md';

    const blob = new Blob([report], { type: 'text/markdown' });
    downloadBlob(blob, filename);
  }, [props.executionUuid, report]);

  const handleCloseInspectFlyout = useCallback(() => {
    setIsInspecting(false);
  }, []);

  return (
    <>
      <EuiFlexGroup gutterSize="xs" responsive={false} wrap={false}>
        <EuiFlexItem grow={false}>
          <EuiToolTip
            content={i18n.INSPECT_DIAGNOSTIC_REPORT}
            disableScreenReaderOutput
            position="top"
          >
            <EuiButtonIcon
              aria-label={i18n.INSPECT_DIAGNOSTIC_REPORT}
              data-test-subj="inspectDiagnosticReportButton"
              iconType="inspect"
              onClick={() => setIsInspecting(true)}
              size="s"
            />
          </EuiToolTip>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          {/* disableScreenReaderOutput only when content matches aria-label to avoid duplicate announcements */}
          <EuiToolTip
            content={isCopied ? i18n.COPIED : i18n.COPY_DIAGNOSTIC_REPORT}
            disableScreenReaderOutput={!isCopied}
            position="top"
          >
            <EuiButtonIcon
              aria-label={i18n.COPY_DIAGNOSTIC_REPORT}
              data-test-subj="copyDiagnosticReportButton"
              iconType="copyClipboard"
              onClick={handleCopy}
              size="s"
            />
          </EuiToolTip>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiToolTip
            content={i18n.DOWNLOAD_DIAGNOSTIC_REPORT}
            disableScreenReaderOutput
            position="top"
          >
            <EuiButtonIcon
              aria-label={i18n.DOWNLOAD_DIAGNOSTIC_REPORT}
              data-test-subj="downloadDiagnosticReportButton"
              iconType="download"
              onClick={handleDownload}
              size="s"
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>

      {isInspecting && (
        <InspectDiagnosticReportFlyout onClose={handleCloseInspectFlyout} report={report} />
      )}
    </>
  );
};

DiagnosticReportComponent.displayName = 'DiagnosticReport';

export const DiagnosticReport = React.memo(DiagnosticReportComponent);
