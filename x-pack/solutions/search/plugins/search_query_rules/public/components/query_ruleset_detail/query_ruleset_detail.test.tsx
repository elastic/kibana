/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen, within } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { QueryRulesetDetail } from './query_ruleset_detail';
import { MOCK_QUERY_RULESET_RESPONSE_FIXTURE } from '../../../common/__fixtures__/query_rules_ruleset';

jest.mock('../../hooks/use_fetch_ruleset_exists', () => ({
  useFetchQueryRulesetExist: jest.fn(() => ({
    data: { exists: false },
    isLoading: false,
    isError: false,
  })),
}));

jest.mock('./use_query_ruleset_detail_state', () => ({
  useQueryRulesetDetailState: jest.fn(() => ({
    queryRuleset: MOCK_QUERY_RULESET_RESPONSE_FIXTURE,
    rules: [
      ...MOCK_QUERY_RULESET_RESPONSE_FIXTURE.rules.map((rule) => ({
        ...rule,
        criteria: Array.isArray(rule.criteria) ? rule.criteria : [rule.criteria],
      })),
    ],

    setNewRules: jest.fn(),
    updateRule: jest.fn(),
  })),
}));

jest.mock('../../hooks/use_fetch_query_ruleset', () => ({
  useFetchQueryRuleset: jest.fn(() => ({
    data: {
      ...MOCK_QUERY_RULESET_RESPONSE_FIXTURE,
    },
    isLoading: false,
    isError: false,
    isInitialLoading: false,
  })),
}));

jest.mock('react-router-dom', () => ({
  useParams: jest.fn(() => ({ rulesetId: MOCK_QUERY_RULESET_RESPONSE_FIXTURE.ruleset_id })),
}));

jest.mock('../../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: {
      application: {
        navigateToUrl: jest.fn(),
        getUrlForApp: jest.fn().mockReturnValue('/app/test'),
      },
      http: {
        basePath: {
          prepend: jest.fn().mockImplementation((path) => `/base${path}`),
        },
      },
      overlays: {
        openConfirm: jest.fn().mockResolvedValue(true),
      },
      history: {
        block: jest.fn().mockReturnValue(jest.fn()),
        listen: jest.fn().mockReturnValue(jest.fn()),
      },
      console: {},
      share: {},
    },
  }),
}));

jest.mock('@kbn/unsaved-changes-prompt', () => ({
  useUnsavedChangesPrompt: jest.fn(),
}));

describe('Query rule detail', () => {
  const TEST_IDS = {
    DetailPage: 'queryRulesetDetailPage',
    DetailPageHeader: 'queryRulesetDetailHeader',
    HeaderSaveButton: 'queryRulesetDetailHeaderSaveButton',
    AddRuleButton: 'queryRulesetDetailAddRuleButton',
    DraggableItem: 'searchQueryRulesDraggableItem',
  };
  const queryClient = new QueryClient();
  const Wrapper = ({ children }: { children?: React.ReactNode }) => (
    <I18nProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </I18nProvider>
  );
  describe('existing query ruleset', () => {
    it('should render the query ruleset detail page', () => {
      render(<QueryRulesetDetail />, {
        wrapper: Wrapper,
      });

      const header = screen.getByTestId(TEST_IDS.DetailPageHeader);
      expect(within(header).getByText('my-ruleset')).toBeInTheDocument();
      expect(within(header).getByTestId(TEST_IDS.HeaderSaveButton)).toBeInTheDocument();
      expect(screen.getByTestId(TEST_IDS.AddRuleButton)).toBeInTheDocument();
      expect(screen.getAllByTestId(TEST_IDS.DraggableItem)).toHaveLength(
        MOCK_QUERY_RULESET_RESPONSE_FIXTURE.rules.length
      );
    });
  });
});
