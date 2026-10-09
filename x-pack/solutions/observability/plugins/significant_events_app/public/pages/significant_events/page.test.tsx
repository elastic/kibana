/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { AppHeaderTab } from '@kbn/app-header';
import { useDeveloperMode } from '../../hooks/use_developer_mode';
import type { FeatureAvailability } from '../../util/feature_availability';
import { useSignificantEventsAppParams } from '../../hooks/use_significant_events_app_params';
import { SignificantEventsPage } from './page';

jest.mock('../../hooks/use_developer_mode');
jest.mock('../../hooks/use_kibana', () => ({
  useKibana: () => ({
    core: {
      application: {
        getUrlForApp: jest.fn(() => '/app/nightshift'),
        capabilities: {
          nightshift: {
            show: true,
            manage: true,
            configure: true,
          },
        },
      },
      chrome: {
        setBreadcrumbs: jest.fn(),
      },
      notifications: {
        toasts: {
          addError: jest.fn(),
        },
      },
    },
    dependencies: {
      start: {},
    },
  }),
}));
jest.mock('../../hooks/use_significant_events_app_params', () => ({
  useSignificantEventsAppParams: jest.fn(),
}));
jest.mock('../../hooks/use_significant_events_app_router', () => ({
  useSignificantEventsAppRouter: () => ({
    link: (path: string, params?: { path?: { tab: string }; query?: Record<string, string> }) =>
      params?.path
        ? `/${params.path.tab}`
        : `${path}${params?.query ? `?${new URLSearchParams(params.query)}` : ''}`,
  }),
}));
jest.mock('../../hooks/use_significant_events_availability', () => ({
  useSignificantEventsAvailability: () => ({
    availability: { available: true },
    isLoading: false,
  }),
}));
jest.mock('../../hooks/use_significant_events_maintenance', () => ({
  useBlocksNewActivity: () => ({
    isBlocked: false,
    isLoading: false,
    isError: false,
    status: undefined,
  }),
}));
jest.mock('../../components/page_template', () => ({
  // A stub with a test subject of its own: the page returns this instead of the
  // route's tab while a gated tab's availability query is still in flight, and
  // "not redirected" alone would also pass if the page had rendered nothing.
  SignificantEventsAppLoading: () => <div data-test-subj="app-loading" />,
  SignificantEventsAppHeader: ({ tabs }: { tabs: AppHeaderTab[] }) => (
    <div data-test-subj="app-header-tabs">
      {tabs.map((tab) => (
        <div key={tab.id} data-test-subj={`app-header-tab-${tab.id}`}>
          {tab.label}
          {typeof tab.badge === 'object' && (
            <span data-test-subj={`app-header-badge-${tab.id}`}>{tab.badge.iconType}</span>
          )}
        </div>
      ))}
    </div>
  ),
  SignificantEventsAppPageTemplate: {
    Body: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  },
}));
jest.mock('../../components/redirect_to', () => ({
  RedirectTo: ({ params }: { params?: { path?: { tab?: string } } }) => (
    <div data-test-subj="redirect-to">{params?.path?.tab}</div>
  ),
}));
jest.mock('./components/cortex/use_cortex', () => ({
  useCortexEnabled: () => mockFeatureAvailability.cortex(),
}));
jest.mock('./components/decision_trees/use_decision_trees', () => ({
  useDecisionTreesEnabled: () => mockFeatureAvailability.decision_trees(),
}));
jest.mock('./components/memory/use_memory', () => ({
  useMemoryEnabled: () => mockFeatureAvailability.memory(),
  useMemoryPages: () => ({ rows: [], isLoading: false, isError: false }),
  useMemoryPage: () => ({ data: undefined, isLoading: false, isError: false }),
}));
jest.mock('./components/knowledge_indicators_table', () => ({
  KnowledgeIndicatorsTable: () => null,
  KiGenerationProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('./components/queries_table/queries_table', () => ({
  QueriesTable: () => null,
}));
jest.mock('./components/sources_view/sources_view', () => ({
  SourcesView: () => <div data-test-subj="sources-tab-content" />,
}));
jest.mock('./components/cortex/tab', () => ({
  CortexTab: () => <div data-test-subj="cortex-tab-content" />,
}));
jest.mock('./components/decision_trees/tab', () => ({
  DecisionTreesTab: () => <div data-test-subj="decision_trees-tab-content" />,
}));
jest.mock('./components/memory/tab', () => ({
  MemoryTab: () => <div data-test-subj="memory-tab-content" />,
}));
jest.mock('./components/detections_tab', () => ({
  DetectionsTab: () => <div data-test-subj="detections-tab-content" />,
}));
jest.mock('./components/significant_events_tab', () => ({
  SignificantEventsTab: () => null,
}));
jest.mock('./components/run_limits_banner', () => ({
  RunLimitsBanner: () => null,
}));
jest.mock('./context/significant_events_page_context', () => ({
  SignificantEventsPageProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

/** The tabs whose header entry is gated on a server-side availability query. */
type GatedTab = 'cortex' | 'memory' | 'decision_trees';

const mockUseDeveloperMode = useDeveloperMode as jest.MockedFunction<typeof useDeveloperMode>;
const mockUseSignificantEventsAppParams = useSignificantEventsAppParams as jest.MockedFunction<
  typeof useSignificantEventsAppParams
>;

/**
 * The availability state of each gated tab, overridable per test.
 *
 * The three engine tabs gate their own header entry on a server-side query, so a
 * tab's presence is not known on the first render. Default: settled and off, which
 * is what the developer-mode cases below need and what the page has always seen.
 */
const availability: Record<GatedTab, FeatureAvailability> = {
  cortex: { isEnabled: false, isLoading: false },
  memory: { isEnabled: false, isLoading: false },
  decision_trees: { isEnabled: false, isLoading: false },
};

const mockFeatureAvailability = {
  cortex: () => availability.cortex,
  memory: () => availability.memory,
  decision_trees: () => availability.decision_trees,
};

const settleGates = (overrides: Partial<Record<GatedTab, FeatureAvailability>>) => {
  Object.assign(availability, { cortex: { isEnabled: false, isLoading: false } }, overrides);
};

const setup = ({ tab, isDeveloperMode }: { tab: string; isDeveloperMode: boolean }) => {
  mockUseDeveloperMode.mockReturnValue({
    isDeveloperMode,
    isSaving: false,
    setDeveloperMode: jest.fn(),
  });
  mockUseSignificantEventsAppParams.mockReturnValue({
    path: { tab },
  } as never);

  return render(
    <I18nProvider>
      <SignificantEventsPage />
    </I18nProvider>
  );
};

describe('SignificantEventsPage developer mode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    settleGates({});
  });

  it('hides the Detections tab when developer mode is off', () => {
    setup({ tab: 'sources', isDeveloperMode: false });

    expect(screen.getByTestId('app-header-tab-sources')).toBeInTheDocument();
    expect(screen.queryByTestId('app-header-tab-detections')).not.toBeInTheDocument();
  });

  it('shows the Detections tab with a code icon badge when developer mode is on', () => {
    setup({ tab: 'sources', isDeveloperMode: true });

    const detectionsTab = screen.getByTestId('app-header-tab-detections');
    expect(detectionsTab).toBeInTheDocument();
    expect(screen.getByTestId('app-header-badge-detections')).toHaveTextContent('code');
  });

  it('redirects /detections away when developer mode is off', () => {
    setup({ tab: 'detections', isDeveloperMode: false });

    expect(screen.getByTestId('redirect-to')).toHaveTextContent('sources');
    expect(screen.queryByTestId('detections-tab-content')).not.toBeInTheDocument();
  });
});

/**
 * A tab gated on an availability query reads as absent until that query answers.
 * The page answers an unknown tab by redirecting to its first one, so before this
 * was fixed a direct link to `/app/significant_events/memory` — and every refresh
 * of one — bounced to Streams and never came back.
 */
describe('SignificantEventsPage gated tabs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each<GatedTab>(['memory', 'cortex', 'decision_trees'])(
    'keeps the URL when the %s tab is still being asked about',
    (tab) => {
      settleGates({ [tab]: { isEnabled: false, isLoading: true } });
      setup({ tab, isDeveloperMode: false });

      // Waiting, not redirecting: the tab may be about to appear, and losing the
      // URL is the bug.
      expect(screen.queryByTestId('redirect-to')).not.toBeInTheDocument();
      expect(screen.getByTestId('app-loading')).toBeInTheDocument();
    }
  );

  it.each<GatedTab>(['memory', 'cortex', 'decision_trees'])(
    'renders the %s tab once its gate settles enabled',
    (tab) => {
      settleGates({ [tab]: { isEnabled: true, isLoading: false } });
      setup({ tab, isDeveloperMode: false });

      expect(screen.queryByTestId('redirect-to')).not.toBeInTheDocument();
      // Its own header entry and its own body: the other two gates are still off in
      // this case, so their tabs are legitimately absent.
      expect(screen.getByTestId(`app-header-tab-${tab}`)).toBeInTheDocument();
      expect(screen.getByTestId(`${tab}-tab-content`)).toBeInTheDocument();
    }
  );

  it.each<GatedTab>(['memory', 'cortex', 'decision_trees'])(
    'redirects to the first tab once the %s gate settles disabled',
    (tab) => {
      settleGates({ [tab]: { isEnabled: false, isLoading: false } });
      setup({ tab, isDeveloperMode: false });

      expect(screen.getByTestId('redirect-to')).toHaveTextContent('sources');
    }
  );

  it("does not make an ungated tab wait on a gated tab's query", () => {
    // Only the gate that governs the requested tab matters. Making every cold load
    // wait for all three would blank the page for tabs that need none of them.
    settleGates({ memory: { isEnabled: false, isLoading: true } });
    setup({ tab: 'sources', isDeveloperMode: false });

    expect(screen.getByTestId('sources-tab-content')).toBeInTheDocument();
    expect(screen.queryByTestId('app-loading')).not.toBeInTheDocument();
  });
});
