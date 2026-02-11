/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ErrorRateChart } from '../../../../components/slo/error_rate_chart';
import type { ErrorRatePanelProps } from './types';
import { useSloDetailsContext } from '../slo_details_context';

export function ErrorRatePagePanel({ dataTimeRange, onBrushed }: ErrorRatePanelProps) {
  const { slo } = useSloDetailsContext();
  return (
    <EuiPanel paddingSize="m" color="transparent" hasBorder data-test-subj="errorRatePanel">
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h2>
              {i18n.translate('xpack.slo.sloDetailsHistory.h2.errorRatePanelTitle', {
                defaultMessage: 'Error rate',
              })}
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        <ErrorRateChart
          slo={slo}
          dataTimeRange={dataTimeRange}
          onBrushed={onBrushed}
          variant={['VIOLATED', 'DEGRADING'].includes(slo.summary.status) ? 'danger' : 'success'}
        />
      </EuiFlexGroup>
    </EuiPanel>
  );
}
