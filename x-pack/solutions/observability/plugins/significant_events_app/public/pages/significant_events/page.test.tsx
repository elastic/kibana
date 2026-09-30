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
    link: (path: string, params?: { path: { tab: string } }) =>
      params ? `/${params.path.tab}` : path,
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
  useCortexEnabled: () => false,
}));
jest.mock('./components/decision_trees/use_decision_trees', () => ({
  useDecisionTreesEnabled: () => false,
}));
jest.mock('./components/knowledge_indicators_table', () => ({
  KnowledgeIndicatorsTable: () => null,
  KiGenerationProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('./components/queries_table/queries_table', () => ({
  QueriesTable: () => null,
}));
jest.mock('./components/streams_view/streams_view', () => ({
  StreamsView: () => <div data-test-subj="streams-tab-content" />,
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

const mockUseDeveloperMode = useDeveloperMode as jest.MockedFunction<typeof useDeveloperMode>;
const mockUseSignificantEventsAppParams = useSignificantEventsAppParams as jest.MockedFunction<
  typeof useSignificantEventsAppParams
>;

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
