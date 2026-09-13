/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Component tests for the detection rules management page.
 *
 * Tests cover:
 *  - Table renders the expected columns from the API response.
 *  - Filter controls compose the correct query parameters.
 *  - Enable/disable toggle and delete button call the right API endpoints.
 *  - The management section is not registered when the feature flag is off.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { DetectionRuleResponse } from '../../../common/api';
import type { DetectionRulesApi, ListRulesParams } from '../../services/detection_rules_api';
import { DetectionRulesContext } from './detection_rules_context';
import { DetectionRulesPage } from './detection_rules_page';
import type { SecurityDetectionsPluginSetupDeps } from '../../plugin';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const makeRule = (overrides: Partial<DetectionRuleResponse> = {}): DetectionRuleResponse =>
  ({
    id: 'rule-1',
    rule_id: 'sig-1',
    revision: 0,
    source: { type: 'internal' },
    created_at: '2024-01-01T00:00:00Z',
    created_by: 'user',
    updated_at: '2024-01-01T00:00:00Z',
    updated_by: 'user',
    enabled: true,
    version: 1,
    name: 'Test Rule',
    description: 'desc',
    tags: ['prod', 'linux'],
    severity: 'high',
    risk_score: 75,
    max_signals: 100,
    threat: [],
    setup: '',
    references: [],
    false_positives: [],
    author: [],
    related_integrations: [],
    required_fields: [],
    schedule: { interval: '5m' },
    type: 'query',
    index: ['logs-*'],
    query: 'host.name: *',
    language: 'kuery',
    ...overrides,
  } as DetectionRuleResponse);

const makeApi = (overrides: Partial<DetectionRulesApi> = {}): jest.Mocked<DetectionRulesApi> =>
  ({
    listRules: jest.fn().mockResolvedValue({ page: 1, per_page: 20, total: 0, data: [] }),
    enableRule: jest.fn().mockResolvedValue(makeRule({ enabled: true })),
    disableRule: jest.fn().mockResolvedValue(makeRule({ enabled: false })),
    deleteRule: jest.fn().mockResolvedValue(makeRule()),
    ...overrides,
  } as jest.Mocked<DetectionRulesApi>);

const makeNotifications = () => ({
  toasts: {
    addSuccess: jest.fn(),
    addDanger: jest.fn(),
  },
});

const renderPage = (api: jest.Mocked<DetectionRulesApi>) => {
  const notifications = makeNotifications();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  const result = render(
    <QueryClientProvider client={queryClient}>
      <DetectionRulesContext.Provider value={{ api, notifications: notifications as any }}>
        <DetectionRulesPage />
      </DetectionRulesContext.Provider>
    </QueryClientProvider>
  );

  return { ...result, notifications, queryClient };
};

// ---------------------------------------------------------------------------
// Table rendering tests
// ---------------------------------------------------------------------------

