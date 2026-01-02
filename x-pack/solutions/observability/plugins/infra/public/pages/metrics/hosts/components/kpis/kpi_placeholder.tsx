/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexItem, EuiPanel, EuiFlexGroup, EuiIcon, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { KPI_CHART_HEIGHT } from '../../../../../common/visualizations/constants';

interface KpiPlaceholderProps {
  error?: unknown;
  count: number;
}

const SingleKpiPlaceholder = ({ error }: { error?: unknown }) => {
  const isError = Boolean(error);
  const iconType = isError ? 'alert' : 'visLine';
  const title = isError
    ? i18n.translate('xpack.infra.hostsViewPage.kpiChart.errorTitle', {
        defaultMessage: 'Unable to load KPIs',
      })
    : i18n.translate('xpack.infra.hostsViewPage.kpiChart.noDataTitle', {
        defaultMessage: 'No data available',
      });
  const body = isError
    ? i18n.translate('xpack.infra.hostsViewPage.kpiChart.errorBody', {
        defaultMessage: 'There was an error loading the hosts data.',
      })
    : i18n.translate('xpack.infra.hostsViewPage.kpiChart.noDataBody', {
        defaultMessage: 'No hosts match your current search criteria.',
      });

  return (
    <EuiFlexItem>
      <EuiPanel
        hasBorder
        borderRadius="m"
        hasShadow={false}
        paddingSize="m"
        css={css`
          min-height: ${KPI_CHART_HEIGHT}px;
          display: flex;
          align-items: center;
          justify-content: center;
        `}
      >
        <EuiFlexGroup gutterSize="s" justifyContent="center" alignItems="center" direction="column">
          <EuiFlexItem grow={false}>
            <EuiIcon type={iconType} size="m" color={isError ? 'danger' : 'subdued'} />
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
    </EuiFlexItem>
  );
};

export const KpiPlaceholder = ({ error, count }: KpiPlaceholderProps) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <SingleKpiPlaceholder key={index} error={error} />
      ))}
    </>
  );
};
