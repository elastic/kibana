/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { coreMock } from '@kbn/core/public/mocks';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { KibanaContextProvider } from '../../../../common/lib/kibana';
import { RULES_FEATURE_ID } from '../../../../../common/constants';
import {
  ALERT_ANALYSIS_WORKFLOW_RULE_SELECTION_ROUTE,
  ALERT_ANALYSIS_WORKFLOW_RULE_STATS_ROUTE,
  ALERT_ANALYSIS_WORKFLOW_RULE_UPDATE_ROUTE,
  ALERT_ANALYSIS_WORKFLOW_RULES_ROUTE,
} from './api';
import { AlertAnalysisWorkflowRuleAttachmentSection } from './rule_attachment_section';

const PAGE_1_RULES = [
  { id: 'p1-rule-1', name: 'Rule 1', enabled: true, attached: true },
  { id: 'p1-rule-2', name: 'Rule 2', enabled: true, attached: true },
  { id: 'p1-rule-3', name: 'Rule 3', enabled: true, attached: true },
  { id: 'p1-rule-4', name: 'Rule 4', enabled: true, attached: true },
  { id: 'p1-rule-5', name: 'Rule 5', enabled: true, attached: true },
];

const PAGE_2_RULES = [
  { id: 'p2-rule-1', name: 'Rule 6', enabled: false, attached: false },
  { id: 'p2-rule-2', name: 'Rule 7', enabled: false, attached: false },
  { id: 'p2-rule-3', name: 'Rule 8', enabled: false, attached: false },
  { id: 'p2-rule-4', name: 'Rule 9', enabled: false, attached: false },
  { id: 'p2-rule-5', name: 'Rule 10', enabled: false, attached: false },
];

const TOTAL_RULES = PAGE_1_RULES.length + PAGE_2_RULES.length;
const ATTACHED_RULES = PAGE_1_RULES.filter((r) => r.attached).length;
const PER_PAGE = 5;

