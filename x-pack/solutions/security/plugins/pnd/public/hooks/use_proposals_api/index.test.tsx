/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { API_VERSIONS, PND_PROPOSALS_URL, buildProposalRespondUrl } from '@kbn/pnd-common';
import type { ListProposalsResponse, PndProposalRow } from '@kbn/pnd-common';
import { PND_ATTACK_DISCOVERY_WORKFLOWS_ENABLED_HEADER } from '../../../common/constants';
import { queryKeys } from '../../query_keys';
import { createHttpFetchError } from '../../test_helpers/create_http_fetch_error';
import { createHttpResponse } from '../../test_helpers/create_http_response';
import {
  createPndProvidersWrapper,
  createPndTestQueryClient,
  createPndTestServices,
} from '../../test_helpers/render_with_providers';
import { useProposals, useRespondToProposal } from '.';

const proposal: PndProposalRow = {
  alwaysGate: false,
  correlationId: 'alert-1',
  createdAt: '2026-08-03T12:00:00.000Z',
  gateId: 'open_investigation',
  inputSchema: {},
  message: 'Open an investigation into the credential-dumping attack on host-1?',
  reasoning: 'Three alerts on host-1 chain to a credential access technique.',
  recommendedAction: 'investigate',
  reversible: true,
  sourceId: 'system-security-watch-deep:run-1:step-exec-1',
  stepExecutionId: 'step-exec-1',
  stepId: 'await_open_investigation',
  title: 'Open an investigation into the credential-dumping attack on host-1?',
  workflowId: 'system-security-watch-deep',
  workflowRunId: 'run-1',
};

const listResponse: ListProposalsResponse = {
  groups: [{ proposals: [proposal], recommendedAction: 'investigate' }],
  total: 1,
};

