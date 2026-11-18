/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, KibanaRequest } from '@kbn/core/server';

/**
 * `KibanaActionStepImpl` (the built-in `kibana.request` step) reads its
 * authorization header off `fakeRequest.headers.authorization` and throws when
 * it is absent — see `getAuthHeaders()` in the engine's kibana_action_step.
 * `WorkflowRunFixture.fakeKibanaRequest` is `{} as KibanaRequest`, so any
 * `kibana.request` step (the review's journal notes, and its read-back of the
 * proposal decision) fails outright unless the fixture's request carries one.
 */
export const withFakeAuthorizationHeader = (request: KibanaRequest): KibanaRequest =>
  ({
    ...request,
    headers: {
      ...(request as { headers?: Record<string, unknown> }).headers,
      authorization: 'Bearer fake-token',
    },
  } as KibanaRequest);

interface SelfClientFetchOptions {
  method?: string;
  query?: Record<string, unknown>;
}

/**
 * Stubs Core's scoped self client (`coreStart.http.selfClient.asScoped().fetch`),
 * which `callKibanaApi` uses as the `kibana.request` transport. Real HTTP is not
 * available in this harness.
 *
 * Routes the paths the AlertZero worker chain's `kibana.*` steps hit (plus
 * `POST .../detection_engine/signals/status`, `kibana.SetAlertsStatus`'s
 * alert retirement, answered as a 200 no-op):
 *  - `GET /api/attack_discovery/_find?ids=…` — the review's `resolve_display_text`.
 *    An unseeded id yields an empty `data` list, which the review treats as "fall
 *    back to the persisted inputs".
 *  - `POST /s/:space/api/chat/converse` — the journal-note helper. A no-op 200:
 *    every call site sets `on-failure: continue`, and the chain does not depend
 *    on the journal's own persistence.
 *  - `GET /internal/proposals/:id` — `read_proposal_decision`, answered from the
 *    SAME `ProposalsService` the gate's real step definitions write through, so
 *    the two paths cannot disagree about a proposal's state.
 */
export const installKibanaRequestFake = ({
  http,
  getProposal,
  findAttackDiscoveries,
}: {
  http: CoreStart['http'];
  getProposal: (id: string, spaceId: string) => Promise<unknown>;
  findAttackDiscoveries: (ids: string[]) => Array<Record<string, unknown>>;
}): jest.Mock => {
  const route = async (path: string, { method = 'GET', query }: SelfClientFetchOptions) => {
    const converseMatch = path.match(/\/s\/([^/]+)\/api\/chat\/converse$/);
    if (converseMatch && method === 'POST') {
      return jsonResponse(200, { conversation_id: 'journal', status: 'accepted' });
    }

    if (method === 'GET' && /\/api\/attack_discovery\/_find(\?|$)/.test(path)) {
      const rawIds = query?.ids ?? new URL(path, 'http://localhost').searchParams.get('ids') ?? '';
      const ids = (Array.isArray(rawIds) ? rawIds.map(String) : String(rawIds).split(','))
        .map((id) => id.trim())
        .filter(Boolean);
      return jsonResponse(200, { data: findAttackDiscoveries(ids) });
    }

    if (method === 'POST' && /\/api\/detection_engine\/signals\/status$/.test(path)) {
      return jsonResponse(200, { updated: 1, total: 1, failures: [] });
    }

    const proposalMatch = path.match(/\/internal\/proposals\/([^/?]+)/);
    if (proposalMatch && method === 'GET') {
      const spaceMatch = path.match(/\/s\/([^/]+)\//);
      const spaceId = spaceMatch ? spaceMatch[1] : 'fake_space_id';
      try {
        const proposal = await getProposal(decodeURIComponent(proposalMatch[1]), spaceId);
        return jsonResponse(200, proposal);
      } catch (error) {
        return jsonResponse(404, {
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    throw new Error(`installKibanaRequestFake: unhandled fetch ${method} ${path}`);
  };

  const fetchMock = jest.fn(async (path: string, options: SelfClientFetchOptions = {}) => ({
    request: { url: `http://localhost${path}` },
    response: await route(path, options),
  }));

  jest.mocked(http.basePath.prepend).mockImplementation((path: string) => path);
  jest.mocked(http.selfClient.asScoped).mockReturnValue({ fetch: fetchMock } as never);
  return fetchMock;
};

const jsonResponse = (status: number, body: unknown) => {
  const text = JSON.stringify(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => body,
    text: async () => text,
    body: {
      getReader: () => {
        let done = false;
        return {
          read: async () => {
            if (done) {
              return { done: true, value: undefined };
            }
            done = true;
            return { done: false, value: new TextEncoder().encode(text) };
          },
          releaseLock: () => {},
          cancel: async () => {},
        };
      },
    },
  } as unknown as Response;
};
