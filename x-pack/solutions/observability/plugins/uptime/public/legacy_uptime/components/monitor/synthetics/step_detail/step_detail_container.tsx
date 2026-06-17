/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiText, EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useMonitorBreadcrumb } from './use_monitor_breadcrumb';
import { WaterfallChartContainer } from './waterfall/waterfall_chart_container';
import { useStepDetailPage } from '../../../../pages/synthetics/step_detail_page';

export const NO_STEP_DATA = i18n.translate('xpack.uptime.synthetics.stepDetail.noData', {
  defaultMessage: 'No data could be found for this step',
});

interface Props {
  checkGroup: string;
  stepIndex: number;
}

export const StepDetailContainer: React.FC<Props> = ({ checkGroup, stepIndex }) => {
  const { activeStep, journey } = useStepDetailPage();

  useMonitorBreadcrumb({ details: journey?.details, activeStep, performanceBreakDownView: true });

  return (
    <>
      {(!journey || journey.loading) && (
        <EuiFlexGroup justifyContent="center">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="xl" />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
      {journey && !activeStep && !journey.loading && (
        <EuiFlexGroup justifyContent="center">
          <EuiFlexItem>
            <EuiText textAlign="center">
              <p>{NO_STEP_DATA}</p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
      {journey && activeStep && !journey.loading && (
        <WaterfallChartContainer
          checkGroup={checkGroup}
          stepIndex={stepIndex}
          activeStep={activeStep}
        />
      )}
    </>
  );
};
