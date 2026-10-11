/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';

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

/**
 * Mocks `global.fetch`, which is what `KibanaActionStepImpl` calls to reach a
 * `kibana.request` step's target — real HTTP is not available in this harness.
 *
 * Routes exactly the two paths the AlertZero worker chain's `kibana.request`
 * steps ever hit:
 *  - `POST /s/:space/api/chat/converse` — the journal-note helper
 *    (`system-alertzero-journal-note`), which posts a `trigger_mode: never`
 *    user_message. Faked as a no-op 200: the chain's plumbing does not depend
 *    on the journal's own persistence, only on the note-append call not
 *    failing the caller (every call site sets `on-failure: continue` anyway).
 *  - `GET /internal/proposals/:id` — `read_proposal_decision` in the review,
 *    reading back `dismissReason`/`decidedBy`/`rationale`, which the escalation
 *    gate's own `workflow.output` does not carry. Answered from the SAME
 *    `ProposalsService` instance the gate's real step definitions write
 *    through, so the two paths cannot disagree about a proposal's state.
 */
export const installKibanaRequestFake = ({
  getProposal,
}: {
  getProposal: (id: string, spaceId: string) => Promise<unknown>;
}): jest.Mock => {
  const fetchMock = jest.fn(async (url: string | URL, init?: RequestInit) => {
    const path = typeof url === 'string' ? url : url.toString();
    const method = init?.method ?? 'GET';

    const converseMatch = path.match(/\/s\/([^/]+)\/api\/chat\/converse$/);
    if (converseMatch && method === 'POST') {
      return jsonResponse(200, { conversation_id: 'journal', status: 'accepted' });
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
  });

  (global as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
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
