/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';

import { PND_EXECUTION_CORRELATED_HEADER } from '../../../../../common/constants';
import { createHttpFetchError } from '../../../../test_helpers/create_http_fetch_error';
import { createHttpResponse } from '../../../../test_helpers/create_http_response';
import { renderWithPndProviders } from '../../../test_utils/render_with_pnd_providers';
import { LifecycleActionsSection } from '.';

/**
 * `usePndExecution` passes its own `retry`, which overrides the test client's `retry: false`.
 * Without this a 503 would reach its state only after three exponential-backoff attempts. The
 * predicate is unit-tested in `hooks/retry_on_transient_error`; this suite is about which state the
 * section shows.
 */
jest.mock('../../../../hooks/retry_on_transient_error', () => ({
  MAX_RETRY_ATTEMPTS: 3,
  retryOnTransientError: () => false,
}));

const ATTACK_DISCOVERY_ALERT_ID = 'ad-1';

/** One ledger entry per status, as `collect_executed_actions` writes them: loose and snake_cased. */
const ledger: Array<Record<string, unknown>> = [
  { action_type: 'isolate_host', status: 'succeeded', title: 'Isolate host web-01' },
  { action_type: 'disable_user', status: 'submitted', title: 'Disable user svc-backup' },
  {
    action_type: 'block_ip',
    error: { message: 'connector timed out' },
    status: 'failed',
    title: 'Block IP 10.0.0.7',
  },
  {
    action_type: 'kill_process',
    reason: 'The process had already exited.',
    status: 'skipped',
    title: 'Kill process 4242',
  },
  {
    action_type: 'isolate_host',
    reason: 'Not approved at the containment gate.',
    status: 'not_executed',
    title: 'Isolate host db-02',
  },
];

const renderSection = ({
  containmentActions,
  correlationId = ATTACK_DISCOVERY_ALERT_ID,
}: {
  containmentActions?: Array<Record<string, unknown>>;
  correlationId?: string;
} = {}) => {
  const get = jest.fn(async () =>
    createHttpResponse({
      body: {
        ...(containmentActions != null ? { containmentActions } : {}),
        correlationId: ATTACK_DISCOVERY_ALERT_ID,
        steps: [],
      },
      headers: { [PND_EXECUTION_CORRELATED_HEADER]: 'true' },
    })
  );

  return {
    get,
    ...renderWithPndProviders(<LifecycleActionsSection correlationId={correlationId} />, {
      services: { http: { get } },
    }),
  };
};

describe('LifecycleActionsSection', () => {
  it('renders a spinner while the projection is in flight', () => {
    renderSection({ containmentActions: ledger });

    expect(screen.getByTestId('pndLoadingState')).toBeInTheDocument();
  });

  it('is addressable like its sibling sections', async () => {
    renderSection({ containmentActions: ledger });

    await waitFor(() =>
      expect(screen.getByTestId('pndLifecycleSection-actions')).toBeInTheDocument()
    );
  });

  it('names itself, because it is not the only thing on its panel', async () => {
    renderSection({ containmentActions: ledger });

    expect(await screen.findByRole('heading', { name: 'Containment actions' })).toBeInTheDocument();
  });

  it('renders one row per ledger entry', async () => {
    renderSection({ containmentActions: ledger });

    await waitFor(() =>
      expect(screen.getAllByTestId('pndLifecycleContainmentAction')).toHaveLength(ledger.length)
    );
  });

  it('carries each entry status on its row, so every outcome is individually assertable', async () => {
    renderSection({ containmentActions: ledger });
    await waitFor(() =>
      expect(screen.getAllByTestId('pndLifecycleContainmentAction')).toHaveLength(ledger.length)
    );

    expect(
      screen
        .getAllByTestId('pndLifecycleContainmentAction')
        .map((row) => row.getAttribute('data-status'))
    ).toEqual(ledger.map(({ status }) => status));
  });

  it('gives every row a status badge, so none of the outcomes reads blank', async () => {
    renderSection({ containmentActions: ledger });

    await waitFor(() =>
      expect(screen.getAllByTestId('pndContainmentActionStatusBadge')).toHaveLength(ledger.length)
    );
  });

  it('labels the statuses with their badge copy', async () => {
    renderSection({ containmentActions: ledger });
    await waitFor(() =>
      expect(screen.getAllByTestId('pndContainmentActionStatusBadge')).toHaveLength(ledger.length)
    );

    expect(
      screen.getAllByTestId('pndContainmentActionStatusBadge').map((badge) => badge.textContent)
    ).toEqual(['Succeeded', 'Submitted', 'Failed', 'Skipped', 'Not executed']);
  });

  it('names each action', async () => {
    renderSection({ containmentActions: ledger });

    await waitFor(() => expect(screen.getByText('Isolate host web-01')).toBeInTheDocument());
  });

  it('badges each action with its kind', async () => {
    renderSection({ containmentActions: ledger });
    await waitFor(() =>
      expect(screen.getAllByTestId('pndLifecycleContainmentActionType')).toHaveLength(ledger.length)
    );

    expect(screen.getAllByTestId('pndLifecycleContainmentActionType')[0]).toHaveTextContent(
      'isolate_host'
    );
  });

  it('renders the reason as the secondary line of a row that did not run', async () => {
    renderSection({ containmentActions: ledger });

    await waitFor(() =>
      expect(screen.getAllByTestId('pndLifecycleContainmentActionReason')).toHaveLength(2)
    );
    expect(screen.getByText('Not approved at the containment gate.')).toBeInTheDocument();
  });

  it('renders a compact error message on a failed row', async () => {
    renderSection({ containmentActions: ledger });

    await waitFor(() =>
      expect(screen.getByTestId('pndLifecycleContainmentActionError')).toHaveTextContent(
        'connector timed out'
      )
    );
  });

  it('renders the empty state while the route sends no ledger, because the gate has not been answered', async () => {
    renderSection();

    await waitFor(() => expect(screen.getByTestId('pndEmptyState')).toBeInTheDocument());
    expect(screen.getByText('No containment actions have been executed yet')).toBeInTheDocument();
  });

  it('renders the empty state for an empty ledger', async () => {
    renderSection({ containmentActions: [] });

    await waitFor(() => expect(screen.getByTestId('pndEmptyState')).toBeInTheDocument());
  });

  it('does not read the projection before a discovery is known', () => {
    const { get } = renderSection({ correlationId: '' });

    expect(get).not.toHaveBeenCalled();
  });

  it('renders an error state when the projection cannot be read', async () => {
    const get = jest.fn(async () => {
      throw createHttpFetchError({ status: 403 });
    });

    renderWithPndProviders(<LifecycleActionsSection correlationId={ATTACK_DISCOVERY_ALERT_ID} />, {
      services: { http: { get } },
    });

    await waitFor(() => expect(screen.getByTestId('pndErrorState')).toBeInTheDocument());
  });

  it('says workflows are unavailable rather than showing no actions on a 503', async () => {
    const get = jest.fn(async () => {
      throw createHttpFetchError({ status: 503 });
    });

    renderWithPndProviders(<LifecycleActionsSection correlationId={ATTACK_DISCOVERY_ALERT_ID} />, {
      services: { http: { get } },
    });

    await waitFor(() =>
      expect(screen.getByTestId('pndWorkflowsUnavailableState')).toBeInTheDocument()
    );
  });
});
