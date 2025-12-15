/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { coreMock } from '@kbn/core/public/mocks';
import { KubernetesDashboardCard, KubernetesDashboardLink } from './kubernetes_dashboard_promotion';
import { useKibanaContextForPlugin } from '../../hooks/use_kibana';
import {
  INTEGRATION_DOCS_LINK,
  INTEGRATION_PAGE_PATH,
  KUBERNETES_INTEGRATION_ID,
  KUBERNETES_SEMCONV_INTEGRATION_ID,
  KUBERNETES_INTEGRATION_TAG,
  KUBERNETES_SEMCONV_INTEGRATION_TAG,
} from './constants';

jest.mock('../../hooks/use_kibana');
jest.mock('./kubernetes_asset_image', () => ({
  KubernetesAssetImage: ({ type }: { type: string }) => (
    <div data-test-subj={`kubernetes-asset-image-${type}`}>Mock Image</div>
  ),
}));

const useKibanaContextForPluginMock = useKibanaContextForPlugin as jest.MockedFunction<
  typeof useKibanaContextForPlugin
>;

const mockGetUrlForApp = jest.fn((app: string, options?: { path?: string }) => {
  return `/app/${app}${options?.path || ''}`;
});

const mockUseKibana = () => {
  useKibanaContextForPluginMock.mockReturnValue({
    services: {
      ...coreMock.createStart(),
      application: {
        ...coreMock.createStart().application,
        getUrlForApp: mockGetUrlForApp,
      },
    },
  } as unknown as ReturnType<typeof useKibanaContextForPlugin>);
};

const renderWithIntl = (component: React.ReactNode) => {
  return render(<IntlProvider locale="en">{component}</IntlProvider>);
};

