/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { METRIC_CHART_HEIGHT } from '../../../../../../common/visualizations/constants';

interface ChartPlaceholderProps {
  error?: unknown;
}

export const ChartPlaceholder = ({ error }: ChartPlaceholderProps) => {
  const isError = Boolean(error);
  const iconType = isError ? 'alert' : 'visLine';
  const title = isError
    ? i18n.translate('xpack.infra.hostsViewPage.metricChart.errorTitle', {
        defaultMessage: 'Unable to load chart',
      })
    : i18n.translate('xpack.infra.hostsViewPage.metricChart.noDataTitle', {
        defaultMessage: 'No data available',
      });
  const body = isError
    ? i18n.translate('xpack.infra.hostsViewPage.metricChart.errorBody', {
        defaultMessage:
          'There was an error loading the hosts data. Try adjusting your filters or time range.',
      })
    : i18n.translate('xpack.infra.hostsViewPage.metricChart.noDataBody', {
        defaultMessage:
          'No hosts match your current search criteria. Try adjusting your filters or time range.',
      });

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="m"
      css={css`
        min-height: ${METRIC_CHART_HEIGHT}px;
        display: flex;
        align-items: center;
        justify-content: center;
      `}
    >
      <EuiFlexGroup gutterSize="s" justifyContent="center" alignItems="center" direction="column">
        <EuiFlexItem grow={false}>
          <EuiIcon type={iconType} size="l" color={isError ? 'danger' : 'subdued'} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s" textAlign="center">
            <strong>{title}</strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" textAlign="center" color="subdued">
            {body}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
