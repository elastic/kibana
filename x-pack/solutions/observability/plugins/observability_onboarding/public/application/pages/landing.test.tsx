/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { ObservabilityPublicStart } from '@kbn/observability-plugin/public';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { matchers } from '@emotion/jest';
import React from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { useSearchParams } from '@kbn/shared-ux-router';
import type { ObservabilityOnboardingAppServices } from '../..';
import { IS_ADD_DATA_PAGE_V2_ENABLED } from '../../../common/feature_flags';
import { createCallApi } from '../../services/rest/create_call_api';
import { ObservabilityOnboardingFlow } from '../observability_onboarding_flow';
import { LandingPage } from './landing';

expect.extend(matchers);

jest.mock('../onboarding_flow_form/onboarding_flow_form', () => ({
  OnboardingFlowForm: () => <div data-test-subj="onboardingFlowFormStub" />,
}));

jest.mock('./host', () => ({
  HostLinuxOtelPage: () => <div data-test-subj="hostLinuxOtelPageStub" />,
  HostLinuxAutoDetectPage: () => null,
  HostMacosOtelPage: () => null,
  HostMacosAutoDetectPage: () => null,
  HostWindowsOtelPage: () => null,
}));

jest.mock('./auto_detect', () => ({ AutoDetectPage: () => null }));
jest.mock('./otel_logs', () => ({ OtelLogsPage: () => null }));
jest.mock('./firehose', () => ({ FirehosePage: () => null }));
jest.mock('./otel_apm', () => ({ OtelApmPage: () => null }));
jest.mock('./cloudforwarder', () => ({ CloudForwarderPage: () => null }));

jest.mock('../shared/use_flow_breadcrumbs', () => ({
  useFlowBreadcrumb: jest.fn(),
}));

jest.mock('../shared/use_managed_otlp_service_availability', () => ({
  useManagedOtlpServiceAvailability: () => false,
}));

jest.mock('@elastic/eui-illustrations', () => {
  const stub = (id: string, title: string) => ({
    id,
    title,
    light: '<svg></svg>',
    dark: '<svg></svg>',
  });
  return {
    observabilityVideo: stub('observability-video', 'Observability video'),
    globalPeopleNetwork: stub('global-people-network', 'Global people network'),
    projectsGear: stub('projects-gear', 'Projects gear'),
    supportLaptop: stub('support-laptop', 'Support laptop'),
  };
});

const mockOpenCollectionCallbacks: Array<(groupId: string) => void> = [];

jest.mock('../add_data_page/observability_search_results', () => ({
  ObservabilitySearchResults: ({
    onOpenCollection,
  }: {
    onOpenCollection: (groupId: string) => void;
  }) => {
    mockOpenCollectionCallbacks.push(onOpenCollection);
    return (
      <div data-test-subj="observabilitySearchResultsStub">
        <button
          type="button"
          data-test-subj="stubOpenCollection"
          onClick={() => onOpenCollection('nginx')}
        >
          open chooser
        </button>
      </div>
    );
  },
}));

// Only Fleet's data hook and icon renderer are stubbed; the provider's module load
// and package query stay real code paths.
const mockUseAvailablePackages = jest.fn();
jest.mock('@kbn/fleet-plugin/public', () => {
  const actual = jest.requireActual('@kbn/fleet-plugin/public');
  const ReactActual = jest.requireActual('react');
  return {
    ...actual,
    AvailablePackagesHook: () =>
      Promise.resolve({ useAvailablePackages: mockUseAvailablePackages }),
    useGetSettingsQuery: () => ({ data: undefined }),
    CardIcon: () => ReactActual.createElement('span', { 'data-test-subj': 'variantRowIconStub' }),
  };
});

const member = (name: string, title: string) => ({
  id: `epr:${name}`,
  name,
  title,
  description: 'Member.',
  categories: ['observability'],
  icons: [],
  url: `/app/integrations/detail/${name}`,
  version: '1.0.0',
  integration: '',
  type: 'integration',
});

