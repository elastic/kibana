/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import type { DataSchemaFormat } from '@kbn/metrics-data-access-plugin/common';
import type {
  InfraWaffleMapNode,
  InfraWaffleMapOptions,
} from '../../../../../common/inventory/types';
import { InfraFormatterType } from '../../../../../common/inventory/types';
import { NodeContextMenu } from './node_context_menu';

const mockGetRedirectUrl = jest.fn((params: { query?: { language: string; query: string } }) => {
  if (params.query) {
    return `/app/logs/stream?logFilter=(query:(language:${params.query.language},query:'${params.query.query}'))`;
  }
  return '/app/uptime';
});

const mockGetAssetDetailUrl = jest.fn(
  ({
    entityType,
    entityId,
    preferredSchema,
  }: {
    entityType: string;
    entityId: string;
    preferredSchema?: DataSchemaFormat;
  }) => ({
    href: `/app/metrics/detail/${entityType}/${entityId}?assetDetails=(preferredSchema:${preferredSchema})`,
  })
);

const mockUseLinkProps = jest.fn(
  ({ app, hash, search }: { app: string; hash?: string; search?: Record<string, string> }) => ({
    href: `/app/${app}/${hash ?? ''}?kuery=${encodeURIComponent(search?.kuery ?? '')}`,
  })
);

jest.mock('../../../../../hooks/use_kibana', () => ({
  useKibanaContextForPlugin: () => ({
    services: {
      application: {
        capabilities: {
          logs: { show: true },
          apm: { show: true },
          infrastructure: { save: true },
        },
      },
      share: {
        url: {
          locators: {
            get: (id: string) =>
              id === 'LOGS_LOCATOR' ? { getRedirectUrl: mockGetRedirectUrl } : undefined,
          },
        },
      },
    },
  }),
}));

jest.mock('../../hooks/use_waffle_options');
jest.mock('../../../../../hooks/use_is_pod_schema_selector_enabled');

jest.mock('@kbn/metrics-data-access-plugin/public', () => ({
  useAssetDetailsRedirect: () => ({
    getAssetDetailUrl: mockGetAssetDetailUrl,
  }),
}));

jest.mock('@kbn/observability-shared-plugin/public', () => {
  const actual = jest.requireActual('@kbn/observability-shared-plugin/public');
  return {
    ...actual,
    useLinkProps: (descriptor: { app: string; hash?: string; search?: Record<string, string> }) =>
      mockUseLinkProps(descriptor),
  };
});

jest.mock('../../../../../alerting/inventory/components/alert_flyout', () => ({
  AlertFlyout: () => null,
}));

import { useWaffleOptionsContext } from '../../hooks/use_waffle_options';
import { useIsPodSchemaSelectorEnabled } from '../../../../../hooks/use_is_pod_schema_selector_enabled';

const mockedUseWaffleOptionsContext = useWaffleOptionsContext as jest.MockedFunction<
  typeof useWaffleOptionsContext
>;
const mockedUseIsPodSchemaSelectorEnabled = useIsPodSchemaSelectorEnabled as jest.MockedFunction<
  typeof useIsPodSchemaSelectorEnabled
>;

const POD_NODE: InfraWaffleMapNode = {
  pathId: 'pod-uid-1',
  id: 'pod-uid-1',
  name: 'checkout-api',
  path: [{ value: 'pod-uid-1', label: 'checkout-api' }],
  metrics: [{ name: 'cpu' }],
};

const OPTIONS: InfraWaffleMapOptions = {
  formatter: InfraFormatterType.percent,
  formatTemplate: '{{value}}%',
  metric: { type: 'cpu' },
  groupBy: [],
  legend: {
    palette: 'cool',
    reverseColors: false,
    steps: 10,
    rules: [],
    type: 'gradient',
  },
  sort: { by: 'name', direction: 'desc' },
};

const renderMenu = () =>
  render(
    <I18nProvider>
      <EuiThemeProvider>
        <NodeContextMenu
          options={OPTIONS}
          currentTime={1_711_650_059_000}
          node={POD_NODE}
          nodeType="pod"
        />
      </EuiThemeProvider>
    </I18nProvider>
  );

describe('NodeContextMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseIsPodSchemaSelectorEnabled.mockReturnValue(true);
  });

  it('uses k8s.pod.uid for subtitle, logs, and APM when preferredSchema is semconv', () => {
    // Intentional `as ReturnType<typeof useWaffleOptionsContext>` type assertion as the waffle-options mock is a partial test double;
    mockedUseWaffleOptionsContext.mockReturnValue({
      preferredSchema: 'semconv',
    } as unknown as ReturnType<typeof useWaffleOptionsContext>);

    renderMenu();

    expect(screen.getByTestId('nodeContextMenu')).toHaveTextContent(
      'View details for k8s.pod.uid pod-uid-1'
    );

    expect(screen.getByTestId('viewLogsContextMenuItem').getAttribute('href')).toContain(
      'k8s.pod.uid'
    );
    expect(mockGetRedirectUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({
          query: expect.stringContaining('k8s.pod.uid'),
        }),
      })
    );

    expect(screen.getByTestId('viewApmTracesContextMenuItem').getAttribute('href')).toContain(
      encodeURIComponent('k8s.pod.uid:"pod-uid-1"')
    );
    expect(mockUseLinkProps).toHaveBeenCalledWith(
      expect.objectContaining({
        search: { kuery: 'k8s.pod.uid:"pod-uid-1"' },
      })
    );

    expect(mockGetAssetDetailUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'pod',
        entityId: 'pod-uid-1',
        preferredSchema: 'semconv',
      })
    );
  });

  it('uses kubernetes.pod.uid for subtitle, logs, and APM when preferredSchema is ecs', () => {
    // Intentional `as ReturnType<typeof useWaffleOptionsContext>` type assertion as the waffle-options mock is a partial test double;
    mockedUseWaffleOptionsContext.mockReturnValue({
      preferredSchema: 'ecs',
    } as unknown as ReturnType<typeof useWaffleOptionsContext>);

    renderMenu();

    expect(screen.getByTestId('nodeContextMenu')).toHaveTextContent(
      'View details for kubernetes.pod.uid pod-uid-1'
    );

    expect(screen.getByTestId('viewLogsContextMenuItem').getAttribute('href')).toContain(
      'kubernetes.pod.uid'
    );
    expect(mockGetRedirectUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({
          query: expect.stringContaining('kubernetes.pod.uid'),
        }),
      })
    );

    expect(screen.getByTestId('viewApmTracesContextMenuItem').getAttribute('href')).toContain(
      encodeURIComponent('kubernetes.pod.uid:"pod-uid-1"')
    );
    expect(mockUseLinkProps).toHaveBeenCalledWith(
      expect.objectContaining({
        search: { kuery: 'kubernetes.pod.uid:"pod-uid-1"' },
      })
    );

    expect(mockGetAssetDetailUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'pod',
        entityId: 'pod-uid-1',
        preferredSchema: 'ecs',
      })
    );
  });
});