describe('KubernetesDashboardCard', () => {
  beforeEach(() => {
    mockUseKibana();
    mockGetUrlForApp.mockClear();
  });

  describe('ECS integration', () => {
    it('renders correctly when integration is installed', () => {
      const onClose = jest.fn();
      renderWithIntl(
        <KubernetesDashboardCard
          integrationType="ecs"
          onClose={onClose}
          hasIntegrationInstalled={true}
        />
      );

      expect(screen.getByText('View Kubernetes Dashboards')).toBeInTheDocument();
      expect(screen.getByText('View Dashboards')).toBeInTheDocument();
      expect(screen.getByTestId('kubernetes-asset-image-ecs')).toBeInTheDocument();
      expect(screen.getByTestId('infraKubernetesDashboardCardLink')).toBeInTheDocument();
    });

    it('renders correctly when integration is not installed', () => {
      const onClose = jest.fn();
      renderWithIntl(
        <KubernetesDashboardCard
          integrationType="ecs"
          onClose={onClose}
          hasIntegrationInstalled={false}
        />
      );

      expect(screen.getByText('Install Kubernetes Integration')).toBeInTheDocument();
      expect(screen.getByText('View Integration')).toBeInTheDocument();
      expect(screen.getByTestId('infraKubernetesDashboardCardInstallLink')).toBeInTheDocument();
    });

    it('calls onClose when hide button is clicked', () => {
      const onClose = jest.fn();
      renderWithIntl(
        <KubernetesDashboardCard
          integrationType="ecs"
          onClose={onClose}
          hasIntegrationInstalled={true}
        />
      );

      fireEvent.click(screen.getByTestId('infraKubernetesDashboardCardHideThisButton'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('generates correct dashboard URL when installed', () => {
      const onClose = jest.fn();
      renderWithIntl(
        <KubernetesDashboardCard
          integrationType="ecs"
          onClose={onClose}
          hasIntegrationInstalled={true}
        />
      );

      expect(mockGetUrlForApp).toHaveBeenCalledWith('dashboards', {
        path: `#/list?_g=()&s=tag:(${KUBERNETES_INTEGRATION_TAG})`,
      });
    });

    it('generates correct integration URL when not installed', () => {
      const onClose = jest.fn();
      renderWithIntl(
        <KubernetesDashboardCard
          integrationType="ecs"
          onClose={onClose}
          hasIntegrationInstalled={false}
        />
      );

      expect(mockGetUrlForApp).toHaveBeenCalledWith('integrations', {
        path: `${INTEGRATION_PAGE_PATH}/${KUBERNETES_INTEGRATION_ID}`,
      });
    });

    it('renders docs link with correct URL', () => {
      const onClose = jest.fn();
      renderWithIntl(
        <KubernetesDashboardCard
          integrationType="ecs"
          onClose={onClose}
          hasIntegrationInstalled={true}
        />
      );

      const docsLink = screen.getByTestId('infraKubernetesDashboardCardIntegrationDocsLink');
      expect(docsLink).toHaveAttribute(
        'href',
        `${INTEGRATION_DOCS_LINK}/${KUBERNETES_INTEGRATION_ID}`
      );
      expect(docsLink).toHaveTextContent('Kubernetes Integration');
    });
  });

  describe('Semconv integration', () => {
    it('renders correctly when integration is installed', () => {
      const onClose = jest.fn();
      renderWithIntl(
        <KubernetesDashboardCard
          integrationType="semconv"
          onClose={onClose}
          hasIntegrationInstalled={true}
        />
      );

      expect(screen.getByText('View Kubernetes OpenTelemetry Dashboards')).toBeInTheDocument();
      expect(screen.getByText('View Dashboards')).toBeInTheDocument();
      expect(screen.getByTestId('kubernetes-asset-image-semconv')).toBeInTheDocument();
      expect(screen.getByTestId('infraSemconvKubernetesDashboardCardLink')).toBeInTheDocument();
    });

    it('renders correctly when integration is not installed', () => {
      const onClose = jest.fn();
      renderWithIntl(
        <KubernetesDashboardCard
          integrationType="semconv"
          onClose={onClose}
          hasIntegrationInstalled={false}
        />
      );

      expect(screen.getByText('Install Kubernetes OpenTelemetry Dashboards')).toBeInTheDocument();
      expect(screen.getByText('View Integration')).toBeInTheDocument();
      expect(
        screen.getByTestId('infraSemconvKubernetesDashboardCardInstallLink')
      ).toBeInTheDocument();
    });

    it('generates correct dashboard URL when installed', () => {
      const onClose = jest.fn();
      renderWithIntl(
        <KubernetesDashboardCard
          integrationType="semconv"
          onClose={onClose}
          hasIntegrationInstalled={true}
        />
      );

      expect(mockGetUrlForApp).toHaveBeenCalledWith('dashboards', {
        path: `#/list?_g=()&s=tag:(${KUBERNETES_SEMCONV_INTEGRATION_TAG})`,
      });
    });

    it('generates correct integration URL when not installed', () => {
      const onClose = jest.fn();
      renderWithIntl(
        <KubernetesDashboardCard
          integrationType="semconv"
          onClose={onClose}
          hasIntegrationInstalled={false}
        />
      );

      expect(mockGetUrlForApp).toHaveBeenCalledWith('integrations', {
        path: `${INTEGRATION_PAGE_PATH}/${KUBERNETES_SEMCONV_INTEGRATION_ID}`,
      });
    });

    it('renders docs link with correct URL', () => {
      const onClose = jest.fn();
      renderWithIntl(
        <KubernetesDashboardCard
          integrationType="semconv"
          onClose={onClose}
          hasIntegrationInstalled={true}
        />
      );

      const docsLink = screen.getByTestId('infraSemconvKubernetesDashboardCardIntegrationDocsLink');
      expect(docsLink).toHaveAttribute(
        'href',
        `${INTEGRATION_DOCS_LINK}/${KUBERNETES_SEMCONV_INTEGRATION_ID}`
      );
      expect(docsLink).toHaveTextContent('OpenTelemetry');
    });
  });
});

describe('KubernetesDashboardLink', () => {
  beforeEach(() => {
    mockUseKibana();
    mockGetUrlForApp.mockClear();
  });

  describe('ECS integration', () => {
    it('renders correctly', () => {
      renderWithIntl(<KubernetesDashboardLink integrationType="ecs" />);

      const link = screen.getByTestId('inventory-kubernetesDashboard-link');
      expect(link).toBeInTheDocument();
      expect(link).toHaveTextContent('Kubernetes Integration');
    });

    it('generates correct dashboard URL', () => {
      renderWithIntl(<KubernetesDashboardLink integrationType="ecs" />);

      expect(mockGetUrlForApp).toHaveBeenCalledWith('dashboards', {
        path: `#/list?_g=()&s=tag:(${KUBERNETES_INTEGRATION_TAG})`,
      });
    });
  });

  describe('Semconv integration', () => {
    it('renders correctly', () => {
      renderWithIntl(<KubernetesDashboardLink integrationType="semconv" />);

      const link = screen.getByTestId('inventory-semconvKubernetesDashboard-link');
      expect(link).toBeInTheDocument();
      expect(link).toHaveTextContent('Kubernetes OpenTelemetry');
    });

    it('generates correct dashboard URL', () => {
      renderWithIntl(<KubernetesDashboardLink integrationType="semconv" />);

      expect(mockGetUrlForApp).toHaveBeenCalledWith('dashboards', {
        path: `#/list?_g=()&s=tag:(${KUBERNETES_SEMCONV_INTEGRATION_TAG})`,
      });
    });
  });
});