const collectionCard = (groupId: string, title: string, members: string[]) => ({
  id: `collection:${groupId}`,
  name: groupId,
  title,
  description: 'Choose a collection method.',
  categories: ['observability'],
  icons: [],
  url: `/app/integrations/collection/${groupId}`,
  version: '',
  integration: '',
  isCollectionCard: true,
  groupMembers: members.map((name) => member(name, name)),
});

// Docker is a curated tile, so it covers a chooser opened outside the results.
const collectionCards = [
  collectionCard('nginx', 'Nginx', ['nginx', 'nginx_otel']),
  collectionCard('docker', 'Docker', ['docker', 'docker_otel']),
];

const memberHrefs = () =>
  screen
    .getAllByTestId(/^collectionVariantRow-/)
    .map((row) => row.querySelector('a')?.getAttribute('href') ?? '');

beforeEach(() => {
  mockOpenCollectionCallbacks.length = 0;
  // Call counts are assertions here, not just plumbing: one test asserts the page
  // never asks for packages.
  mockUseAvailablePackages.mockClear();
  mockUseAvailablePackages.mockReturnValue({
    isLoading: false,
    eprPackageLoadingError: undefined,
    allCards: collectionCards,
  });
});

// Collection-aware tiles start as ordinary links and lose the href once Fleet's
// packages land, so tests that click one wait for the swap.
const waitForCollectionTile = (tileId: string) =>
  waitFor(() => expect(screen.getByTestId(tileId)).not.toHaveAttribute('href'));

const LocationDisplay = () => {
  const location = useLocation();
  return <div data-test-subj="locationPathname">{location.pathname}</div>;
};

const LocationSearchDisplay = () => {
  const location = useLocation();
  return <div data-test-subj="locationSearch">{location.search}</div>;
};

// Stands in for the back button or a deep link: something other than the flyout's
// own close button taking the group id out of the url.
const CollectionParamControls = () => {
  const [params, setParams] = useSearchParams();
  const dropCollection = () => {
    const next = new URLSearchParams(params);
    next.delete('collection');
    setParams(next);
  };
  return (
    <button type="button" data-test-subj="stubDropCollectionParam" onClick={dropCollection}>
      drop collection
    </button>
  );
};

// Models Fleet's react-query data arriving late: only its own hook consumer
// re-renders, so a page-level re-render cannot fake the update.
const createPackagesFeed = (initialCards: unknown[]) => {
  let cards = initialCards;
  const listeners = new Set<() => void>();

  const usePackages = () => {
    const [, bump] = React.useState(0);
    React.useEffect(() => {
      const listener = () => bump((count) => count + 1);
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    }, []);
    return { isLoading: false, eprPackageLoadingError: undefined, allCards: cards };
  };

  const publish = (nextCards: unknown[]) => {
    cards = nextCards;
    act(() => {
      listeners.forEach((listener) => listener());
    });
  };

  return { usePackages, publish };
};

// The page reads Fleet's browser-exposed experimental flags to decide whether
// collection cards can arrive at all, so tests state that as service config.
const fleetServiceWithGrouping = (enabled: boolean) =>
  ({
    config: { enableExperimental: enabled ? ['enableIntegrationCollectionTiles'] : [] },
    authz: { fleet: { readSettings: true } },
  } as unknown as NonNullable<ObservabilityOnboardingAppServices['fleet']>);

const createObservabilityServices = (
  coreStart: ReturnType<typeof coreMock.createStart>,
  { grouping = true }: { grouping?: boolean } = {}
): ObservabilityOnboardingAppServices => ({
  ...coreStart,
  fleet: fleetServiceWithGrouping(grouping),
  share: sharePluginMock.createStartContract(),
  context: {
    isDev: false,
    isCloud: false,
    isServerless: false,
    stackVersion: '9.0.0',
  },
  config: {
    ui: { enabled: true },
    serverless: { enabled: false },
  },
  observability: {
    config: {
      unsafe: {
        alertDetails: {
          uptime: { enabled: false },
        },
      },
      managedOtlpServiceUrl: '',
    },
    observabilityRuleTypeRegistry: {
      register: jest.fn(),
      getFormatter: jest.fn(() => undefined),
      list: jest.fn(() => []),
    },
    useRulesLink: jest.fn(() => ({ href: '/' })),
  } as ObservabilityPublicStart,
});

