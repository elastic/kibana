/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { PND_GATE_IDS, RECOMMENDED_ACTIONS } from '@kbn/pnd-common';
import type { ListProposalsResponse, PndProposalRow } from '@kbn/pnd-common';

import { createHttpFetchError } from '../../../../test_helpers/create_http_fetch_error';
import { createHttpResponse } from '../../../../test_helpers/create_http_response';
import { renderWithPndProviders } from '../../../test_utils/render_with_pnd_providers';
import {
  TUNING_BACKTEST_AFTER_LABEL,
  TUNING_BACKTEST_BEFORE_LABEL,
  TUNING_CHANGE_LABEL,
  TUNING_CURRENT_QUERY_LABEL,
  TUNING_RULE_ID_LABEL,
  TUNING_RULE_NAME_LABEL,
} from '../../../../pages/conversations/helpers/parse_tuning_proposal';
import { LifecycleTuningSection } from '.';

/**
 * `useProposals` passes its own `retry`, which overrides the test client's `retry: false`. Without
 * this a 503 would reach its state only after three exponential-backoff attempts. The predicate is
 * unit-tested in `hooks/retry_on_transient_error`; this suite is about which state the section shows.
 */
jest.mock('../../../../hooks/retry_on_transient_error', () => ({
  MAX_RETRY_ATTEMPTS: 3,
  retryOnTransientError: () => false,
}));

const ATTACK_DISCOVERY_ALERT_ID = 'ad-1';

const proposal = (overrides: Partial<PndProposalRow> = {}): PndProposalRow => ({
  alwaysGate: true,
  correlationId: ATTACK_DISCOVERY_ALERT_ID,
  createdAt: '2026-08-03T10:00:00.000Z',
  gateId: PND_GATE_IDS.applyTuning,
  inputSchema: {},
  message: 'Apply this detection-rule tuning?',
  reasoning: [
    'The backup service account triggers this rule nightly.',
    `${TUNING_RULE_NAME_LABEL} "Suspicious activity"`,
    `${TUNING_RULE_ID_LABEL} "rule-1"`,
    `${TUNING_CHANGE_LABEL} {"enabled":false}`,
  ].join('\n'),
  recommendedAction: RECOMMENDED_ACTIONS[3],
  reversible: false,
  sourceId: 'source-1',
  stepExecutionId: 'gate-step',
  stepId: 'await_apply_tuning',
  title: 'Apply tuning',
  workflowId: 'system-security-watch-post-incident',
  workflowRunId: 'run-1',
  ...overrides,
});

const CURRENT_QUERY = 'process.name : "powershell.exe"';
const PROPOSED_QUERY = 'process.name : "powershell.exe" and not user.name : "svc-backup"';

/**
 * The reasoning a v8 watch renders for a real query change: the rewrite behind the change anchor, the
 * rule's own query beside it, and one measured count per backtest side.
 */
const QUERY_REASONING = [
  'The backup service account triggers this rule nightly.',
  `${TUNING_RULE_NAME_LABEL} "Suspicious activity"`,
  `${TUNING_RULE_ID_LABEL} "rule-1"`,
  `${TUNING_BACKTEST_BEFORE_LABEL} 95.`,
  `${TUNING_BACKTEST_AFTER_LABEL} 3.`,
  `${TUNING_CHANGE_LABEL} ${JSON.stringify({ query: PROPOSED_QUERY })}`,
  `${TUNING_CURRENT_QUERY_LABEL} ${JSON.stringify(CURRENT_QUERY)}`,
].join('\n');

const queueOf = (proposals: PndProposalRow[]): ListProposalsResponse => ({
  groups: proposals.map((row) => ({ proposals: [row], recommendedAction: RECOMMENDED_ACTIONS[3] })),
  total: proposals.length,
});

const renderSection = ({
  correlationId = ATTACK_DISCOVERY_ALERT_ID,
  proposals = [proposal()],
}: { correlationId?: string; proposals?: PndProposalRow[] } = {}) => {
  const get = jest.fn(async () => createHttpResponse({ body: queueOf(proposals) }));

  return {
    get,
    ...renderWithPndProviders(<LifecycleTuningSection correlationId={correlationId} />, {
      services: { http: { get } },
    }),
  };
};

