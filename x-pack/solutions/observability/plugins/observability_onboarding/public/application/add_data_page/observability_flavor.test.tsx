/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import React from 'react';
import { MemoryRouter } from '@kbn/shared-ux-router';
import { IS_INGEST_HUB_ONBOARDING_ENABLED } from '../../../common/feature_flags';
import { FleetCardsProvider } from './fleet_cards_provider';
import {
  useObservabilityCuratedCategories,
  useObservabilityMiniTiles,
} from './observability_flavor';

const mockUseAvailablePackages = jest.fn();

// Stubbed rather than required from the real module, which executes Fleet's whole
// public bundle. These tests build tiles and never search.
jest.mock('@kbn/fleet-plugin/public', () => ({
  LocalSearchHook: () => Promise.resolve({ useLocalSearch: jest.fn() }),
  AvailablePackagesHook: () => Promise.resolve({ useAvailablePackages: mockUseAvailablePackages }),
  useGetSettingsQuery: () => ({ data: undefined }),
}));

const makeCollectionCard = (groupId: string, memberCount: number) => ({
  id: `collection:${groupId}`,
  name: groupId,
  title: groupId,
  description: `${groupId} collection.`,
  categories: ['observability'],
  icons: [],
  url: `/app/integrations/collection/${groupId}`,
  version: '',
  integration: '',
  isCollectionCard: true,
  groupMembers: Array.from({ length: memberCount }, (_, index) => ({
    id: `epr:${groupId}_${index}`,
    name: `${groupId}_${index}`,
    title: `${groupId} ${index}`,
    description: 'Member.',
    categories: ['observability'],
    icons: [],
    url: `/app/integrations/detail/${groupId}_${index}`,
    version: '1.0.0',
    integration: '',
    type: 'integration',
  })),
});

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAvailablePackages.mockReturnValue({
    isLoading: false,
    eprPackageLoadingError: undefined,
    allCards: [makeCollectionCard('docker', 2), makeCollectionCard('prometheus', 4)],
  });
});

const buildServices = ({
  isServerless = false,
  featureFlagValues = {},
  metricsOnboardingEnabled = true,
}: {
  isServerless?: boolean;
  featureFlagValues?: Record<string, boolean>;
  metricsOnboardingEnabled?: boolean;
} = {}) => {
  const core = coreMock.createStart();
  core.application.getUrlForApp.mockImplementation(
    (app: string, options?: { path?: string }) => `/app/${app}${options?.path ?? ''}`
  );
  return {
    ...core,
    featureFlags: {
      getBooleanValue: jest.fn(
        (key: string, fallback: boolean) => featureFlagValues[key] ?? fallback
      ),
    },
    pricing: {
      isFeatureAvailable: jest.fn(() => metricsOnboardingEnabled),
    },
    observability: { config: { managedOtlpServiceUrl: '' } },
    cloud: undefined,
    context: { isServerless, isCloud: false, isDev: false },
  };
};

const createWrapper = (services: ReturnType<typeof buildServices> = buildServices()) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <I18nProvider>
      <KibanaContextProvider services={services}>
        <MemoryRouter initialEntries={['/']}>{children}</MemoryRouter>
      </KibanaContextProvider>
    </I18nProvider>
  );
  return Wrapper;
};

// The plain `createWrapper` has no FleetCardsProvider, so those tests double
// as the fallback proof: no collection data means unchanged tile navigation.
const createProviderWrapper = () => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <I18nProvider>
      <KibanaContextProvider services={buildServices()}>
        <MemoryRouter initialEntries={['/']}>
          <FleetCardsProvider enabled>{children}</FleetCardsProvider>
        </MemoryRouter>
      </KibanaContextProvider>
    </I18nProvider>
  );
  return Wrapper;
};