const renderWithFlag = (
  enabled: boolean,
  initialPath: string = '/',
  { grouping = true }: { grouping?: boolean } = {}
) => {
  const coreStart = coreMock.createStart();
  coreStart.featureFlags.getBooleanValue.mockImplementation((id, fallback) =>
    id === IS_ADD_DATA_PAGE_V2_ENABLED ? enabled : fallback
  );
  createCallApi(coreStart);
  const services = createObservabilityServices(coreStart, { grouping });
  return render(
    <I18nProvider>
      <KibanaContextProvider services={services}>
        <MemoryRouter initialEntries={[initialPath]}>
          <LandingPage />
        </MemoryRouter>
      </KibanaContextProvider>
    </I18nProvider>
  );
};

const renderLandingWithRouter = (enabled: boolean) => {
  const coreStart = coreMock.createStart();
  coreStart.featureFlags.getBooleanValue.mockImplementation((id, fallback) =>
    id === IS_ADD_DATA_PAGE_V2_ENABLED ? enabled : fallback
  );
  createCallApi(coreStart);
  const services = createObservabilityServices(coreStart);
  return render(
    <I18nProvider>
      <KibanaContextProvider services={services}>
        <MemoryRouter initialEntries={['/']}>
          <LandingPage />
          <LocationDisplay />
        </MemoryRouter>
      </KibanaContextProvider>
    </I18nProvider>
  );
};

const renderLandingAtPathWithSearch = (initialPath: string) => {
  const coreStart = coreMock.createStart();
  coreStart.featureFlags.getBooleanValue.mockImplementation((id, fallback) =>
    id === IS_ADD_DATA_PAGE_V2_ENABLED ? true : fallback
  );
  createCallApi(coreStart);
  const services = createObservabilityServices(coreStart);
  return render(
    <I18nProvider>
      <KibanaContextProvider services={services}>
        <MemoryRouter initialEntries={[initialPath]}>
          <LandingPage />
          <LocationSearchDisplay />
          <CollectionParamControls />
        </MemoryRouter>
      </KibanaContextProvider>
    </I18nProvider>
  );
};

const renderFlowAtPath = (enabled: boolean, path: string) => {
  const coreStart = coreMock.createStart();
  coreStart.featureFlags.getBooleanValue.mockImplementation((id, fallback) =>
    id === IS_ADD_DATA_PAGE_V2_ENABLED ? enabled : fallback
  );
  createCallApi(coreStart);
  const services = createObservabilityServices(coreStart);
  return render(
    <I18nProvider>
      <KibanaContextProvider services={services}>
        <MemoryRouter initialEntries={[path]}>
          <ObservabilityOnboardingFlow />
        </MemoryRouter>
      </KibanaContextProvider>
    </I18nProvider>
  );
};

beforeAll(() => {
  window.scrollTo = jest.fn();
});

describe('LandingPage', () => {
  it('renders the V2 layout when the flag is on', () => {
    expect(renderWithFlag(true).queryByTestId('addDataPageV2')).toBeInTheDocument();
  });

  it('does not render the V2 layout when the flag is off', () => {
    expect(renderWithFlag(false).queryByTestId('addDataPageV2')).not.toBeInTheDocument();
  });

  it('renders the API endpoints section in the V2 layout', () => {
    const view = renderWithFlag(true);
    expect(
      view.queryByTestId('observabilityOnboardingApiEndpointTab-elasticsearch')
    ).toBeInTheDocument();
    expect(
      view.getByRole('heading', { level: 2, name: 'Connect directly to the endpoint' })
    ).toBeInTheDocument();
  });

  it('renders the documentation and support section in the V2 layout', () => {
    expect(renderWithFlag(true).queryByTestId('addDataDocsLinks')).toBeInTheDocument();
  });
});

