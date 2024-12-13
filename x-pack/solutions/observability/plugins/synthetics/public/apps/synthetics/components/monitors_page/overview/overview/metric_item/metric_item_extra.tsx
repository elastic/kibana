/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIconTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { formatDuration } from '../../../../../utils/formatting';

export const MetricItemExtra = ({
  stats,
}: {
  stats: {
    medianDuration: number | null;
    avgDuration: number | null;
    minDuration: number | null;
    maxDuration: number | null;
  };
}) => {
  const { avgDuration, minDuration, maxDuration } = stats;
  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="xs"
      justifyContent="flexEnd"
      // empty title to prevent default title from showing
      title=""
      component="span"
    >
      <EuiFlexItem grow={false} component="span">
        {i18n.translate('xpack.synthetics.overview.duration.label', {
          defaultMessage: 'Duration',
        })}
      </EuiFlexItem>
      <EuiFlexItem grow={false} component="span">
        {avgDuration && minDuration && maxDuration ? (
          <EuiIconTip
            title={i18n.translate('xpack.synthetics.overview.duration.description', {
              defaultMessage: 'Median duration of last 50 checks',
            })}
            content={i18n.translate('xpack.synthetics.overview.duration.description.values', {
              defaultMessage: 'Avg: {avg}, Min: {min}, Max: {max}',
              values: {
                avg: formatDuration(avgDuration, { noSpace: true }),
                min: formatDuration(minDuration, { noSpace: true }),
                max: formatDuration(maxDuration, { noSpace: true }),
              },
            })}
            position="top"
          />
        ) : (
          <EuiIconTip
            title={i18n.translate('xpack.synthetics.overview.metricsTooltip.noMetrics.title', {
              defaultMessage: 'Metric data is not available',
            })}
            content={i18n.translate('xpack.synthetics.overview.metricsTooltip.noMetrics.content', {
              defaultMessage: 'No metric data available for this monitor',
            })}
          />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
