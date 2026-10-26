/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import React from 'react';
import { Router } from '@kbn/shared-ux-router';
import type { DetectionRule } from '../../../data/rules/use_detection_rules';
import { useDetectionRuleById, useDetectionRules } from '../../../data/rules/use_detection_rules';
import { useRulesDemote } from '../../../data/rules/use_rules_demote';
import { RulesTab } from './rules_tab';

const mockWarning = jest.fn();
const mockDemoteRules = jest.fn();
const mockUseDetectionRules = useDetectionRules as jest.Mock;
const mockUseDetectionRuleById = useDetectionRuleById as jest.Mock;
const mockUseRulesDemote = useRulesDemote as jest.Mock;
let mockCanManage = true;
let mockBlocksActivity = false;

jest.mock('../../../data/rules/use_detection_rules');
jest.mock('../../../data/rules/use_rules_demote');
jest.mock('../../../data/maintenance/use_significant_events_maintenance', () => ({
  useBlocksNewActivity: () => ({ blocksActivity: mockBlocksActivity }),
}));
jest.mock('@kbn/nightshift-shared', () => ({
  getNightshiftCapabilities: () => ({ canManage: mockCanManage }),
}));
jest.mock('../../../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: {
      application: { capabilities: { nightshift: {} } },
      notifications: { toasts: { addWarning: mockWarning } },
    },
  }),
}));
jest.mock('./rule_matches_chart', () => ({
  RuleMatchesChart: ({ rules }: { rules: DetectionRule[] }) => (
    <div data-test-subj="chartTotal">{rules.reduce((sum, rule) => sum + rule.matches, 0)}</div>
  ),
}));
jest.mock('../../../components/entities/rule/rule_flyout', () => ({
  RuleFlyout: ({ rule }: { rule: DetectionRule }) => (
    <div data-test-subj="ruleFlyoutStub">{rule.query.title}</div>
  ),
}));
jest.mock('./rules_table', () => ({
  RulesTable: ({
    rules,
    canManage,
    onOpen,
    selected,
    onSelectionChange,
  }: {
    rules: DetectionRule[];
    canManage: boolean;
    onOpen: (rule: DetectionRule) => void;
    selected: DetectionRule[];
    onSelectionChange: (rules: DetectionRule[]) => void;
  }) => (
    <div>
      {rules.map((rule) => (
        <button key={rule.query.id} onClick={() => onOpen(rule)}>
          {rule.query.title}
        </button>
      ))}
      {canManage ? (
        <button data-test-subj="selectRule" onClick={() => onSelectionChange([rules[0]])}>
          {selected.length} selected
        </button>
      ) : null}
    </div>
  ),
}));

const rules = [
  { query: { id: 'q1', title: 'Error rate', description: 'Failures' }, matches: 5 },
  { query: { id: 'q2', title: 'Latency', description: 'Slow responses' }, matches: 2 },
] as DetectionRule[];

const renderTab = (path = '/detections/rules', entities: string[] = []) => {
  const history = createMemoryHistory({ initialEntries: [path] });
  render(
    <I18nProvider>
      <EuiProvider>
        <Router history={history}>
          <RulesTab
            timeRange={{ from: 'now-24h', to: 'now' }}
            onTimeRangeChange={jest.fn()}
            entities={entities}
            unassigned={false}
          />
        </Router>
      </EuiProvider>
    </I18nProvider>
  );
  return history;
};

