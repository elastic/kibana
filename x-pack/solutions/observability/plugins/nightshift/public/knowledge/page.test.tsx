/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Route, Router } from '@kbn/shared-ux-router';
import { useKibana } from '../hooks/use_kibana';
import { useKnowledgeTabsAvailability } from './hooks/use_knowledge_tabs_availability';
import type { KnowledgeTabsAvailability } from './knowledge_tabs';
import { KnowledgePage, type KnowledgePageHeaderProps } from './page';

jest.mock('../hooks/use_kibana');
jest.mock('./hooks/use_knowledge_tabs_availability');
jest.mock('../app/app_header', () => ({
  NightshiftAppHeader: () => <div data-test-subj="knowledgeHeader" />,
}));
jest.mock('./cortex/tab', () => ({
  CortexTab: () => <div data-test-subj="cortexTab" />,
}));
jest.mock('./memory/tab', () => ({
  MemoryTab: () => <div data-test-subj="memoryTab" />,
}));
jest.mock('./decision_trees/tab', () => ({
  DecisionTreesTab: () => <div data-test-subj="decisionTreesTab" />,
}));

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockUseKnowledgeTabsAvailability = useKnowledgeTabsAvailability as jest.MockedFunction<
  typeof useKnowledgeTabsAvailability
>;

const settledOff = { isEnabled: false, isLoading: false };
const headerProps: KnowledgePageHeaderProps = {
  onManagementClick: jest.fn(),
  managementHref: '/app/significant_events',
};

const renderPage = (path: string, initialAvailability: KnowledgeTabsAvailability) => {
  let availability = initialAvailability;
  mockUseKnowledgeTabsAvailability.mockImplementation(() => availability);
  const history = createMemoryHistory({ initialEntries: [path] });
  const result = render(
    <Router history={history}>
      <Route path="/knowledge/:tab?">
        <KnowledgePage headerProps={headerProps} />
      </Route>
    </Router>
  );

  return {
    ...result,
    history,
    setAvailability: (next: KnowledgeTabsAvailability) => {
      availability = next;
      result.rerender(
        <Router history={history}>
          <Route path="/knowledge/:tab?">
            <KnowledgePage headerProps={headerProps} />
          </Route>
        </Router>
      );
    },
  };
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseKibana.mockReturnValue({
    services: {
      application: {
        getUrlForApp: (_appId: string, { path }: { path: string }) => `/app/nightshift${path}`,
      },
    },
  } as unknown as ReturnType<typeof useKibana>);
});

it('renders an enabled deep link without waiting for unrelated gates', () => {
  renderPage('/knowledge/memory', {
    cortex: { isEnabled: false, isLoading: true },
    memory: { isEnabled: true, isLoading: false },
    decision_trees: { isEnabled: false, isLoading: true },
  });

  expect(screen.getByTestId('memoryTab')).toBeInTheDocument();
  expect(screen.queryByTestId('nightshiftKnowledgePageLoading')).not.toBeInTheDocument();
});

it('waits for fallback gates before redirecting a disabled deep link', () => {
  const page = renderPage('/knowledge/memory', {
    cortex: { isEnabled: false, isLoading: true },
    memory: settledOff,
    decision_trees: settledOff,
  });

  expect(screen.getByTestId('nightshiftKnowledgePageLoading')).toBeInTheDocument();
  expect(page.history.location.pathname).toBe('/knowledge/memory');

  page.setAvailability({
    cortex: { isEnabled: true, isLoading: false },
    memory: settledOff,
    decision_trees: settledOff,
  });

  expect(page.history.location.pathname).toBe('/knowledge/cortex');
  expect(screen.getByTestId('cortexTab')).toBeInTheDocument();
});

it('redirects to Nightshift when every tab is disabled', () => {
  const { history } = renderPage('/knowledge', {
    cortex: settledOff,
    memory: settledOff,
    decision_trees: settledOff,
  });

  expect(history.location.pathname).toBe('/');
});