describe('LandingPage host tiles (V2)', () => {
  it.each([
    ['linux', '/host/linux'],
    ['macos', '/host/macos'],
    ['windows', '/host/windows'],
  ] as const)('navigates to %s sub-page when its tile is clicked', async (tileId, expectedPath) => {
    const user = userEvent.setup();
    const { getByTestId } = renderLandingWithRouter(true);
    const tile = getByTestId(`observabilityOnboardingIntegrationTile-${tileId}`);
    await user.click(tile);
    expect(getByTestId('locationPathname')).toHaveTextContent(expectedPath);
  });
});

describe('LandingPage Kubernetes tile (V2)', () => {
  it('navigates to the Kubernetes page when its tile is clicked', async () => {
    const user = userEvent.setup();
    const { getByTestId } = renderLandingWithRouter(true);
    const tile = getByTestId('observabilityOnboardingIntegrationTile-kubernetes');
    await user.click(tile);
    expect(getByTestId('locationPathname')).toHaveTextContent('/kubernetes');
  });
});

describe('LandingPage host tile routes (V2 gated)', () => {
  it('renders the V1 landing page when the flag is off and the path is /host/linux', () => {
    renderFlowAtPath(false, '/host/linux');
    expect(screen.getByTestId('onboardingFlowFormStub')).toBeInTheDocument();
    expect(screen.queryByTestId('hostLinuxOtelPageStub')).toBeNull();
    expect(screen.queryByTestId('addDataPageV2')).toBeNull();
  });
});