describe('RulesTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanManage = true;
    mockBlocksActivity = false;
    mockDemoteRules.mockResolvedValue(undefined);
    mockUseRulesDemote.mockReturnValue({ demoteRules: mockDemoteRules, isPending: false });
    mockUseDetectionRules.mockReturnValue({
      rules,
      total: 2,
      hasData: true,
      isLoading: false,
      isFetching: false,
      isTruncated: false,
      getSourceTitle: (id: string) => id,
      refetch: jest.fn(),
    });
    mockUseDetectionRuleById.mockReturnValue({ rule: undefined, isResolved: false });
  });

  it('renders all rules', () => {
    renderTab();
    expect(screen.getByRole('button', { name: 'Error rate' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Latency' })).toBeInTheDocument();
  });

  it('searches title and description without changing the chart total', () => {
    renderTab();
    fireEvent.change(screen.getByTestId('nightshiftDetectionRulesSearch'), {
      target: { value: 'slow' },
    });
    expect(screen.queryByRole('button', { name: 'Error rate' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Latency' })).toBeInTheDocument();
    expect(screen.getByTestId('chartTotal')).toHaveTextContent('7');
  });

  it('restores the search from the URL on Back after typing a newer one', async () => {
    const history = renderTab('/detections/rules?rulesSearch=slow');
    history.push('/detections/rules?rulesSearch=slow&entity=checkout');
    fireEvent.change(screen.getByTestId('nightshiftDetectionRulesSearch'), {
      target: { value: 'error' },
    });
    history.goBack();
    await waitFor(() =>
      expect(screen.getByTestId('nightshiftDetectionRulesSearch')).toHaveValue('slow')
    );
    expect(screen.getByRole('button', { name: 'Latency' })).toBeInTheDocument();
  });

  it('explains an empty entity selection instead of showing the empty engine state', () => {
    mockUseDetectionRules.mockReturnValue({
      ...mockUseDetectionRules(),
      rules: [],
      total: 0,
    });
    renderTab('/detections/rules', ['checkout']);
    expect(screen.queryByTestId('nightshiftDetectionRulesEmpty')).not.toBeInTheDocument();
    expect(screen.getByText('No rules for the selected entities')).toBeInTheDocument();
  });

  it('opens a rule via its id in the URL', () => {
    const history = renderTab();
    fireEvent.click(screen.getByRole('button', { name: 'Error rate' }));
    expect(history.location.search).toContain('ruleId=q1');
    expect(screen.getByTestId('ruleFlyoutStub')).toHaveTextContent('Error rate');
  });

  it('removes a missing deep link with a warning', async () => {
    const history = renderTab('/detections/rules?ruleId=missing');
    await waitFor(() => expect(mockWarning).toHaveBeenCalled());
    expect(history.location.search).not.toContain('ruleId');
  });

  it('looks up a deep-linked rule outside the first 1,000 instead of calling it missing', () => {
    mockUseDetectionRules.mockReturnValue({
      ...mockUseDetectionRules(),
      total: 1001,
      isTruncated: true,
    });
    const farRule = { query: { id: 'q1001', title: 'Far rule', description: '' }, matches: 0 };
    mockUseDetectionRuleById.mockReturnValue({ rule: farRule, isResolved: true });
    const history = renderTab('/detections/rules?ruleId=q1001');
    expect(mockUseDetectionRuleById).toHaveBeenCalledWith(expect.anything(), 'q1001', true);
    expect(screen.getByTestId('ruleFlyoutStub')).toHaveTextContent('Far rule');
    expect(mockWarning).not.toHaveBeenCalled();
    expect(history.location.search).toContain('ruleId=q1001');
  });

  it('demotes selected rules after confirmation', async () => {
    renderTab();
    fireEvent.click(screen.getByTestId('selectRule'));
    fireEvent.click(screen.getByText('Delete selected'));
    fireEvent.click(screen.getByRole('button', { name: /^Delete$/ }));
    await waitFor(() => expect(mockDemoteRules).toHaveBeenCalledWith(['q1']));
    await waitFor(() => expect(screen.getByTestId('selectRule')).toHaveTextContent('0 selected'));
  });

  it('hides selection and delete for read-only users', () => {
    mockCanManage = false;
    renderTab();
    expect(screen.queryByTestId('selectRule')).not.toBeInTheDocument();
    expect(screen.queryByText('Delete selected')).not.toBeInTheDocument();
  });
});