describe('LifecycleTuningSection', () => {
  it('renders a spinner while the queue is in flight', () => {
    renderSection();

    expect(screen.getByTestId('pndLoadingState')).toBeInTheDocument();
  });

  it('renders the tuning panel once the queue arrives', async () => {
    renderSection();

    await waitFor(() =>
      expect(screen.getByTestId('pndLifecycleSection-tuning')).toBeInTheDocument()
    );
  });

  it('names itself, because it is no longer the only thing on its panel', async () => {
    renderSection();

    expect(await screen.findByRole('heading', { name: 'Review tuning' })).toBeInTheDocument();
  });

  it('renders the review once a tuning gate is pending for this discovery', async () => {
    renderSection();

    await waitFor(() => expect(screen.getByTestId('pndLifecycleTuningReview')).toBeInTheDocument());
  });

  it('names the rule the tuning would write to', async () => {
    renderSection();

    await waitFor(() =>
      expect(screen.getByTestId('pndProposedRuleChangeRuleName')).toHaveTextContent(
        'Suspicious activity'
      )
    );
  });

  it('renders the rule id the approval will be applied against', async () => {
    renderSection();

    await waitFor(() =>
      expect(screen.getByTestId('pndProposedRuleChangeRuleId')).toHaveTextContent('rule-1')
    );
  });

  it('describes the proposed change in human terms rather than as JSON', async () => {
    renderSection();

    await waitFor(() =>
      expect(screen.getByTestId('pndProposedRuleChangeItem-enabled')).toBeInTheDocument()
    );
  });

  it('renders the reasoning the model wrote for the tuning', async () => {
    renderSection();

    await waitFor(() =>
      expect(screen.getByTestId('pndLifecycleTuningReasoning')).toHaveTextContent(
        'The backup service account triggers this rule nightly.'
      )
    );
  });

  it('says the backtest is unavailable rather than leaving a blank', async () => {
    renderSection();

    await waitFor(() =>
      expect(screen.getByTestId('pndBacktestComparisonUnavailable')).toBeInTheDocument()
    );
  });

  it('reports which carrier the evidence was recovered from', async () => {
    renderSection();

    await waitFor(() =>
      expect(screen.getByTestId('pndLifecycleTuningReview')).toHaveAttribute(
        'data-recovery',
        'anchored'
      )
    );
  });

  // A query rewrite is the one tunable field that cannot be judged from a summary of itself, so the
  // tab renders it against the query it replaces. Both sides resolve through `resolveTuningEvidence`,
  // the same merge point `TuningApprovalDialog` uses, so the row and the dialog that authorizes the
  // write cannot describe one proposal two ways.
  describe('a tuning that rewrites the rule query', () => {
    const renderQueryTab = () =>
      renderSection({ proposals: [proposal({ reasoning: QUERY_REASONING })] });

    it('renders the rule query as it stands, which the rewrite has to be read against', async () => {
      renderQueryTab();

      await waitFor(() =>
        expect(screen.getByTestId('pndQueryComparisonCurrent')).toHaveTextContent(CURRENT_QUERY)
      );
    });

    it('renders the query the tuning proposes', async () => {
      renderQueryTab();

      await waitFor(() =>
        expect(screen.getByTestId('pndQueryComparisonProposed')).toHaveTextContent(PROPOSED_QUERY)
      );
    });

    it('renders the alert count the rule produces as it stands', async () => {
      renderQueryTab();

      await waitFor(() =>
        expect(screen.getByTestId('pndBacktestComparisonBeforeCount')).toHaveTextContent('95')
      );
    });

    it('renders the alert count the rewrite would produce', async () => {
      renderQueryTab();

      await waitFor(() =>
        expect(screen.getByTestId('pndBacktestComparisonAfterCount')).toHaveTextContent('3')
      );
    });

    it('does not warn that the backtest is unavailable once both sides were measured', async () => {
      renderQueryTab();

      await waitFor(() => expect(screen.getByTestId('pndQueryComparison')).toBeInTheDocument());

      expect(screen.queryByTestId('pndBacktestComparisonUnavailable')).not.toBeInTheDocument();
    });
  });

  it('renders no query diff for a tuning that rewrites no query', async () => {
    renderSection();

    await waitFor(() => expect(screen.getByTestId('pndLifecycleTuningReview')).toBeInTheDocument());

    expect(screen.queryByTestId('pndQueryComparison')).not.toBeInTheDocument();
  });

  it('renders the empty state when no tuning gate is pending', async () => {
    renderSection({ proposals: [] });

    await waitFor(() => expect(screen.getByTestId('pndEmptyState')).toBeInTheDocument());
  });

  it('renders the empty state for a tuning gate that belongs to another discovery', async () => {
    renderSection({ proposals: [proposal({ correlationId: 'ad-2' })] });

    await waitFor(() => expect(screen.getByTestId('pndEmptyState')).toBeInTheDocument());
  });

  it('renders the empty state for a pending gate that is not a tuning', async () => {
    renderSection({ proposals: [proposal({ gateId: PND_GATE_IDS.promoteIncident })] });

    await waitFor(() => expect(screen.getByTestId('pndEmptyState')).toBeInTheDocument());
  });

  it('does not read the queue before a discovery is known', () => {
    const { get } = renderSection({ correlationId: '' });

    expect(get).not.toHaveBeenCalled();
  });

  it('renders an error state when the queue cannot be read', async () => {
    const get = jest.fn(async () => {
      throw createHttpFetchError({ status: 403 });
    });

    renderWithPndProviders(<LifecycleTuningSection correlationId={ATTACK_DISCOVERY_ALERT_ID} />, {
      services: { http: { get } },
    });

    await waitFor(() => expect(screen.getByTestId('pndErrorState')).toBeInTheDocument());
  });

  it('says workflows are unavailable rather than showing nothing to review on a 503', async () => {
    const get = jest.fn(async () => {
      throw createHttpFetchError({ status: 503 });
    });

    renderWithPndProviders(<LifecycleTuningSection correlationId={ATTACK_DISCOVERY_ALERT_ID} />, {
      services: { http: { get } },
    });

    await waitFor(() =>
      expect(screen.getByTestId('pndWorkflowsUnavailableState')).toBeInTheDocument()
    );
  });
});