describe('DetectionRulesPage — table rendering', () => {
  it('renders the page header', async () => {
    const api = makeApi();
    renderPage(api);

    expect(screen.getByTestId('detectionRulesPage')).toBeInTheDocument();
    expect(screen.getByTestId('detectionRulesPageHeader')).toBeInTheDocument();
  });

  it('shows the rules returned by the API', async () => {
    const rule1 = makeRule({ id: 'r1', name: 'Alpha Rule', severity: 'low', risk_score: 21 });
    const rule2 = makeRule({ id: 'r2', name: 'Beta Rule', severity: 'critical', risk_score: 99 });
    const api = makeApi({
      listRules: jest
        .fn()
        .mockResolvedValue({ page: 1, per_page: 20, total: 2, data: [rule1, rule2] }),
    });

    renderPage(api);

    await waitFor(() => {
      expect(screen.getByText('Alpha Rule')).toBeInTheDocument();
      expect(screen.getByText('Beta Rule')).toBeInTheDocument();
    });
  });

  it('renders severity, risk score, type, and tags columns', async () => {
    const rule = makeRule({
      id: 'r1',
      name: 'My Rule',
      type: 'threshold',
      severity: 'medium',
      risk_score: 50,
      tags: ['tag-a', 'tag-b'],
    });
    const api = makeApi({
      listRules: jest.fn().mockResolvedValue({ page: 1, per_page: 20, total: 1, data: [rule] }),
    });

    renderPage(api);

    await waitFor(() => {
      // Name
      expect(screen.getByText('My Rule')).toBeInTheDocument();
      // Type badge — rendered by a custom render fn with data-test-subj
      expect(screen.getByTestId('ruleTypeCell')).toHaveTextContent('threshold');
      // Severity badge — rendered by a custom render fn with data-test-subj
      expect(screen.getByTestId('ruleSeverityCell')).toHaveTextContent('medium');
      // Risk score — rendered as plain text by EuiBasicTable's field accessor;
      // check by text since no per-cell data-test-subj is available.
      expect(screen.getByText('50')).toBeInTheDocument();
      // Tags
      expect(screen.getByText('tag-a')).toBeInTheDocument();
      expect(screen.getByText('tag-b')).toBeInTheDocument();
    });
  });

  it('renders an enabled toggle for each rule', async () => {
    const rule = makeRule({ id: 'rule-42', enabled: true });
    const api = makeApi({
      listRules: jest.fn().mockResolvedValue({ page: 1, per_page: 20, total: 1, data: [rule] }),
    });

    renderPage(api);

    await waitFor(() => {
      const toggle = screen.getByTestId('ruleEnabledSwitch-rule-42');
      expect(toggle).toBeInTheDocument();
      // checked corresponds to enabled=true
      expect(toggle).toBeChecked();
    });
  });

  it('does not offer a severity sort column', async () => {
    const api = makeApi();
    renderPage(api);

    // The severity column header must not be a sortable button.
    // EuiBasicTable renders non-sortable columns as plain <span>, not <button>.
    await waitFor(() => {
      const header = screen.getByText('Severity');
      // Should NOT be inside a sort button.
      expect(header.closest('button')).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// Filter → query param tests
// ---------------------------------------------------------------------------

describe('DetectionRulesPage — filters', () => {
  it('calls listRules with the correct default params on mount', async () => {
    const api = makeApi();
    renderPage(api);

    await waitFor(() => {
      expect(api.listRules).toHaveBeenCalledWith(
        expect.objectContaining({
          sort_field: 'name',
          sort_order: 'asc',
          page: 1,
          per_page: 20,
        })
      );
    });
  });

  it('passes search text as the search param', async () => {
    const api = makeApi();
    renderPage(api);

    await waitFor(() => screen.getByTestId('detectionRulesSearchInput'));

    const input = screen.getByTestId('detectionRulesSearchInput');
    fireEvent.change(input, { target: { value: 'my rule' } });

    await waitFor(() => {
      const lastCall = api.listRules.mock.calls[
        api.listRules.mock.calls.length - 1
      ][0] as ListRulesParams;
      expect(lastCall.search).toBe('my rule');
    });
  });

  it('passes enabled=true when "Enabled" status is selected', async () => {
    const api = makeApi();
    renderPage(api);

    await waitFor(() => screen.getByTestId('detectionRulesStatusFilter'));

    const select = screen.getByTestId('detectionRulesStatusFilter');
    fireEvent.change(select, { target: { value: 'enabled' } });

    await waitFor(() => {
      const lastCall = api.listRules.mock.calls[
        api.listRules.mock.calls.length - 1
      ][0] as ListRulesParams;
      expect(lastCall.enabled).toBe(true);
    });
  });

  it('passes enabled=false when "Disabled" status is selected', async () => {
    const api = makeApi();
    renderPage(api);

    await waitFor(() => screen.getByTestId('detectionRulesStatusFilter'));

    fireEvent.change(screen.getByTestId('detectionRulesStatusFilter'), {
      target: { value: 'disabled' },
    });

    await waitFor(() => {
      const lastCall = api.listRules.mock.calls[
        api.listRules.mock.calls.length - 1
      ][0] as ListRulesParams;
      expect(lastCall.enabled).toBe(false);
    });
  });

  it('passes type=["threshold"] when "Threshold" type is selected', async () => {
    const api = makeApi();
    renderPage(api);

    await waitFor(() => screen.getByTestId('detectionRulesTypeFilter'));

    fireEvent.change(screen.getByTestId('detectionRulesTypeFilter'), {
      target: { value: 'threshold' },
    });

    await waitFor(() => {
      const lastCall = api.listRules.mock.calls[
        api.listRules.mock.calls.length - 1
      ][0] as ListRulesParams;
      expect(lastCall.type).toEqual(['threshold']);
    });
  });

  it('passes severity=["critical"] when "Critical" severity is selected', async () => {
    const api = makeApi();
    renderPage(api);

    await waitFor(() => screen.getByTestId('detectionRulesSeverityFilter'));

    fireEvent.change(screen.getByTestId('detectionRulesSeverityFilter'), {
      target: { value: 'critical' },
    });

    await waitFor(() => {
      const lastCall = api.listRules.mock.calls[
        api.listRules.mock.calls.length - 1
      ][0] as ListRulesParams;
      expect(lastCall.severity).toEqual(['critical']);
    });
  });

  it('omits filter params when "All" is selected', async () => {
    const api = makeApi();
    renderPage(api);

    await waitFor(() => screen.getByTestId('detectionRulesStatusFilter'));

    // Select a filter then clear it.
    fireEvent.change(screen.getByTestId('detectionRulesStatusFilter'), {
      target: { value: 'enabled' },
    });
    fireEvent.change(screen.getByTestId('detectionRulesStatusFilter'), {
      target: { value: 'all' },
    });

    await waitFor(() => {
      const lastCall = api.listRules.mock.calls[
        api.listRules.mock.calls.length - 1
      ][0] as ListRulesParams;
      expect(lastCall.enabled).toBeUndefined();
    });
  });

  it('clears all filters via the Clear filters button', async () => {
    const api = makeApi();
    renderPage(api);

    await waitFor(() => screen.getByTestId('detectionRulesSearchInput'));

    // Set a few filters.
    fireEvent.change(screen.getByTestId('detectionRulesSearchInput'), {
      target: { value: 'hello' },
    });
    fireEvent.change(screen.getByTestId('detectionRulesTypeFilter'), {
      target: { value: 'query' },
    });

    // Clear them.
    fireEvent.click(screen.getByTestId('detectionRulesClearFilters'));

    await waitFor(() => {
      const lastCall = api.listRules.mock.calls[
        api.listRules.mock.calls.length - 1
      ][0] as ListRulesParams;
      expect(lastCall.search).toBeUndefined();
      expect(lastCall.type).toBeUndefined();
    });
  });
});

// ---------------------------------------------------------------------------
// Row action tests
// ---------------------------------------------------------------------------

describe('DetectionRulesPage — row actions', () => {
  it('calls disableRule when the enabled toggle is clicked for an enabled rule', async () => {
    const rule = makeRule({ id: 'r1', enabled: true });
    const api = makeApi({
      listRules: jest.fn().mockResolvedValue({ page: 1, per_page: 20, total: 1, data: [rule] }),
    });

    renderPage(api);

    await waitFor(() => screen.getByTestId('ruleEnabledSwitch-r1'));
    fireEvent.click(screen.getByTestId('ruleEnabledSwitch-r1'));

    await waitFor(() => {
      expect(api.disableRule).toHaveBeenCalledWith('r1');
      expect(api.enableRule).not.toHaveBeenCalled();
    });
  });

  it('calls enableRule when the enabled toggle is clicked for a disabled rule', async () => {
    const rule = makeRule({ id: 'r1', enabled: false });
    const api = makeApi({
      listRules: jest.fn().mockResolvedValue({ page: 1, per_page: 20, total: 1, data: [rule] }),
    });

    renderPage(api);

    await waitFor(() => screen.getByTestId('ruleEnabledSwitch-r1'));
    fireEvent.click(screen.getByTestId('ruleEnabledSwitch-r1'));

    await waitFor(() => {
      expect(api.enableRule).toHaveBeenCalledWith('r1');
      expect(api.disableRule).not.toHaveBeenCalled();
    });
  });

  it('calls deleteRule when the delete button is clicked', async () => {
    const rule = makeRule({ id: 'r1' });
    const api = makeApi({
      listRules: jest.fn().mockResolvedValue({ page: 1, per_page: 20, total: 1, data: [rule] }),
    });

    renderPage(api);

    await waitFor(() => screen.getByTestId('deleteRule-r1'));
    fireEvent.click(screen.getByTestId('deleteRule-r1'));

    await waitFor(() => {
      expect(api.deleteRule).toHaveBeenCalledWith('r1');
    });
  });
});

// ---------------------------------------------------------------------------
// Feature flag off — page absent
// ---------------------------------------------------------------------------

describe('Feature flag off — management app not registered', () => {
  it('does not register any management section when detectionsEnabled is false', () => {
    // When the flag is off, plugin.setup() returns early without registering
    // the management section or the app. Simulate this by verifying
    // management.sections.register is never called when the flag is false.
    const managementMock = {
      sections: {
        register: jest.fn().mockReturnValue({ registerApp: jest.fn() }),
        section: { ai: { registerApp: jest.fn() } },
      },
    } as unknown as SecurityDetectionsPluginSetupDeps['management'];

    // Import the plugin class and construct with flag=false.
    const { SecurityDetectionsPublicPlugin } = jest.requireActual('../../plugin');

    const initContext = {
      config: {
        get: () => ({ enableDetectionsOnV2: false }),
      },
    } as any;

    const plugin = new SecurityDetectionsPublicPlugin(initContext);
    const coreSetup = {
      getStartServices: jest.fn().mockResolvedValue([{}]),
    } as any;

    plugin.setup(coreSetup, { management: managementMock });

    expect(managementMock.sections.register).not.toHaveBeenCalled();
  });

  it('registers the management section when detectionsEnabled is true', () => {
    const registerApp = jest.fn();
    const managementMock = {
      sections: {
        register: jest.fn().mockReturnValue({ registerApp }),
        section: { ai: { registerApp: jest.fn() } },
      },
    } as unknown as SecurityDetectionsPluginSetupDeps['management'];

    const { SecurityDetectionsPublicPlugin } = jest.requireActual('../../plugin');

    const initContext = {
      config: {
        get: () => ({ enableDetectionsOnV2: true }),
      },
    } as any;

    const plugin = new SecurityDetectionsPublicPlugin(initContext);
    const coreSetup = {
      getStartServices: jest.fn().mockResolvedValue([{}]),
    } as any;

    plugin.setup(coreSetup, { management: managementMock });

    expect(managementMock.sections.register).toHaveBeenCalledTimes(1);
    expect(registerApp).toHaveBeenCalledTimes(1);
  });
});
