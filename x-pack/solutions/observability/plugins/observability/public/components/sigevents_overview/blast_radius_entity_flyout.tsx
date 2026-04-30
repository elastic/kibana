/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  EuiText,
  EuiSpacer,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export interface BlastRadiusEntityFlyoutProps {
  title: string;
  onClose: () => void;
}

export function BlastRadiusEntityFlyout({ title, onClose }: BlastRadiusEntityFlyoutProps) {
  const headingId = useGeneratedHtmlId();

  return (
    <EuiFlyout
      type="push"
      side="right"
      size="s"
      onClose={onClose}
      aria-labelledby={headingId}
      pushMinBreakpoint="xs"
      paddingSize="m"
      data-test-subj="sigeventsOverviewBlastRadiusEntityFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={headingId}>{title}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiText size="s">
          <p>
            <FormattedMessage
              id="xpack.observability.sigeventsOverview.entityFlyout.prototypeBody"
              defaultMessage="Detail view for affected entity. Replace with live entity data, related signals, and recommended next steps."
            />
          </p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiText size="xs" color="subdued">
          <FormattedMessage
            id="xpack.observability.sigeventsOverview.entityFlyout.sampleFields"
            defaultMessage="Sample fields: affected services, hosts, dependencies, and time range for this group."
          />
        </EuiText>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
}