describe('useObservabilityCuratedCategories', () => {
  it('builds the four curated categories', () => {
    const { result } = renderHook(
      () => useObservabilityCuratedCategories({ onOpenCollection: jest.fn() }),
      {
        wrapper: createWrapper(),
      }
    );
    expect(result.current.map((category) => category.id)).toEqual([
      'cloud',
      'containers',
      'host',
      'applications',
    ]);
  });

  it('hides the Applications category when metrics onboarding is unavailable', () => {
    const { result } = renderHook(
      () => useObservabilityCuratedCategories({ onOpenCollection: jest.fn() }),
      {
        wrapper: createWrapper(buildServices({ metricsOnboardingEnabled: false })),
      }
    );
    expect(result.current.map((category) => category.id)).toEqual(['cloud', 'containers', 'host']);
  });

  it('wires internal routes for quickstart tiles', () => {
    const { result } = renderHook(
      () => useObservabilityCuratedCategories({ onOpenCollection: jest.fn() }),
      {
        wrapper: createWrapper(),
      }
    );
    const tiles = result.current.flatMap((category) => category.tiles);
    const kubernetes = tiles.find((tile) => tile.id === 'kubernetes');
    const aws = tiles.find((tile) => tile.id === 'aws');
    expect(kubernetes?.href).toBe('/kubernetes');
    expect(kubernetes?.onClick).toBeDefined();
    expect(aws?.href).toBe('/aws');
    expect(aws?.onClick).toBeDefined();
  });

  it('routes the AWS tile to the guided AWS flow when ingest hub onboarding is enabled', () => {
    const services = buildServices({
      featureFlagValues: { [IS_INGEST_HUB_ONBOARDING_ENABLED]: true },
    });
    const { result } = renderHook(
      () => useObservabilityCuratedCategories({ onOpenCollection: jest.fn() }),
      {
        wrapper: createWrapper(services),
      }
    );
    const tiles = result.current.flatMap((category) => category.tiles);
    const aws = tiles.find((tile) => tile.id === 'aws');
    expect(aws?.href).toBe('/app/onboarding/aws');
    expect(aws?.onClick).toBeUndefined();
  });

  it('wires EPR-backed tiles to the integrations detail page', () => {
    const { result } = renderHook(
      () => useObservabilityCuratedCategories({ onOpenCollection: jest.fn() }),
      {
        wrapper: createWrapper(),
      }
    );
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
    const { result } = renderHook(
      () => useObservabilityCuratedCategories({ onOpenCollection: jest.fn() }),
      {
        wrapper: createWrapper(),
      }
    );
    const linux = result.current
      .flatMap((category) => category.tiles)
      .find((tile) => tile.id === 'linux');
    expect(linux?.['data-test-subj']).toBe('observabilityOnboardingIntegrationTile-linux');
  });

  it('renders the decision-log tile membership and order', () => {
    const { result } = renderHook(
      () => useObservabilityCuratedCategories({ onOpenCollection: jest.fn() }),
      {
        wrapper: createWrapper(),
      }
    );
    const byCategory = Object.fromEntries(
      result.current.map((category) => [category.id, category.tiles.map((tile) => tile.id)])
    );
    expect(byCategory.cloud).toEqual(['aws', 'azure', 'gcp']);
    expect(byCategory.containers).toEqual(['kubernetes', 'docker', 'aws_ecs']);
    expect(byCategory.host).toEqual(['linux', 'windows', 'macos']);
    expect(byCategory.applications).toEqual(['opentelemetry', 'apm', 'synthetic_monitor']);
  });

  it('wires the application tiles to their destinations on stateful', () => {
    const { result } = renderHook(
      () => useObservabilityCuratedCategories({ onOpenCollection: jest.fn() }),
      {
        wrapper: createWrapper(buildServices({ isServerless: false })),
      }
    );
    const tiles = result.current.flatMap((category) => category.tiles);
    const hrefById = Object.fromEntries(tiles.map((tile) => [tile.id, tile.href]));
    expect(hrefById.opentelemetry).toBe(
      '/app/apm/tutorial?returnAppId=observabilityOnboarding&returnPath=%3F'
    );
    expect(hrefById.apm).toBe(
      '/app/apm/tutorial?returnAppId=observabilityOnboarding&returnPath=%3F'
    );
    expect(hrefById.synthetic_monitor).toBe(
      '/app/synthetics/add-monitor?returnAppId=observabilityOnboarding&returnPath=%3F'
    );
  });

  it('prefers the OTel quickstart and APM onboarding on serverless', () => {
    const { result } = renderHook(
      () => useObservabilityCuratedCategories({ onOpenCollection: jest.fn() }),
      {
        wrapper: createWrapper(buildServices({ isServerless: true })),
      }
    );
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
    const { result } = renderHook(
      () => useObservabilityMiniTiles({ onOpenCollection: jest.fn() }),
      {
        wrapper: createWrapper(),
      }
    );
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

  it('swaps the metrics-only tiles for OpenTelemetry when metrics onboarding is unavailable', () => {
    const { result } = renderHook(
      () => useObservabilityMiniTiles({ onOpenCollection: jest.fn() }),
      {
        wrapper: createWrapper(buildServices({ metricsOnboardingEnabled: false })),
      }
    );
    expect(result.current.map((tile) => tile.id)).toEqual([
      'opentelemetry',
      'auto_import',
      'upload_file',
      'custom_logs',
    ]);
  });

  it('wires EPR-backed mini tiles to the integrations detail page', () => {
    const { result } = renderHook(
      () => useObservabilityMiniTiles({ onOpenCollection: jest.fn() }),
      {
        wrapper: createWrapper(),
      }
    );
    const hrefById = Object.fromEntries(result.current.map((tile) => [tile.id, tile.href]));
    expect(hrefById.prometheus).toBe(
      '/app/integrations/detail/prometheus/overview?returnAppId=observabilityOnboarding&returnPath=%3F'
    );
    expect(hrefById.supabase).toBe(
      '/app/integrations/detail/supabase/overview?returnAppId=observabilityOnboarding&returnPath=%3F'
    );
  });

  it('sends the OpenTelemetry mini tile to the OTel quickstart on serverless Logs Essentials', () => {
    const { result } = renderHook(
      () => useObservabilityMiniTiles({ onOpenCollection: jest.fn() }),
      {
        wrapper: createWrapper(
          buildServices({ isServerless: true, metricsOnboardingEnabled: false })
        ),
      }
    );
    const opentelemetry = result.current.find((tile) => tile.id === 'opentelemetry');
    expect(opentelemetry?.href).toBe('/otel-apm');
    expect(opentelemetry?.onClick).toBeDefined();
  });

  it('wires the custom logs mini tile to the OTel logs flow route', () => {
    const { result } = renderHook(
      () => useObservabilityMiniTiles({ onOpenCollection: jest.fn() }),
      {
        wrapper: createWrapper(),
      }
    );
    const customLogs = result.current.find((tile) => tile.id === 'custom_logs');
    expect(customLogs?.href).toBe('/otel-logs');
    expect(customLogs?.onClick).toBeDefined();
  });

  it('wires the Auto Import and Upload a file mini tiles to their apps', () => {
    const { result } = renderHook(
      () => useObservabilityMiniTiles({ onOpenCollection: jest.fn() }),
      {
        wrapper: createWrapper(),
      }
    );
    const hrefById = Object.fromEntries(result.current.map((tile) => [tile.id, tile.href]));
    expect(hrefById.auto_import).toBe(
      '/app/integrations/create?returnAppId=observabilityOnboarding&returnPath=%3F'
    );
    expect(hrefById.upload_file).toBe(
      '/app/home#/tutorial_directory/fileDataViz?returnAppId=observabilityOnboarding&returnPath=%3F'
    );
  });

  it('leaves no mini tile without a destination', () => {
    const { result } = renderHook(
      () => useObservabilityMiniTiles({ onOpenCollection: jest.fn() }),
      {
        wrapper: createWrapper(),
      }
    );
    for (const tile of result.current) {
      expect(tile.href).toBeTruthy();
    }
  });
});

describe('collection chooser tiles', () => {
  const clickEvent = {} as React.MouseEvent<HTMLElement>;

  it('turns the docker tile into a badged chooser opener when Fleet provides the group', async () => {
    const onOpenCollection = jest.fn();
    const { result } = renderHook(() => useObservabilityCuratedCategories({ onOpenCollection }), {
      wrapper: createProviderWrapper(),
    });

    await waitFor(() => {
      const docker = result.current
        .flatMap((category) => category.tiles)
        .find((tile) => tile.id === 'docker');
      expect(docker?.badge).toBeDefined();
    });

    const docker = result.current
      .flatMap((category) => category.tiles)
      .find((tile) => tile.id === 'docker');
    expect(docker?.href).toBeUndefined();

    docker?.onClick?.(clickEvent);
    expect(onOpenCollection).toHaveBeenCalledWith('docker');
  });

  // The tile spends a moment before Fleet's packages land and must stay usable.
  it('keeps the docker tile navigating while the packages are still loading', async () => {
    const { result } = renderHook(
      () => useObservabilityCuratedCategories({ onOpenCollection: jest.fn() }),
      { wrapper: createProviderWrapper() }
    );

    const docker = result.current
      .flatMap((category) => category.tiles)
      .find((tile) => tile.id === 'docker');
    expect(docker?.href).toContain('/app/integrations/detail/docker/overview');
    expect(docker?.badge).toBeUndefined();
    // Let the module land inside this test rather than during the next one.
    await waitFor(() => expect(mockUseAvailablePackages).toHaveBeenCalled());
  });

  it('turns the prometheus mini tile into a chooser opener when Fleet provides the group', async () => {
    const onOpenCollection = jest.fn();
    const { result } = renderHook(() => useObservabilityMiniTiles({ onOpenCollection }), {
      wrapper: createProviderWrapper(),
    });

    await waitFor(() => {
      const prometheus = result.current.find((tile) => tile.id === 'prometheus');
      expect(prometheus?.href).toBeUndefined();
      expect(prometheus?.onClick).toBeDefined();
      expect(prometheus?.badge).toBeDefined();
    });

    result.current.find((tile) => tile.id === 'prometheus')?.onClick?.(clickEvent);
    expect(onOpenCollection).toHaveBeenCalledWith('prometheus');
  });

  it('keeps the other tiles navigating even with collection data present', async () => {
    const { result } = renderHook(
      () => useObservabilityCuratedCategories({ onOpenCollection: jest.fn() }),
      { wrapper: createProviderWrapper() }
    );

    await waitFor(() => {
      const docker = result.current
        .flatMap((category) => category.tiles)
        .find((tile) => tile.id === 'docker');
      expect(docker?.badge).toBeDefined();
    });

    const tiles = result.current.flatMap((category) => category.tiles);
    expect(tiles.find((tile) => tile.id === 'azure')?.href).toContain(
      '/app/integrations/detail/azure/overview'
    );
    expect(tiles.find((tile) => tile.id === 'azure')?.badge).toBeUndefined();
  });
});