describe('AlertAnalysisWorkflowRuleAttachmentSection', () => {
  const coreStart = coreMock.createStart();

  const setupFetchMock = () => {
    coreStart.http.fetch.mockImplementation(async (...args: unknown[]) => {
      const [path, options] = args as [
        string,
        { method?: string; query?: Record<string, unknown>; body?: string }
      ];

      if (path === ALERT_ANALYSIS_WORKFLOW_RULE_STATS_ROUTE) {
        return { total: TOTAL_RULES, attached: ATTACHED_RULES };
      }

      if (path === ALERT_ANALYSIS_WORKFLOW_RULES_ROUTE) {
        const page = (options?.query?.page as number) ?? 1;
        const rules = page === 1 ? PAGE_1_RULES : PAGE_2_RULES;
        return { page, perPage: PER_PAGE, total: TOTAL_RULES, attached: ATTACHED_RULES, rules };
      }

      if (path === ALERT_ANALYSIS_WORKFLOW_RULE_SELECTION_ROUTE) {
        return {
          total: TOTAL_RULES,
          attached: ATTACHED_RULES,
          selectable: TOTAL_RULES - ATTACHED_RULES,
          attachedRuleIds: PAGE_1_RULES.map((rule) => rule.id),
          ruleIds: PAGE_2_RULES.map((rule) => rule.id),
        };
      }

      if (path === ALERT_ANALYSIS_WORKFLOW_RULE_UPDATE_ROUTE) {
        const body = options?.body ? JSON.parse(options.body) : {};
        const updated = (body.attachRuleIds?.length ?? 0) + (body.detachRuleIds?.length ?? 0);
        return { matched: updated, updated };
      }

      return {};
    });
  };

  const renderComponent = () => {
    coreStart.application.capabilities = {
      ...coreStart.application.capabilities,
      securitySolution: { show: true, crud: true },
      [RULES_FEATURE_ID]: { read_rules: true, edit_rules: true },
    };

    setupFetchMock();

    const services = { ...coreStart };

    return renderWithI18n(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <KibanaContextProvider services={services}>
          <AlertAnalysisWorkflowRuleAttachmentSection />
        </KibanaContextProvider>
      </QueryClientProvider>
    );
  };

  const getRowCheckbox = (ruleId: string) => screen.getByTestId(`checkboxSelectRow-${ruleId}`);

  // Open the "Bulk actions" dropdown and click the attach or remove action. The context-menu
  // items live inside an EuiPopover panel that keeps `pointer-events: none` until its open
  // animation finishes (which never happens in jsdom), so skip user-event's pointer check.
  const bulkActionUser = userEvent.setup({ pointerEventsCheck: 0 });
  const runBulkAction = async (action: 'attach' | 'remove') => {
    await bulkActionUser.click(
      screen.getByTestId('alertAnalysisWorkflowRuleAttachmentBulkActionsButton')
    );
    await bulkActionUser.click(
      screen.getByTestId(
        action === 'attach'
          ? 'alertAnalysisWorkflowRuleAttachmentAttachAction'
          : 'alertAnalysisWorkflowRuleAttachmentRemoveAction'
      )
    );
  };

  const getLastUpdateRequestBody = () => {
    const calls = coreStart.http.fetch.mock.calls as unknown as Array<[string, { body?: string }]>;
    const call = [...calls]
      .reverse()
      .find(([path]) => path === ALERT_ANALYSIS_WORKFLOW_RULE_UPDATE_ROUTE);

    if (!call) {
      throw new Error('Expected an update request to have been made');
    }

    const [, options] = call;
    return JSON.parse(options?.body ?? '{}');
  };

  beforeEach(() => {
    coreStart.http.fetch.mockClear();
  });

  it('navigating to page 2 does not create spurious selection', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Rule 1')).toBeInTheDocument();
    });

    // Nothing is selected on page 1, so the bulk actions dropdown is not shown.
    expect(screen.getByText('Selected 0 rules')).toBeInTheDocument();
    expect(
      screen.queryByTestId('alertAnalysisWorkflowRuleAttachmentBulkActionsButton')
    ).not.toBeInTheDocument();

    const nextPageButton = screen.getByTestId('pagination-button-next');
    await userEvent.click(nextPageButton);

    await waitFor(() => {
      expect(screen.getByText('Rule 6')).toBeInTheDocument();
    });

    // Navigating pages must not create spurious selection.
    expect(screen.getByText('Selected 0 rules')).toBeInTheDocument();
    expect(
      screen.queryByTestId('alertAnalysisWorkflowRuleAttachmentBulkActionsButton')
    ).not.toBeInTheDocument();
  });

  it('preserves a manually selected row when navigating away and back', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Rule 1')).toBeInTheDocument();
    });

    await userEvent.click(getRowCheckbox('p1-rule-1'));
    expect(screen.getByText('Selected 1 rule')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('pagination-button-next'));
    await waitFor(() => {
      expect(screen.getByText('Rule 6')).toBeInTheDocument();
    });

    // The page-1 selection survives navigating to page 2, even though page 2 shows nothing checked.
    expect(screen.getByText('Selected 1 rule')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('pagination-button-previous'));
    await waitFor(() => {
      expect(screen.getByText('Rule 1')).toBeInTheDocument();
    });

    expect(getRowCheckbox('p1-rule-1')).toBeChecked();
    expect(screen.getByText('Selected 1 rule')).toBeInTheDocument();
  });

  it('shows the workflow action state independently of row selection', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Rule 1')).toBeInTheDocument();
    });

    expect(screen.getByText('Workflow action')).toBeInTheDocument();
    // Page 1 rules are all attached...
    expect(screen.getAllByText('Attached')).toHaveLength(PAGE_1_RULES.length);
    // ...but none of the checkboxes are pre-checked, since selection is decoupled from state.
    PAGE_1_RULES.forEach((rule) => {
      expect(getRowCheckbox(rule.id)).not.toBeChecked();
    });

    await userEvent.click(screen.getByTestId('pagination-button-next'));

    await waitFor(() => {
      expect(screen.getByText('Rule 6')).toBeInTheDocument();
    });

    expect(screen.getAllByText('Not attached')).toHaveLength(PAGE_2_RULES.length);
  });

  it('attaches the workflow to the selected rules', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Rule 1')).toBeInTheDocument();
    });

    await userEvent.click(getRowCheckbox('p1-rule-1'));
    await userEvent.click(getRowCheckbox('p1-rule-2'));

    expect(screen.getByText('Selected 2 rules')).toBeInTheDocument();

    await runBulkAction('attach');
    await userEvent.click(
      within(screen.getByTestId('alertAnalysisWorkflowRuleAttachmentConfirmModal')).getByText(
        'Attach workflow to 2 rules'
      )
    );

    await waitFor(() => {
      expect(getLastUpdateRequestBody()).toEqual({
        attachRuleIds: ['p1-rule-1', 'p1-rule-2'],
        detachRuleIds: [],
        dryRun: false,
      });
    });
  });

  it('removes the workflow from the selected rules', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Rule 1')).toBeInTheDocument();
    });

    await userEvent.click(getRowCheckbox('p1-rule-3'));

    await runBulkAction('remove');
    await userEvent.click(
      within(screen.getByTestId('alertAnalysisWorkflowRuleAttachmentConfirmModal')).getByText(
        'Remove workflow from 1 rule'
      )
    );

    await waitFor(() => {
      expect(getLastUpdateRequestBody()).toEqual({
        attachRuleIds: [],
        detachRuleIds: ['p1-rule-3'],
        dryRun: false,
      });
    });
  });

  it('selects all matching rules across pages and attaches the workflow to them', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Rule 1')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId('alertAnalysisWorkflowRuleAttachmentSelectAllButton'));

    await waitFor(() => {
      expect(screen.getByText(`Selected ${TOTAL_RULES} rules`)).toBeInTheDocument();
    });

    await runBulkAction('attach');
    await userEvent.click(
      within(screen.getByTestId('alertAnalysisWorkflowRuleAttachmentConfirmModal')).getByText(
        `Attach workflow to ${TOTAL_RULES} rules`
      )
    );

    await waitFor(() => {
      const body = getLastUpdateRequestBody();
      expect(body.detachRuleIds).toEqual([]);
      expect(new Set(body.attachRuleIds)).toEqual(
        new Set([...PAGE_1_RULES.map((rule) => rule.id), ...PAGE_2_RULES.map((rule) => rule.id)])
      );
    });
  });

  it('does not tag a bulk selection with a search typed after it was dispatched', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Rule 1')).toBeInTheDocument();
    });

    const MALWARE_RULE = {
      id: 'malware-rule-1',
      name: 'Malware Rule',
      enabled: true,
      attached: false,
    };

    // Defer the selection fetch so this test can change the search query before it resolves.
    let resolveSelectionFetch: (value: unknown) => void = () => {};
    const selectionPromise = new Promise((resolve) => {
      resolveSelectionFetch = resolve;
    });

    coreStart.http.fetch.mockImplementation(async (...args: unknown[]) => {
      const [path, options] = args as [
        string,
        { method?: string; query?: Record<string, unknown>; body?: string }
      ];

      if (path === ALERT_ANALYSIS_WORKFLOW_RULE_SELECTION_ROUTE) {
        return selectionPromise;
      }

      if (path === ALERT_ANALYSIS_WORKFLOW_RULE_STATS_ROUTE) {
        return options?.query?.search === 'malware'
          ? { total: 1, attached: 0 }
          : { total: TOTAL_RULES, attached: ATTACHED_RULES };
      }

      if (path === ALERT_ANALYSIS_WORKFLOW_RULES_ROUTE) {
        const search = (options?.query?.search as string) ?? '';
        const page = (options?.query?.page as number) ?? 1;
        const rules =
          search === 'malware' ? [MALWARE_RULE] : page === 1 ? PAGE_1_RULES : PAGE_2_RULES;
        return {
          page,
          perPage: PER_PAGE,
          total: search === 'malware' ? 1 : TOTAL_RULES,
          attached: search === 'malware' ? 0 : ATTACHED_RULES,
          rules,
        };
      }

      return {};
    });

    // Click "Select all" while the search box is still empty; the selection fetch it triggers
    // won't resolve until resolveSelectionFetch is called below.
    await userEvent.click(screen.getByTestId('alertAnalysisWorkflowRuleAttachmentSelectAllButton'));

    // Change the search before the pending selection fetch above resolves.
    const searchField = screen.getByTestId('alertAnalysisWorkflowRuleAttachmentQuery');
    fireEvent.change(searchField, { target: { value: 'malware' } });
    fireEvent.keyDown(searchField, { key: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText('Malware Rule')).toBeInTheDocument();
    });

    // Resolve the fetch, which actually ran against the *original* (empty) search.
    resolveSelectionFetch({
      total: TOTAL_RULES,
      attached: ATTACHED_RULES,
      selectable: TOTAL_RULES - ATTACHED_RULES,
      attachedRuleIds: PAGE_1_RULES.map((rule) => rule.id),
      ruleIds: PAGE_2_RULES.map((rule) => rule.id),
    });

    // Wait for a signal that only appears once onSuccess has actually run (the selected-count
    // text updates to the resolved ids), before checking the button label below. Otherwise a
    // waitFor on the button label alone can pass on a stale, pre-resolution render.
    await waitFor(() => {
      expect(screen.getByText(`Selected ${TOTAL_RULES} rules`)).toBeInTheDocument();
    });

    // The resolved selection belongs to the old search, not "malware", so the single
    // currently-displayed "malware" match must not be reported as fully selected.
    expect(screen.getByText('Select all 1 rule')).toBeInTheDocument();
  });
});