describe('LandingPage search (V2, Variant A)', () => {
  it('keeps the curated grid visible while a search term is active', () => {
    renderWithFlag(true, '/?search=docker');
    expect(screen.getByTestId('observabilitySearchResultsStub')).toBeInTheDocument();
    expect(
      screen.getByTestId('observabilityOnboardingIntegrationTile-kubernetes')
    ).toBeInTheDocument();
  });

  it('does not render the results block without a search term', () => {
    renderWithFlag(true);
    expect(screen.queryByTestId('observabilitySearchResultsStub')).not.toBeInTheDocument();
    expect(
      screen.getByTestId('observabilityOnboardingIntegrationTile-kubernetes')
    ).toBeInTheDocument();
  });

  it('places the search bar before the All integrations section', () => {
    renderWithFlag(true);
    const searchBar = screen.getByTestId('observabilityOnboardingIntegrationsSearchFieldSearch');
    const heading = screen.getByRole('heading', { name: 'All integrations' });
    expect(searchBar.compareDocumentPosition(heading)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });
});

describe('LandingPage package loading (V2)', () => {
  // Grid badges are the only reason to hold packages without a search, so a page
  // that cannot show them should leave the registry alone.
  it('asks Fleet for packages on arrival when grouping is on', async () => {
    renderWithFlag(true);

    await waitFor(() => expect(mockUseAvailablePackages).toHaveBeenCalled());
  });

  it('asks for nothing on arrival when grouping is off', async () => {
    renderWithFlag(true, '/', { grouping: false });

    await screen.findByTestId('addDataPageV2');
    await act(async () => {});
    expect(mockUseAvailablePackages).not.toHaveBeenCalled();
  });
});

describe('LandingPage collection chooser (V2)', () => {
  // The path a refresh and a return from a member's detail page both take.
  it('opens the chooser named in the url once packages load', async () => {
    renderLandingAtPathWithSearch('/?search=nginx&collection=nginx');

    expect(await screen.findByTestId('collectionFlyout')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Nginx' })).toBeInTheDocument();
  });

  // The url names the open chooser, so a refresh or a shared link restores it.
  it('writes the collection param when the chooser opens', async () => {
    const user = userEvent.setup();
    renderLandingAtPathWithSearch('/?search=nginx');

    await user.click(screen.getByTestId('stubOpenCollection'));
    expect(await screen.findByTestId('collectionFlyout')).toBeInTheDocument();
    expect(screen.getByTestId('locationSearch')).toHaveTextContent('collection=nginx');
  });

  // Without the strip, a refresh after closing would resurrect the chooser.
  it('drops the collection param when the chooser closes, keeping the search', async () => {
    const user = userEvent.setup();
    renderLandingAtPathWithSearch('/?search=nginx&collection=nginx');
    await screen.findByTestId('collectionFlyout');

    await user.click(screen.getByTestId('euiFlyoutCloseButton'));
    expect(screen.queryByTestId('collectionFlyout')).not.toBeInTheDocument();
    expect(screen.getByTestId('locationSearch')).toHaveTextContent('?search=nginx');
    expect(screen.getByTestId('locationSearch')).not.toHaveTextContent('collection');
  });

  // Covers the back button, a deep link, and the search term changing.
  it('closes the chooser when the collection param leaves the url', async () => {
    const user = userEvent.setup();
    renderLandingAtPathWithSearch('/?search=nginx&collection=nginx');
    await screen.findByTestId('collectionFlyout');

    await user.click(screen.getByTestId('stubDropCollectionParam'));
    expect(screen.queryByTestId('collectionFlyout')).not.toBeInTheDocument();
  });

  it('follows refreshed package data while the chooser is open', async () => {
    const feed = createPackagesFeed(collectionCards);
    mockUseAvailablePackages.mockImplementation(feed.usePackages);
    renderLandingAtPathWithSearch('/?search=nginx&collection=nginx');
    await screen.findByTestId('collectionFlyout');
    expect(screen.getAllByTestId(/^collectionVariantRow-/)).toHaveLength(2);

    feed.publish([
      collectionCard('nginx', 'Nginx', ['nginx', 'nginx_otel', 'nginx_otel_hostmetrics']),
    ]);

    await waitFor(() => expect(screen.getAllByTestId(/^collectionVariantRow-/)).toHaveLength(3));
  });

  // Every curated tile is rebuilt whenever this callback changes identity, so it
  // has to outlive the url updates that typing produces.
  it('keeps the open-chooser callback stable while the search term changes', async () => {
    const user = userEvent.setup();
    renderLandingAtPathWithSearch('/?search=nginx');
    await screen.findByTestId('observabilitySearchResultsStub');
    const [firstCallback] = mockOpenCollectionCallbacks;

    await user.type(
      screen.getByTestId('observabilityOnboardingIntegrationsSearchFieldSearch'),
      'x'
    );

    await waitFor(() =>
      expect(screen.getByTestId('locationSearch')).toHaveTextContent('search=nginxx')
    );
    expect(mockOpenCollectionCallbacks.at(-1)).toBe(firstCallback);
  });

  // The grid stays visible during a search, so a tile can be clicked with one running.
  it('keeps the active search in member links of a chooser opened from a curated tile', async () => {
    const user = userEvent.setup();
    renderLandingAtPathWithSearch('/?search=docker');
    await waitForCollectionTile('observabilityOnboardingIntegrationTile-docker');

    await user.click(screen.getByTestId('observabilityOnboardingIntegrationTile-docker'));
    await screen.findByTestId('collectionFlyout');

    expect(screen.getByTestId('locationSearch')).toHaveTextContent('search=docker');
    for (const href of memberHrefs()) {
      expect(href).toContain(
        `returnPath=${encodeURIComponent('?search=docker&collection=docker')}`
      );
    }
  });
});

describe('LandingPage integrations section header spacing (V2)', () => {
  it('matches the design spec 12px gap between the title and subtitle', () => {
    renderWithFlag(true);
    const heading = screen.getByRole('heading', { level: 2, name: 'All integrations' });
    const spacer = heading.nextElementSibling;
    expect(spacer).toHaveStyleRule('block-size', '12px');
  });
});
