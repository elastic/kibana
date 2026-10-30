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
import { getDefaultKnowledgeTab, type KnowledgeTabsAvailability } from './knowledge_tabs';
import { KnowledgePage, type KnowledgePageHeaderProps } from './page';

jest.mock('../hooks/use_kibana');
jest.mock('./hooks/use_knowledge_tabs_availability');
const mockAppHeader = jest.fn();
jest.mock('../components/app_header', () => ({
  NightshiftAppHeader: (props: unknown) => {
    mockAppHeader(props);
    return <div data-test-subj="knowledgeHeader" />;
  },
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
jest.mock('./knowledge_indicators/tab', () => ({
  KnowledgeIndicatorsTab: () => <div data-test-subj="knowledgeIndicatorsTab" />,
}));

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockUseKnowledgeTabsAvailability = useKnowledgeTabsAvailability as jest.MockedFunction<
  typeof useKnowledgeTabsAvailability
>;

const settledOff = { isEnabled: false, isLoading: false };
const knowledgeIndicatorsEnabled = { isEnabled: true, isLoading: false };
const headerProps: KnowledgePageHeaderProps = {};

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

it('renders an enabled deep link without waiting for unrelated gates', async () => {
  renderPage('/knowledge/memory', {
    knowledge_indicators: knowledgeIndicatorsEnabled,
    cortex: { isEnabled: false, isLoading: true },
    memory: { isEnabled: true, isLoading: false },
    decision_trees: { isEnabled: false, isLoading: true },
  });

  expect(await screen.findByTestId('memoryTab')).toBeInTheDocument();
  expect(screen.queryByTestId('nightshiftKnowledgePageLoading')).not.toBeInTheDocument();
});

it('marks only the Decision Trees tab with the developer mode badge', async () => {
  renderPage('/knowledge/decision_trees', {
    knowledge_indicators: knowledgeIndicatorsEnabled,
    cortex: settledOff,
    memory: { isEnabled: true, isLoading: false },
    decision_trees: { isEnabled: true, isLoading: false },
  });

  expect(await screen.findByTestId('decisionTreesTab')).toBeInTheDocument();
  const { tabs } = mockAppHeader.mock.lastCall[0];
  expect(tabs.map(({ id, badge }: { id: string; badge?: unknown }) => ({ id, badge }))).toEqual([
    { id: 'knowledge_indicators', badge: undefined },
    { id: 'memory', badge: undefined },
    { id: 'decision_trees', badge: { iconType: 'code' } },
  ]);
});

it('redirects a Decision Trees deep link when the tab is hidden', async () => {
  const { history } = renderPage('/knowledge/decision_trees', {
    knowledge_indicators: knowledgeIndicatorsEnabled,
    cortex: settledOff,
    memory: settledOff,
    decision_trees: settledOff,
  });

  expect(history.location.pathname).toBe('/knowledge/knowledge_indicators');
  expect(await screen.findByTestId('knowledgeIndicatorsTab')).toBeInTheDocument();
});

it('opens Knowledge Indicators immediately for a disabled deep link', async () => {
  const page = renderPage('/knowledge/memory', {
    knowledge_indicators: knowledgeIndicatorsEnabled,
    cortex: { isEnabled: false, isLoading: true },
    memory: settledOff,
    decision_trees: settledOff,
  });

  expect(page.history.location.pathname).toBe('/knowledge/knowledge_indicators');
  expect(await screen.findByTestId('knowledgeIndicatorsTab')).toBeInTheDocument();

  page.setAvailability({
    knowledge_indicators: knowledgeIndicatorsEnabled,
    cortex: { isEnabled: true, isLoading: false },
    memory: settledOff,
    decision_trees: settledOff,
  });

  expect(page.history.location.pathname).toBe('/knowledge/knowledge_indicators');
  expect(screen.getByTestId('knowledgeIndicatorsTab')).toBeInTheDocument();
});

it('defaults to Knowledge Indicators while optional tabs are loading', async () => {
  const { history } = renderPage('/knowledge', {
    knowledge_indicators: knowledgeIndicatorsEnabled,
    cortex: { isEnabled: false, isLoading: true },
    memory: { isEnabled: false, isLoading: true },
    decision_trees: { isEnabled: false, isLoading: true },
  });

  expect(history.location.pathname).toBe('/knowledge/knowledge_indicators');
  expect(await screen.findByTestId('knowledgeIndicatorsTab')).toBeInTheDocument();
});

describe('getDefaultKnowledgeTab', () => {
  it('selects Knowledge Indicators before optional gates', () => {
    expect(
      getDefaultKnowledgeTab({
        knowledge_indicators: knowledgeIndicatorsEnabled,
        cortex: { isEnabled: false, isLoading: true },
        memory: { isEnabled: true, isLoading: false },
        decision_trees: settledOff,
      })
    ).toBe('knowledge_indicators');
  });

  it('waits for an earlier loading tab when Knowledge Indicators is disabled', () => {
    expect(
      getDefaultKnowledgeTab({
        knowledge_indicators: settledOff,
        cortex: { isEnabled: false, isLoading: true },
        memory: { isEnabled: true, isLoading: false },
        decision_trees: settledOff,
      })
    ).toBe('loading');
  });

  it('returns no default when every tab is disabled', () => {
    expect(
      getDefaultKnowledgeTab({
        knowledge_indicators: settledOff,
        cortex: settledOff,
        memory: settledOff,
        decision_trees: settledOff,
      })
    ).toBeUndefined();
  });
});
