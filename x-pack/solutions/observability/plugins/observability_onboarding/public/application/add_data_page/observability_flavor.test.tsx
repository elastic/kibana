/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { CompatRouter } from 'react-router-dom-v5-compat';
import {
  useObservabilityCuratedCategories,
  useObservabilityMiniTiles,
} from './observability_flavor';

const buildServices = ({ isServerless = false }: { isServerless?: boolean } = {}) => {
  const core = coreMock.createStart();
  core.application.getUrlForApp.mockImplementation(
    (app: string, options?: { path?: string }) => `/app/${app}${options?.path ?? ''}`
  );
  return {
    ...core,
    featureFlags: { getBooleanValue: jest.fn(() => false) },
    observability: { config: { managedOtlpServiceUrl: '' } },
    cloud: undefined,
    context: { isServerless, isCloud: false, isDev: false },
    share: {
      url: {
        locators: {
          get: jest.fn(() => ({
            getRedirectUrl: jest.fn(() => '/app/synthetics/add-monitor'),
          })),
        },
      },
    },
  };
};

const createWrapper = (services: ReturnType<typeof buildServices> = buildServices()) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <I18nProvider>
      <KibanaContextProvider services={services}>
        <MemoryRouter initialEntries={['/']}>
          <CompatRouter>{children}</CompatRouter>
        </MemoryRouter>
      </KibanaContextProvider>
    </I18nProvider>
  );
  return Wrapper;
};

describe('useObservabilityCuratedCategories', () => {
  it('builds the four curated categories', () => {
    const { result } = renderHook(() => useObservabilityCuratedCategories(), {
      wrapper: createWrapper(),
    });
    expect(result.current.map((category) => category.id)).toEqual([
      'cloud',
      'containers',
      'host',
      'applications',
    ]);
  });

  it('wires internal routes for quickstart tiles', () => {
    const { result } = renderHook(() => useObservabilityCuratedCategories(), {
      wrapper: createWrapper(),
    });
    const tiles = result.current.flatMap((category) => category.tiles);
    const kubernetes = tiles.find((tile) => tile.id === 'kubernetes');
    const aws = tiles.find((tile) => tile.id === 'aws');
    expect(kubernetes?.href).toBe('/kubernetes');
    expect(kubernetes?.onClick).toBeDefined();
    expect(aws?.href).toBe('/aws');
    expect(aws?.onClick).toBeDefined();
  });

  it('wires EPR-backed tiles to the integrations detail page', () => {
    const { result } = renderHook(() => useObservabilityCuratedCategories(), {
      wrapper: createWrapper(),
    });
    const tiles = result.current.flatMap((category) => category.tiles);
    const hrefById = Object.fromEntries(tiles.map((tile) => [tile.id, tile.href]));
    expect(hrefById.azure).toBe(
      '/app/integrations/detail/azure/overview?returnAppId=observabilityOnboarding&returnPath=%3F'
    );
    expect(hrefById.gcp).toBe(
      '/app/integrations/detail/gcp/overview?returnAppId=observabilityOnboarding&returnPath=%3F'
    );
    expect(hrefById.docker).toBe(
      '/app/integrations/detail/docker/overview?returnAppId=observabilityOnboarding&returnPath=%3F'
    );
    expect(hrefById.aws_ecs).toBe(
      '/app/integrations/detail/aws/overview?integration=ecs&returnAppId=observabilityOnboarding&returnPath=%3F'
    );
  });

  it('preserves the existing data-test-subj values', () => {
    const { result } = renderHook(() => useObservabilityCuratedCategories(), {
      wrapper: createWrapper(),
    });
    const linux = result.current
      .flatMap((category) => category.tiles)
      .find((tile) => tile.id === 'linux');
    expect(linux?.['data-test-subj']).toBe('observabilityOnboardingIntegrationTile-linux');
  });

  it('renders the decision-log tile membership and order', () => {
    const { result } = renderHook(() => useObservabilityCuratedCategories(), {
      wrapper: createWrapper(),
    });
    const byCategory = Object.fromEntries(
      result.current.map((category) => [category.id, category.tiles.map((tile) => tile.id)])
    );
    expect(byCategory.cloud).toEqual(['aws', 'azure', 'gcp']);
    expect(byCategory.containers).toEqual(['kubernetes', 'docker', 'aws_ecs']);
    expect(byCategory.host).toEqual(['linux', 'windows', 'macos']);
    expect(byCategory.applications).toEqual(['opentelemetry', 'apm', 'synthetic_monitor']);
  });

  it('wires the application tiles to their destinations on stateful', () => {
    const { result } = renderHook(() => useObservabilityCuratedCategories(), {
      wrapper: createWrapper(buildServices({ isServerless: false })),
    });
    const tiles = result.current.flatMap((category) => category.tiles);
    const hrefById = Object.fromEntries(tiles.map((tile) => [tile.id, tile.href]));
    expect(hrefById.opentelemetry).toBe('/app/apm/tutorial');
    expect(hrefById.apm).toBe('/app/apm/tutorial');
    expect(hrefById.synthetic_monitor).toBe('/app/synthetics/add-monitor');
  });

  it('prefers the OTel quickstart and APM onboarding on serverless', () => {
    const { result } = renderHook(() => useObservabilityCuratedCategories(), {
      wrapper: createWrapper(buildServices({ isServerless: true })),
    });
    const tiles = result.current.flatMap((category) => category.tiles);
    const opentelemetry = tiles.find((tile) => tile.id === 'opentelemetry');
    const apm = tiles.find((tile) => tile.id === 'apm');
    expect(opentelemetry?.href).toBe('/otel-apm');
    expect(opentelemetry?.onClick).toBeDefined();
    expect(apm?.href).toBe('/app/apm/onboarding');
  });
});

