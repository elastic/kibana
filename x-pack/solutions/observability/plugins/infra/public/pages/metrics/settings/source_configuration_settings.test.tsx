/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { SourceConfigurationSettings } from './source_configuration_settings';
import { settingsTitle } from '../../../translations';

interface MockMetricsSource {
  configuration: { metricAlias?: string };
  origin: string;
  status: { metricIndicesExist: boolean; remoteClustersExist: boolean };
}

const mockSourceContext: {
  persistSourceConfiguration: jest.Mock;
  source: MockMetricsSource | undefined;
  sourceExists: boolean;
  isLoading: boolean;
} = {
  persistSourceConfiguration: jest.fn(),
  source: {
    configuration: {},
    origin: 'stored',
    status: { metricIndicesExist: false, remoteClustersExist: true },
  },
  sourceExists: true,
  isLoading: false,
};

jest.mock('@kbn/observability-shared-plugin/public', () => ({
  Prompt: () => null,
  BottomBarActions: () => null,
}));

jest.mock('../../../hooks/use_metrics_breadcrumbs', () => ({
  useMetricsBreadcrumbs: jest.fn(),
}));

jest.mock('../../../containers/metrics_source', () => ({
  useSourceContext: () => mockSourceContext,
}));

jest.mock('../../../containers/ml/infra_ml_capabilities', () => ({
  useInfraMLCapabilitiesContext: () => ({ hasInfraMLCapabilities: false }),
}));

jest.mock('../../../components/page_template', () => ({
  PageTemplate: ({
    children,
    'data-test-subj': dataTestSubj,
  }: {
    children: React.ReactNode;
    'data-test-subj'?: string;
  }) => <div data-test-subj={dataTestSubj}>{children}</div>,
}));

jest.mock('./indices_configuration_panel', () => ({
  IndicesConfigurationPanel: () => <div data-test-subj="indicesConfigurationPanel" />,
}));

jest.mock('./ml_configuration_panel', () => ({
  MLConfigurationPanel: () => <div data-test-subj="mlConfigurationPanel" />,
}));

jest.mock('./name_configuration_panel', () => ({
  NameConfigurationPanel: () => <div data-test-subj="nameConfigurationPanel" />,
}));

jest.mock('./source_configuration_form_state', () => ({
  useSourceConfigurationFormState: () => ({
    indicesConfigurationProps: { name: {}, metricAlias: {}, anomalyThreshold: {} },
    errors: [],
    resetForm: jest.fn(),
    isFormValid: true,
    formState: {},
    formStateChanges: {},
    getUnsavedChanges: () => ({}),
  }),
}));

jest.mock('../header/use_metrics_app_header_menu', () => ({
  useMetricsAppHeaderMenu: () => ({
    menu: { items: [] },
    flyouts: null,
  }),
}));

const renderSettings = () =>
  render(
    <EuiProvider>
      <MockAppHeaderProvider>
        <SourceConfigurationSettings shouldAllowEdit={true} />
      </MockAppHeaderProvider>
    </EuiProvider>
  );

describe('SourceConfigurationSettings', () => {
  beforeEach(() => {
    mockSourceContext.source = {
      configuration: {},
      origin: 'stored',
      status: { metricIndicesExist: false, remoteClustersExist: true },
    };
    mockSourceContext.sourceExists = true;
    mockSourceContext.isLoading = false;
  });

  it('renders AppHeader with Settings title and no back when the source is loaded', async () => {
    renderSettings();

    expect(await screen.findByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent(
      settingsTitle
    );
    expect(screen.queryByTestId(APP_HEADER_TEST_SUBJECTS.back)).not.toBeInTheDocument();
    expect(screen.getByTestId('nameConfigurationPanel')).toBeInTheDocument();
    expect(screen.getByTestId('indicesConfigurationPanel')).toBeInTheDocument();
    expect(screen.queryByTestId('sourceLoadingPage')).not.toBeInTheDocument();
  });

  it('keeps AppHeader without back while source configuration is loading', async () => {
    mockSourceContext.isLoading = true;
    mockSourceContext.source = undefined;

    renderSettings();

    expect(await screen.findByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent(
      settingsTitle
    );
    expect(screen.queryByTestId(APP_HEADER_TEST_SUBJECTS.back)).not.toBeInTheDocument();
    expect(screen.getByTestId('sourceLoadingPage')).toBeInTheDocument();
    expect(screen.queryByTestId('nameConfigurationPanel')).not.toBeInTheDocument();
  });
});
