/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  EuiMarkdownFormat,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React from 'react';

import * as i18n from '../translations';

export interface InspectDiagnosticReportFlyoutProps {
  onClose: () => void;
  report: string;
}

const InspectDiagnosticReportFlyoutComponent: React.FC<InspectDiagnosticReportFlyoutProps> = ({
  onClose,
  report,
}) => {
  const titleId = useGeneratedHtmlId();

  return (
    <EuiFlyout
      aria-labelledby={titleId}
      data-test-subj="inspectDiagnosticReportFlyout"
      onClose={onClose}
      size="m"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={titleId}>{i18n.INSPECT_DIAGNOSTIC_REPORT}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiMarkdownFormat textSize="s">{report}</EuiMarkdownFormat>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};

InspectDiagnosticReportFlyoutComponent.displayName = 'InspectDiagnosticReportFlyout';

export const InspectDiagnosticReportFlyout = React.memo(InspectDiagnosticReportFlyoutComponent);