describe('useObservabilityMiniTiles', () => {
  it('builds the mini tiles with preserved data-test-subj values', () => {
    const { result } = renderHook(() => useObservabilityMiniTiles(), {
      wrapper: createWrapper(),
    });
    expect(result.current.map((tile) => tile.id)).toEqual([
      'prometheus',
      'supabase',
      'auto_import',
      'upload_file',
      'custom_logs',
    ]);
    expect(result.current[0]['data-test-subj']).toBe(
      'observabilityOnboardingIntegrationMiniTile-prometheus'
    );
    expect(result.current[0].onClick).toBeUndefined();
  });

  it('wires EPR-backed mini tiles to the integrations detail page', () => {
    const { result } = renderHook(() => useObservabilityMiniTiles(), {
      wrapper: createWrapper(),
    });
    const hrefById = Object.fromEntries(result.current.map((tile) => [tile.id, tile.href]));
    expect(hrefById.prometheus).toBe(
      '/app/integrations/detail/prometheus/overview?returnAppId=observabilityOnboarding&returnPath=%3F'
    );
    expect(hrefById.supabase).toBe(
      '/app/integrations/detail/supabase/overview?returnAppId=observabilityOnboarding&returnPath=%3F'
    );
  });

  it('wires the custom logs mini tile to the OTel logs flow route', () => {
    const { result } = renderHook(() => useObservabilityMiniTiles(), {
      wrapper: createWrapper(),
    });
    const customLogs = result.current.find((tile) => tile.id === 'custom_logs');
    expect(customLogs?.href).toBe('/otel-logs');
    expect(customLogs?.onClick).toBeDefined();
  });

  it('wires the Auto Import and Upload a file mini tiles to their apps', () => {
    const { result } = renderHook(() => useObservabilityMiniTiles(), {
      wrapper: createWrapper(),
    });
    const hrefById = Object.fromEntries(result.current.map((tile) => [tile.id, tile.href]));
    expect(hrefById.auto_import).toBe('/app/integrations/create');
    expect(hrefById.upload_file).toBe('/app/home#/tutorial_directory/fileDataViz');
  });

  it('leaves no mini tile without a destination', () => {
    const { result } = renderHook(() => useObservabilityMiniTiles(), {
      wrapper: createWrapper(),
    });
    for (const tile of result.current) {
      expect(tile.href).toBeTruthy();
    }
  });
});
