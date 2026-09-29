/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { MockedFunction } from 'vitest';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { AppHeaderTab } from '@kbn/app-header';
import { useDeveloperMode } from '../../hooks/use_developer_mode';
import { useSignificantEventsAppParams } from '../../hooks/use_significant_events_app_params';
import { SignificantEventsPage } from './page';

vi.mock('../../hooks/use_developer_mode');
vi.mock('../../hooks/use_kibana', () => {
      const mocked = {
      useKibana: () => ({
        core: {
          application: {
            getUrlForApp: vi.fn(() => '/app/nightshift'),
            capabilities: {
              nightshift: {
                show: true,
                manage: true,
                configure: true,
              },
            },
          },
          chrome: {
            setBreadcrumbs: vi.fn(),
          },
          notifications: {
            toasts: {
              addError: vi.fn(),
            },
          },
        },
        dependencies: {
          start: {},
        },
      }),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../hooks/use_significant_events_app_params', () => {
      const mocked = {
      useSignificantEventsAppParams: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../hooks/use_significant_events_app_router', () => {
      const mocked = {
      useSignificantEventsAppRouter: () => ({
        link: (path: string, params?: { path: { tab: string } }) =>
          params ? `/${params.path.tab}` : path,
      }),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../hooks/use_significant_events_availability', () => {
      const mocked = {
      useSignificantEventsAvailability: () => ({
        availability: { available: true },
        isLoading: false,
      }),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../hooks/use_significant_events_maintenance', () => {
      const mocked = {
      useBlocksNewActivity: () => ({
        isBlocked: false,
        isLoading: false,
        isError: false,
        status: undefined,
      }),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../components/page_template', () => {
      const mocked = {
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
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../components/redirect_to', () => {
      const mocked = {
      RedirectTo: ({ params }: { params?: { path?: { tab?: string } } }) => (
        <div data-test-subj="redirect-to">{params?.path?.tab}</div>
      ),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('./components/cortex/use_cortex', () => {
      const mocked = {
      useCortexEnabled: () => false,
    };
      return { ...mocked, default: mocked };
    });
vi.mock('./components/decision_trees/use_decision_trees', () => {
      const mocked = {
      useDecisionTreesEnabled: () => false,
    };
      return { ...mocked, default: mocked };
    });
vi.mock('./components/knowledge_indicators_table', () => {
      const mocked = {
      KnowledgeIndicatorsTable: () => null,
      KiGenerationProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    };
      return { ...mocked, default: mocked };
    });
vi.mock('./components/queries_table/queries_table', () => {
      const mocked = {
      QueriesTable: () => null,
    };
      return { ...mocked, default: mocked };
    });
vi.mock('./components/streams_view/streams_view', () => {
      const mocked = {
      StreamsView: () => <div data-test-subj="streams-tab-content" />,
    };
      return { ...mocked, default: mocked };
    });
vi.mock('./components/detections_tab', () => {
      const mocked = {
      DetectionsTab: () => <div data-test-subj="detections-tab-content" />,
    };
      return { ...mocked, default: mocked };
    });
vi.mock('./components/significant_events_tab', () => {
      const mocked = {
      SignificantEventsTab: () => null,
    };
      return { ...mocked, default: mocked };
    });
vi.mock('./components/run_limits_banner', () => {
      const mocked = {
      RunLimitsBanner: () => null,
    };
      return { ...mocked, default: mocked };
    });
vi.mock('./context/significant_events_page_context', () => {
      const mocked = {
      SignificantEventsPageProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    };
      return { ...mocked, default: mocked };
    });

const mockUseDeveloperMode = useDeveloperMode as MockedFunction<typeof useDeveloperMode>;
const mockUseSignificantEventsAppParams = useSignificantEventsAppParams as MockedFunction<
  typeof useSignificantEventsAppParams
>;

const setup = ({ tab, isDeveloperMode }: { tab: string; isDeveloperMode: boolean }) => {
  mockUseDeveloperMode.mockReturnValue({
    isDeveloperMode,
    isSaving: false,
    setDeveloperMode: vi.fn(),
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
    vi.clearAllMocks();
  });

  it('hides the Detections tab when developer mode is off', () => {
    setup({ tab: 'streams', isDeveloperMode: false });

    expect(screen.getByTestId('app-header-tab-streams')).toBeInTheDocument();
    expect(screen.queryByTestId('app-header-tab-detections')).not.toBeInTheDocument();
  });

  it('shows the Detections tab with a code icon badge when developer mode is on', () => {
    setup({ tab: 'streams', isDeveloperMode: true });

    const detectionsTab = screen.getByTestId('app-header-tab-detections');
    expect(detectionsTab).toBeInTheDocument();
    expect(screen.getByTestId('app-header-badge-detections')).toHaveTextContent('code');
  });

  it('redirects /detections away when developer mode is off', () => {
    setup({ tab: 'detections', isDeveloperMode: false });

    expect(screen.getByTestId('redirect-to')).toHaveTextContent('streams');
    expect(screen.queryByTestId('detections-tab-content')).not.toBeInTheDocument();
  });
});
