/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { ErrorRateChart } from '../../../../components/slo/error_rate_chart';
import { SloFlyoutPanel } from '../../shared_flyout/flyout_panel';
import type { ErrorRatePanelProps } from './types';

export function ErrorRateFlyoutPanel({ slo, dataTimeRange, onBrushed }: ErrorRatePanelProps) {
  return (
    <SloFlyoutPanel
      title={i18n.translate('xpack.slo.sloDetailsHistory.h2.errorRatePanelTitle', {
        defaultMessage: 'Error rate',
      })}
      renderTooltip
    >
      <ErrorRateChart
        slo={slo}
        dataTimeRange={dataTimeRange}
        onBrushed={onBrushed}
        variant={['VIOLATED', 'DEGRADING'].includes(slo.summary.status) ? 'danger' : 'success'}
      />
    </SloFlyoutPanel>
  );
}
