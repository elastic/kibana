/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { OverviewErrorsSparklines } from './overview_errors_sparklines';
import { useRefreshedRangeFromUrl } from '../../../../../hooks';
import { OverviewErrorsCount } from './overview_errors_count';

export function OverviewErrors() {
  // Range now follows the page-level date picker (URL params). When the user
  // hasn't touched the picker, this falls back to "now-24h → now" via the
  // `now-24h` default in `getSupportedUrlParams`.
  const { from, to } = useRefreshedRangeFromUrl();

  return (
    <EuiPanel hasShadow={false} hasBorder>
      <EuiTitle size="xs">
        <h3>{headingText}</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="xl">
        <EuiFlexItem grow={false}>
          <OverviewErrorsCount from={from} to={to} />
        </EuiFlexItem>
        <EuiFlexItem grow={true}>
          <OverviewErrorsSparklines from={from} to={to} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}

const headingText = i18n.translate('xpack.synthetics.overview.errors.headingText', {
  defaultMessage: 'Errors',
});
