/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

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
  persistSourceConfiguration: Mock;
  source: MockMetricsSource | undefined;
  sourceExists: boolean;
  isLoading: boolean;
} = {
  persistSourceConfiguration: vi.fn(),
  source: {
    configuration: {},
    origin: 'stored',
    status: { metricIndicesExist: false, remoteClustersExist: true },
  },
  sourceExists: true,
  isLoading: false,
};

vi.mock('@kbn/observability-shared-plugin/public', () => {
  const mocked = {
    Prompt: () => null,
    BottomBarActions: () => null,
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../hooks/use_metrics_breadcrumbs', () => {
  const mocked = {
    useMetricsBreadcrumbs: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../containers/metrics_source', () => {
  const mocked = {
    useSourceContext: () => mockSourceContext,
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../containers/ml/infra_ml_capabilities', () => {
  const mocked = {
    useInfraMLCapabilitiesContext: () => ({ hasInfraMLCapabilities: false }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../components/page_template', () => {
  const mocked = {
    PageTemplate: ({
      children,
      'data-test-subj': dataTestSubj,
    }: {
      children: React.ReactNode;
      'data-test-subj'?: string;
    }) => <div data-test-subj={dataTestSubj}>{children}</div>,
  };
  return { ...mocked, default: mocked };
});

vi.mock('./indices_configuration_panel', () => {
  const mocked = {
    IndicesConfigurationPanel: () => <div data-test-subj="indicesConfigurationPanel" />,
  };
  return { ...mocked, default: mocked };
});

vi.mock('./ml_configuration_panel', () => {
  const mocked = {
    MLConfigurationPanel: () => <div data-test-subj="mlConfigurationPanel" />,
  };
  return { ...mocked, default: mocked };
});

vi.mock('./name_configuration_panel', () => {
  const mocked = {
    NameConfigurationPanel: () => <div data-test-subj="nameConfigurationPanel" />,
  };
  return { ...mocked, default: mocked };
});

vi.mock('./source_configuration_form_state', () => {
  const mocked = {
    useSourceConfigurationFormState: () => ({
      indicesConfigurationProps: { name: {}, metricAlias: {}, anomalyThreshold: {} },
      errors: [],
      resetForm: vi.fn(),
      isFormValid: true,
      formState: {},
      formStateChanges: {},
      getUnsavedChanges: () => ({}),
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../header/use_metrics_app_header_menu', () => {
  const mocked = {
    useMetricsAppHeaderMenu: () => ({
      menu: { items: [] },
      flyouts: null,
    }),
  };
  return { ...mocked, default: mocked };
});

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
