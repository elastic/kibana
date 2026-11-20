/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import type { MetricIndicesStatus } from '../../../../common/metrics_sources';
import { IndicesConfigurationPanel } from './indices_configuration_panel';

jest.mock('../../../hooks/use_kibana', () => ({
  useKibanaContextForPlugin: () => ({
    services: {
      share: { url: { locators: { get: () => undefined } } },
    },
  }),
}));

const WARNING_CALLOUT = 'infraIndicesPanelSettingsWarningCallout';
const CHECK_INCOMPLETE_CALLOUT = 'infraIndicesPanelSettingsCheckIncompleteCallout';
const RETRY_BUTTON = 'infraIndicesPanelSettingsCheckIncompleteRetryButton';
const DANGER_CALLOUT = 'infraIndicesPanelSettingsDangerCallout';

const renderPanel = (
  props: {
    metricIndicesStatus?: MetricIndicesStatus;
    metricIndicesExist?: boolean;
    remoteClustersExist?: boolean;
    onRetryMetricIndicesCheck?: () => void;
  } = {}
) =>
  render(
    <I18nProvider>
      <EuiProvider>
        <IndicesConfigurationPanel
          isLoading={false}
          readOnly={false}
          metricAliasFieldProps={{
            name: 'metricAlias',
            value: 'metrics-*',
            isInvalid: false,
            onChange: jest.fn(),
            error: [],
          }}
          isMetricAliasChanged={false}
          numberOfInfraRules={0}
          metricIndicesExist={false}
          remoteClustersExist
          {...props}
        />
      </EuiProvider>
    </I18nProvider>
  );

describe('IndicesConfigurationPanel status callouts', () => {
  it('shows the no-match callout when the indices are confirmed missing', () => {
    renderPanel({ metricIndicesStatus: 'missing' });

    expect(screen.getByTestId(WARNING_CALLOUT)).toBeInTheDocument();
    expect(screen.queryByTestId(CHECK_INCOMPLETE_CALLOUT)).not.toBeInTheDocument();
  });

  it('shows the check-incomplete callout instead of the no-match callout when the status is unknown', () => {
    renderPanel({ metricIndicesStatus: 'unknown' });

    expect(screen.getByTestId(CHECK_INCOMPLETE_CALLOUT)).toBeInTheDocument();
    expect(screen.queryByTestId(WARNING_CALLOUT)).not.toBeInTheDocument();
  });

  it('calls the retry callback when retry is clicked', () => {
    const onRetryMetricIndicesCheck = jest.fn();
    renderPanel({ metricIndicesStatus: 'unknown', onRetryMetricIndicesCheck });

    fireEvent.click(screen.getByTestId(RETRY_BUTTON));

    expect(onRetryMetricIndicesCheck).toHaveBeenCalledTimes(1);
  });

  it('shows no status callout when the indices are available', () => {
    renderPanel({ metricIndicesStatus: 'available', metricIndicesExist: true });

    expect(screen.queryByTestId(WARNING_CALLOUT)).not.toBeInTheDocument();
    expect(screen.queryByTestId(CHECK_INCOMPLETE_CALLOUT)).not.toBeInTheDocument();
  });

  it('shows only the remote cluster callout when the remote cluster is missing', () => {
    renderPanel({ metricIndicesStatus: 'unknown', remoteClustersExist: false });

    expect(screen.getByTestId(DANGER_CALLOUT)).toBeInTheDocument();
    expect(screen.queryByTestId(CHECK_INCOMPLETE_CALLOUT)).not.toBeInTheDocument();
  });
});