describe('useProposals', () => {
  it('reads the grouped queue from GET /internal/pnd/proposals with asResponse, the only way to see the signal header', async () => {
    const services = createPndTestServices();
    services.http.get.mockResolvedValue(createHttpResponse({ body: listResponse }));

    const { result } = renderHook(() => useProposals(), {
      wrapper: createPndProvidersWrapper({ services }),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(services.http.get).toHaveBeenCalledWith(PND_PROPOSALS_URL, {
      asResponse: true,
      version: API_VERSIONS.internal.v1,
    });
  });

  it('returns the grouped proposals', async () => {
    const services = createPndTestServices();
    services.http.get.mockResolvedValue(createHttpResponse({ body: listResponse }));

    const { result } = renderHook(() => useProposals(), {
      wrapper: createPndProvidersWrapper({ services }),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.proposals).toEqual(listResponse);
  });

  it('reads `false` off the attack-discovery-workflows header, so an empty queue can be told from a disabled feature', async () => {
    const services = createPndTestServices();
    services.http.get.mockResolvedValue(
      createHttpResponse({
        body: { groups: [], total: 0 },
        headers: { [PND_ATTACK_DISCOVERY_WORKFLOWS_ENABLED_HEADER]: 'false' },
      })
    );

    const { result } = renderHook(() => useProposals(), {
      wrapper: createPndProvidersWrapper({ services }),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.isAttackDiscoveryWorkflowsEnabled).toBe(false);
  });

  it('reads `true` off the attack-discovery-workflows header', async () => {
    const services = createPndTestServices();
    services.http.get.mockResolvedValue(
      createHttpResponse({
        body: listResponse,
        headers: { [PND_ATTACK_DISCOVERY_WORKFLOWS_ENABLED_HEADER]: 'true' },
      })
    );

    const { result } = renderHook(() => useProposals(), {
      wrapper: createPndProvidersWrapper({ services }),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.isAttackDiscoveryWorkflowsEnabled).toBe(true);
  });

  it('leaves the flag undefined when the header is absent, rather than guessing that the feature is off', async () => {
    const services = createPndTestServices();
    services.http.get.mockResolvedValue(createHttpResponse({ body: listResponse }));

    const { result } = renderHook(() => useProposals(), {
      wrapper: createPndProvidersWrapper({ services }),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.isAttackDiscoveryWorkflowsEnabled).toBeUndefined();
  });

  it('leaves the flag undefined for a header value that is neither `true` nor `false`', async () => {
    const services = createPndTestServices();
    services.http.get.mockResolvedValue(
      createHttpResponse({
        body: listResponse,
        headers: { [PND_ATTACK_DISCOVERY_WORKFLOWS_ENABLED_HEADER]: 'maybe' },
      })
    );

    const { result } = renderHook(() => useProposals(), {
      wrapper: createPndProvidersWrapper({ services }),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.isAttackDiscoveryWorkflowsEnabled).toBeUndefined();
  });

  it('falls back to an empty queue when the response carries no body', async () => {
    const services = createPndTestServices();
    services.http.get.mockResolvedValue(createHttpResponse<ListProposalsResponse>({}));

    const { result } = renderHook(() => useProposals(), {
      wrapper: createPndProvidersWrapper({ services }),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.proposals).toEqual({ groups: [], total: 0 });
  });

  it('surfaces a 503 as an error, never as an empty queue', async () => {
    const services = createPndTestServices();
    services.http.get.mockRejectedValue(createHttpFetchError({ status: 503 }));

    const { result } = renderHook(() => useProposals(), {
      wrapper: createPndProvidersWrapper({ services }),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useRespondToProposal', () => {
  it('posts to the builder-built respond url, because a sourceId contains colons', async () => {
    const services = createPndTestServices();
    services.http.post.mockResolvedValue({ resumed: true, sourceId: proposal.sourceId });

    const { result } = renderHook(() => useRespondToProposal(), {
      wrapper: createPndProvidersWrapper({ services }),
    });
    await act(async () => {
      await result.current.mutateAsync({
        input: { decision: 'approve', rationale: 'Confirmed on host-1.' },
        sourceId: proposal.sourceId,
      });
    });

    expect(services.http.post).toHaveBeenCalledWith(
      buildProposalRespondUrl(proposal.sourceId),
      expect.objectContaining({ version: API_VERSIONS.internal.v1 })
    );
  });

  it('sends an explicit lowercase decision, which the route requires', async () => {
    const services = createPndTestServices();
    services.http.post.mockResolvedValue({ resumed: true, sourceId: proposal.sourceId });

    const { result } = renderHook(() => useRespondToProposal(), {
      wrapper: createPndProvidersWrapper({ services }),
    });
    await act(async () => {
      await result.current.mutateAsync({
        input: { decision: 'dismiss', rationale: 'Known maintenance window.' },
        sourceId: proposal.sourceId,
      });
    });

    expect(services.http.post).toHaveBeenCalledWith(
      buildProposalRespondUrl(proposal.sourceId),
      expect.objectContaining({
        body: JSON.stringify({
          input: { decision: 'dismiss', rationale: 'Known maintenance window.' },
        }),
      })
    );
  });

  /**
   * The whole of annotation 8a. A gate's `inputSchema` declares what answering it means, so the
   * fields beyond the decision and the rationale are the gate's own — and the route's
   * `.catchall(z.unknown())` hands them to the orchestrator untouched. A mutation that rebuilt the
   * body from two known keys would drop them silently, which is worse than refusing them.
   */
  it("forwards a gate's own schema-driven fields, which the orchestrator reads", async () => {
    const services = createPndTestServices();
    services.http.post.mockResolvedValue({ resumed: true, sourceId: proposal.sourceId });

    const { result } = renderHook(() => useRespondToProposal(), {
      wrapper: createPndProvidersWrapper({ services }),
    });
    await act(async () => {
      await result.current.mutateAsync({
        input: {
          decision: 'approve',
          isolateHost: true,
          rationale: 'Confirmed on host-1.',
          ruleId: 'rule-1',
        },
        sourceId: proposal.sourceId,
      });
    });

    expect(services.http.post).toHaveBeenCalledWith(
      buildProposalRespondUrl(proposal.sourceId),
      expect.objectContaining({
        body: JSON.stringify({
          input: {
            decision: 'approve',
            isolateHost: true,
            rationale: 'Confirmed on host-1.',
            ruleId: 'rule-1',
          },
        }),
      })
    );
  });

  it('trims the rationale, so trailing whitespace can never reach the non-empty check', async () => {
    const services = createPndTestServices();
    services.http.post.mockResolvedValue({ resumed: true, sourceId: proposal.sourceId });

    const { result } = renderHook(() => useRespondToProposal(), {
      wrapper: createPndProvidersWrapper({ services }),
    });
    await act(async () => {
      await result.current.mutateAsync({
        input: { decision: 'approve', rationale: '  Confirmed on host-1.  ' },
        sourceId: proposal.sourceId,
      });
    });

    expect(services.http.post).toHaveBeenCalledWith(
      buildProposalRespondUrl(proposal.sourceId),
      expect.objectContaining({
        body: JSON.stringify({ input: { decision: 'approve', rationale: 'Confirmed on host-1.' } }),
      })
    );
  });

  it('rejects a blank rationale before it reaches the server, because there is no rationale-free path through a gate', async () => {
    const services = createPndTestServices();

    const { result } = renderHook(() => useRespondToProposal(), {
      wrapper: createPndProvidersWrapper({ services }),
    });

    await expect(
      result.current.mutateAsync({
        input: { decision: 'dismiss', rationale: '   ' },
        sourceId: proposal.sourceId,
      })
    ).rejects.toThrow();
  });

  it('never posts a blank rationale', async () => {
    const services = createPndTestServices();

    const { result } = renderHook(() => useRespondToProposal(), {
      wrapper: createPndProvidersWrapper({ services }),
    });
    await act(async () => {
      await result.current
        .mutateAsync({
          input: { decision: 'dismiss', rationale: '' },
          sourceId: proposal.sourceId,
        })
        .catch(() => undefined);
    });

    expect(services.http.post).not.toHaveBeenCalled();
  });

  /**
   * Reachable now that the body is the gate's own: a schema that declared no rationale field would
   * otherwise post an answer nobody can be held to. Refused here rather than as a 400, which is what
   * keeps the analyst's typed text on screen.
   */
  it('refuses an answer that carries no rationale at all', async () => {
    const services = createPndTestServices();

    const { result } = renderHook(() => useRespondToProposal(), {
      wrapper: createPndProvidersWrapper({ services }),
    });

    await expect(
      result.current.mutateAsync({
        input: { decision: 'approve' },
        sourceId: proposal.sourceId,
      })
    ).rejects.toThrow();
  });

  it('refuses a rationale that is not text, which cannot be read back into the conversation', async () => {
    const services = createPndTestServices();

    const { result } = renderHook(() => useRespondToProposal(), {
      wrapper: createPndProvidersWrapper({ services }),
    });

    await expect(
      result.current.mutateAsync({
        input: { decision: 'approve', rationale: 42 },
        sourceId: proposal.sourceId,
      })
    ).rejects.toThrow();
  });

  it('invalidates the proposals queue, because the answered gate is no longer pending', async () => {
    const services = createPndTestServices();
    services.http.post.mockResolvedValue({ resumed: true, sourceId: proposal.sourceId });
    const queryClient = createPndTestQueryClient();
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useRespondToProposal(), {
      wrapper: createPndProvidersWrapper({ queryClient, services }),
    });
    await act(async () => {
      await result.current.mutateAsync({
        input: { decision: 'approve', rationale: 'Confirmed.' },
        sourceId: proposal.sourceId,
      });
    });

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.proposals.all });
  });

  it('invalidates the runs list too, because the response carries no new run id', async () => {
    const services = createPndTestServices();
    services.http.post.mockResolvedValue({ resumed: true, sourceId: proposal.sourceId });
    const queryClient = createPndTestQueryClient();
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useRespondToProposal(), {
      wrapper: createPndProvidersWrapper({ queryClient, services }),
    });
    await act(async () => {
      await result.current.mutateAsync({
        input: { decision: 'approve', rationale: 'Confirmed.' },
        sourceId: proposal.sourceId,
      });
    });

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.runs.all });
  });

  it('invalidates the queue on a 409, because the gate has already moved on', async () => {
    const services = createPndTestServices();
    services.http.post.mockRejectedValue(createHttpFetchError({ status: 409 }));
    const queryClient = createPndTestQueryClient();
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useRespondToProposal(), {
      wrapper: createPndProvidersWrapper({ queryClient, services }),
    });
    await act(async () => {
      await result.current
        .mutateAsync({
          input: { decision: 'approve', rationale: 'Confirmed.' },
          sourceId: proposal.sourceId,
        })
        .catch(() => undefined);
    });

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.proposals.all });
  });

  it('invalidates the queue on a 404, without reading a body a 404 does not have', async () => {
    const services = createPndTestServices();
    services.http.post.mockRejectedValue(createHttpFetchError({ status: 404 }));
    const queryClient = createPndTestQueryClient();
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useRespondToProposal(), {
      wrapper: createPndProvidersWrapper({ queryClient, services }),
    });
    await act(async () => {
      await result.current
        .mutateAsync({
          input: { decision: 'approve', rationale: 'Confirmed.' },
          sourceId: proposal.sourceId,
        })
        .catch(() => undefined);
    });

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.proposals.all });
  });

  it('leaves the queue alone on a 403, which says nothing about whether the gate is still pending', async () => {
    const services = createPndTestServices();
    services.http.post.mockRejectedValue(createHttpFetchError({ status: 403 }));
    const queryClient = createPndTestQueryClient();
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useRespondToProposal(), {
      wrapper: createPndProvidersWrapper({ queryClient, services }),
    });
    await act(async () => {
      await result.current
        .mutateAsync({
          input: { decision: 'approve', rationale: 'Confirmed.' },
          sourceId: proposal.sourceId,
        })
        .catch(() => undefined);
    });

    expect(invalidateQueries).not.toHaveBeenCalled();
  });
});
