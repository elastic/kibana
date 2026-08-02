/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PropsWithChildren } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import {
  PND_GATE_IDS,
  SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
  type ListProposalsResponse,
  type PndProposalRow,
} from '@kbn/pnd-common';

import { useProposals } from '../../../../hooks/use_proposals_api';
import { useTuningProposal } from '.';

jest.mock('../../../../hooks/retry_on_transient_error', () => ({
  MAX_RETRY_ATTEMPTS: 3,
  retryOnTransientError: () => false,
}));

const ATTACK_DISCOVERY_ALERT_ID = 'ad-alert-tuning';
const RULE_ID = '8f0a1b2c-3d4e-5f60-7182-93a4b5c6d7e8';

const tuningProposal: PndProposalRow = {
  alwaysGate: true,
  correlationId: ATTACK_DISCOVERY_ALERT_ID,
  createdAt: '2026-08-03T12:00:00.000Z',
  gateId: PND_GATE_IDS.applyTuning,
  inputSchema: {},
  message: 'Apply a tuning to detection rule "Endpoint Security [Insights]"?',
  reasoning: `Rule: "Endpoint Security [Insights]" (id ${RULE_ID}).`,
  recommendedAction: 'tune',
  reversible: false,
  sourceId: `${SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID}:run-tune:step-tune`,
  stepExecutionId: 'step-tune',
  stepId: 'await_apply_tuning',
  title: 'Apply a tuning',
  workflowId: SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
  workflowRunId: 'run-tune',
};

const proposalsBody: ListProposalsResponse = {
  groups: [{ proposals: [tuningProposal], recommendedAction: 'tune' }],
  total: 1,
};

/**
 * One `QueryClient` shared by both hooks, because that is the condition under test: they use the
 * same `queryKeys.proposals.list()` key on purpose, so one request serves both surfaces.
 */
const createProviders = (get: jest.Mock) => {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });

  const Providers: React.FC<PropsWithChildren> = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <KibanaContextProvider services={{ http: { get } }}>{children}</KibanaContextProvider>
    </QueryClientProvider>
  );

  return Providers;
};

/** `asResponse: true` yields `{ body, response }`; the bare read yields the body. */
const createHttpGet = () =>
  jest.fn(async (_url: string, options?: { asResponse?: boolean }) =>
    options?.asResponse === true
      ? { body: proposalsBody, response: new Response(null, { status: 200 }) }
      : proposalsBody
  );

describe('useTuningProposal', () => {
  it('reads the tuning evidence for the discovery', async () => {
    const get = createHttpGet();
    const Providers = createProviders(get);

    const { result } = renderHook(() => useTuningProposal(ATTACK_DISCOVERY_ALERT_ID), {
      wrapper: Providers,
    });

    await waitFor(() => expect(result.current?.reasoning).toContain(RULE_ID));
  });

  /**
   * `PndProposalRow` carries no `ruleId`: `readTuningEvidence` reads one because a later contract
   * revision is expected to add it, and the approval dialog parses the id out of the reasoning prose
   * until then. Pinning the absence keeps that gap visible rather than looking like a parse bug.
   */
  it('reports no structured ruleId, because the contract carries none', async () => {
    const get = createHttpGet();
    const Providers = createProviders(get);

    const { result } = renderHook(() => useTuningProposal(ATTACK_DISCOVERY_ALERT_ID), {
      wrapper: Providers,
    });

    await waitFor(() => expect(result.current).toBeDefined());

    expect(result.current?.ruleId).toBeUndefined();
  });

  it('returns nothing when no discovery is selected', async () => {
    const get = createHttpGet();
    const Providers = createProviders(get);

    const { result } = renderHook(() => useTuningProposal(undefined), { wrapper: Providers });

    await waitFor(() => expect(result.current).toBeUndefined());
  });

  /**
   * The invariant that matters, and the one this suite exists for.
   *
   * Both hooks deliberately share `queryKeys.proposals.list()` so the HITL queue and the lifecycle
   * view hit one cache entry. React Query caches by key, not by hook, so whichever observer mounts
   * first is the one whose `queryFn` runs — and every other observer reads ITS result. Two hooks
   * that shared the key while producing different shapes therefore handed the Brief page a body it
   * could not read (`Cannot read properties of undefined (reading 'groups')`, unmounting the whole
   * queue behind the flyout) and left the tuning evidence silently empty in the other direction.
   *
   * The tuning hook mounts FIRST here on purpose: that is the ordering the defect needed, because
   * opening the lifecycle overlay from a queue row adds its observer after the queue's.
   */
  it('serves both proposals consumers from one request shape', async () => {
    const get = createHttpGet();
    const Providers = createProviders(get);

    const tuning = renderHook(() => useTuningProposal(ATTACK_DISCOVERY_ALERT_ID), {
      wrapper: Providers,
    });
    await waitFor(() => expect(tuning.result.current?.reasoning).toContain(RULE_ID));

    const queue = renderHook(() => useProposals(), { wrapper: Providers });
    await waitFor(() => expect(queue.result.current.data?.proposals.groups).toHaveLength(1));

    expect(get.mock.calls.map(([, options]) => options?.asResponse)).toEqual(
      get.mock.calls.map(() => true)
    );
  });
});
