/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { render, screen, within } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { MockChromeContextProvider } from '@kbn/core-chrome-browser-context-mocks';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import React from 'react';
import { QueryRulesetDetail } from './query_ruleset_detail';
import { MOCK_QUERY_RULESET_RESPONSE_FIXTURE } from '../../../common/__fixtures__/query_rules_ruleset';

vi.mock('../../hooks/use_fetch_ruleset_exists', () => {
      const mocked = {
      useFetchQueryRulesetExist: vi.fn(() => ({
        data: { exists: false },
        isLoading: false,
        isError: false,
      })),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./use_query_ruleset_detail_state', () => {
      const mocked = {
      useQueryRulesetDetailState: vi.fn(() => ({
        queryRuleset: MOCK_QUERY_RULESET_RESPONSE_FIXTURE,
        rules: [
          ...MOCK_QUERY_RULESET_RESPONSE_FIXTURE.rules.map((rule) => ({
            ...rule,
            criteria: Array.isArray(rule.criteria) ? rule.criteria : [rule.criteria],
          })),
        ],

        setNewRules: vi.fn(),
        updateRule: vi.fn(),
      })),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../hooks/use_fetch_query_ruleset', () => {
      const mocked = {
      useFetchQueryRuleset: vi.fn(() => ({
        data: {
          ...MOCK_QUERY_RULESET_RESPONSE_FIXTURE,
        },
        isLoading: false,
        isError: false,
        isInitialLoading: false,
      })),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('react-router-dom', () => {
      const mocked = {
      useParams: vi.fn(() => ({ rulesetId: MOCK_QUERY_RULESET_RESPONSE_FIXTURE.ruleset_id })),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../hooks/use_kibana', async () => {
  const { notificationServiceMock } = (await vi.importActual('@kbn/core/public/mocks'));
  return {
    useKibana: () => ({
      services: {
        application: {
          navigateToUrl: vi.fn(),
          getUrlForApp: vi.fn().mockReturnValue('/app/test'),
        },
        http: {
          basePath: {
            prepend: vi.fn().mockImplementation((path) => `/base${path}`),
          },
        },
        overlays: {
          openConfirm: vi.fn().mockResolvedValue(true),
        },
        history: {
          block: vi.fn().mockReturnValue(vi.fn()),
          listen: vi.fn().mockReturnValue(vi.fn()),
          createHref: vi.fn().mockImplementation((location) => location.pathname || '/'),
        },
        console: {},
        share: {},
        notifications: notificationServiceMock.createStartContract(),
        searchNavigation: {
          useClassicNavigation: vi.fn(),
          breadcrumbs: {
            setSearchBreadCrumbs: vi.fn(),
            clearBreadcrumbs: vi.fn(),
          },
        },
        chrome: {
          getChromeStyle: vi.fn().mockReturnValue('classic'),
        },
      },
    }),
  };
});

vi.mock('@kbn/unsaved-changes-prompt', () => {
      const mocked = {
      useUnsavedChangesPrompt: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

describe('Query rule detail', () => {
  const TEST_IDS = {
    DetailPage: 'queryRulesetDetailPage',
    HeaderSaveButton: 'queryRulesetDetailHeaderSaveButton',
    AddRuleButton: 'queryRulesetDetailAddRuleButton',
    DraggableItem: 'searchQueryRulesDraggableItem',
  };
  const queryClient = new QueryClient();
  const Wrapper = ({ children }: { children?: React.ReactNode }) => (
    <MockChromeContextProvider>
      <I18nProvider>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </I18nProvider>
    </MockChromeContextProvider>
  );
  describe('existing query ruleset', () => {
    it('should render the query ruleset detail page', async () => {
      render(<QueryRulesetDetail />, {
        wrapper: Wrapper,
      });

      const header = screen.getByTestId(APP_HEADER_TEST_SUBJECTS.root);
      expect(within(header).getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent(
        'my-ruleset'
      );
      expect(await within(header).findByTestId(TEST_IDS.HeaderSaveButton)).toBeInTheDocument();
      expect(screen.getByTestId(TEST_IDS.AddRuleButton)).toBeInTheDocument();
      expect(screen.getAllByTestId(TEST_IDS.DraggableItem)).toHaveLength(
        MOCK_QUERY_RULESET_RESPONSE_FIXTURE.rules.length
      );
    });
  });
});
