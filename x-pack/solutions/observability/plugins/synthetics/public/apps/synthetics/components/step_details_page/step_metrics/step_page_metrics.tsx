/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle, EuiFlexGrid } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { formatMillisecond } from './step_metrics';
import { formatBytes } from '../hooks/use_object_metrics';
import { PageMetricsDefinitions, performanceMetrics } from './page_metrics_definitions';
import { JourneyStep } from '../../../../../../common/runtime_types';
import { ThresholdIndicator } from '../../common/components/thershold_indicator';

export const StepPageMetrics = ({ currentStep }: { currentStep?: JourneyStep }) => {
  const pageMetrics = currentStep?.synthetics?.payload?.pagemetrics;

  return (
    <>
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow>
          <EuiTitle size="xs">
            <h3>{METRICS_LABEL}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <PageMetricsDefinitions />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />
      <EuiFlexGrid gutterSize="l" columns={4}>
        {Object.entries(pageMetrics ?? {}).length > 0 &&
          performanceMetrics.map(({ label, key, description, bestPractice, unit }) => {
            const value = pageMetrics?.[key];
            let formattedVal: string;
            switch (unit) {
              case 'bytes':
                formattedVal = formatBytes(value ?? 0);
                break;
              case 'ms':
                formattedVal = formatMillisecond(value ?? 0, 4);
                break;
              default:
                formattedVal = `${value ?? 0} ${unit}`;
            }

            return (
              <EuiFlexItem key={label}>
                <ThresholdIndicator
                  asStat={true}
                  loading={false}
                  description={label}
                  current={value ?? 0}
                  currentFormatted={formattedVal}
                  hidePrevious={true}
                  helpText={description + (bestPractice ? ` ${bestPractice}` : '')}
                />
              </EuiFlexItem>
            );
          })}
      </EuiFlexGrid>
    </>
  );
};

const METRICS_LABEL = i18n.translate('xpack.synthetics.stepDetailsRoute.pageMetrics', {
  defaultMessage: 'Page metrics',
});
