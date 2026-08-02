/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  API_VERSIONS,
  deriveThreadConversationId,
  EnsureThreadRequestBody,
  type EnsureThreadResponse,
  getGateDefinitionByGateId,
  INTERNAL_API_ACCESS,
  PND_THREADS_ENSURE_URL,
} from '@kbn/pnd-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';

import { PND_API_PRIVILEGE_THREADS_WRITE } from '../../../../common/constants';
import { createPndAgentInstaller } from '../../../agent_builder/install_pnd_agents';
import type { RouteDependencies } from '../../register_routes';
import { buildAttackDiscoveryMarkdown } from '../../get/conversations/helpers/build_attack_discovery_markdown';
import { findAttackDiscoveryAlerts } from '../../get/conversations/helpers/find_attack_discovery_alerts';
import { truncateAttackDiscoveryTitle } from '../../get/conversations/helpers/truncate_attack_discovery_title';
import { guardDerivedConversationId } from '../../helpers/guard_derived_conversation_id';
import {
  ensureThreadConversation,
  type EnsureThreadConversationResult,
} from './helpers/ensure_thread_conversation';

/**
 * `POST /internal/pnd/threads/_ensure` — materialise the `[Thread]` conversation paired 1:1 with one
 * HITL proposal (D1 / D5 / ADR-012).
 *
 * Called eagerly by the Watch Floor and the Post-Incident Watch from a `kibana.request` step with
 * `on-failure: { continue: true }`, so every pending proposal has a thread whether or not anyone
 * opens it. The thread is minted via `POST /api/agent_builder/conversations` — no LLM turn — with
 * the title set at creation.
 *
 * **The request body is exactly `{ correlationId, gateId }`, forever.** The title is
 * built server-side from the gate registry and the Attack Discovery. There is no `prompt`,
 * `message` or `title` field, and unknown properties are dropped rather than rejected — a workflow
 * step must never be `400`ed for sending an extra field, and stripping makes caller-supplied text
 * unreachable on a route every holder of `pnd_threads_write` can reach (D5).
 *
 * **Three boundaries, in order:**
 *
 * 1. `pnd_threads_write` — the platform authz grant.
 * 2. Fail-closed derivation: `deriveThreadConversationId` answers `undefined` for a blank alert id
 *    or an unregistered gate, and the route stops there rather than minting anything. The codec
 *    already rejects both (`format: nonempty`, the closed `PndGateId` enum), so this is the
 *    boundary behind the contract — the same "the schema is the contract, the route is the boundary"
 *    posture `_apply`'s allow-list takes.
 * 3. Security finding S3: the discovery is resolved **as the calling user** through
 *    `GET /api/attack_discovery/_find`, and an unreadable one is a `404` — never the internal user's
 *    view, and never a thread seeded with content the caller may not see.
 *
 * The S11 guard runs too, even though the id it checks is one this route just derived. That is
 * deliberate rather than redundant: it is the single place `.7`, `.8` and `.9` also go through, and
 * keeping `_ensure` on the same path means a future change that starts accepting the conversation id
 * from anywhere else inherits the check instead of needing to remember it.
 *
 * **Idempotency (D6)** is four controls, three of them in `ensureThreadConversation` (pre-read,
 * post-failure re-read, deterministic attachment ids) and the fourth here: a per-registration
 * in-flight `Map` keyed on `(space, thread id)`, so two simultaneous calls for one proposal share a
 * single materialisation rather than racing into two creates. It lives at the registration, not
 * in the handler, because it has to outlive a single request. ⛔ There is deliberately **no**
 * deterministic `execution_id`: the execution document persists, so every retry would `400` forever.
 *
 * **Self-call depth.** The eager path is workflow → `_ensure` → `POST /conversations`, which is
 * depth 3 against Core's `MAX_SELF_CALL_DEPTH = 4`, plus the `_find` read and the three attachment
 * `POST`s — all of which are siblings at the same depth, not a deeper chain. There is no budget for
 * another hop; anything that needs one has to be recorded rather than added silently.
 */
export const registerEnsureThreadRoute = ({
  getSpaceId,
  getStartServices,
  getWorkflowsManagementClient,
  logger,
  router,
}: RouteDependencies) => {
  // One installer per registration, so its per-space guard lives exactly as long as the routes do —
  // the same shape `_derive` uses.
  const { ensurePndAgents } = createPndAgentInstaller({ logger });

  /**
   * D6's in-flight coalescing, keyed `${spaceId}::${threadConversationId}`.
   *
   * The pre-read cannot see a materialisation that is still in flight, so without this two calls
   * arriving together — a watch retry landing on top of the original, most likely — would both miss
   * and both converse. Entries are removed in a `finally`, so the map holds only live work.
   */
  const inFlight = new Map<string, Promise<EnsureThreadConversationResult>>();

  router.versioned
    .post({
      path: PND_THREADS_ENSURE_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [PND_API_PRIVILEGE_THREADS_WRITE] },
      },
      summary: 'Ensure the PND thread paired with a HITL proposal exists',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            body: buildRouteValidationWithZod(EnsureThreadRequestBody),
          },
        },
      },
      async (_context, request, response) => {
        const { correlationId, gateId } = request.body;

        const gate = getGateDefinitionByGateId(gateId);
        const threadConversationId = deriveThreadConversationId({
          correlationId,
          gateId,
        });

        if (gate == null || threadConversationId == null) {
          logger.warn(
            `Refusing to ensure a PND thread for gate "${gateId}" on Attack Discovery alert "${correlationId}": no thread id is derivable from that pair.`
          );
          return response.badRequest({
            body: {
              message: 'No PND thread is derivable from that Attack Discovery alert and gate',
            },
          });
        }

        // S11, on the same helper the attachments route uses. Tautological on this route today — the
        // id was just derived from the alert id — and kept so it cannot stop being true unnoticed.
        // It is now one of only two callers: `.7`/`.8`/`.9`'s routes were retired in kibana-phf4.2
        // (register `#23`, ADR-016), which makes this the guard's coverage rather than a spare copy.
        if (
          !guardDerivedConversationId({
            correlationId,
            conversationId: threadConversationId,
            logger,
          }).authorized
        ) {
          return response.notFound();
        }

        try {
          const [{ http }, { agentBuilder }] = await getStartServices();
          const spaceId = getSpaceId(request);

          // S3: resolve the discovery as the calling user; 404 when it is not readable. This is also
          // where the Attack Discovery markdown and title for the thread come from — one fetch, not two.
          const [alert] = await findAttackDiscoveryAlerts({
            http,
            ids: [correlationId],
            request,
            spaceId,
          });

          if (alert == null) {
            logger.warn(
              `Refusing to ensure the PND thread for gate "${gateId}": Attack Discovery alert "${correlationId}" is not readable in space "${spaceId}".`
            );
            return response.notFound();
          }

          const key = `${spaceId}::${threadConversationId}`;
          const started =
            inFlight.get(key) ??
            ensureThreadConversation({
              agentBuilder,
              correlationId,
              attackDiscoveryMarkdown: buildAttackDiscoveryMarkdown(alert),
              attackDiscoveryTitle: truncateAttackDiscoveryTitle(alert.title),
              ensurePndAgents,
              gate,
              http,
              logger,
              managementClient: getWorkflowsManagementClient(),
              request,
              spaceId,
              threadConversationId,
            });
          inFlight.set(key, started);

          try {
            const result = await started;

            if (result.outcome === 'failed') {
              // A 403 reported as a 500 would send a workflow author looking for an outage instead
              // of a missing Agent Builder grant, so it is surfaced as itself.
              if (result.status === 403) {
                return response.forbidden({
                  body: { message: 'Not authorized to open the PND thread' },
                });
              }

              return response.customError({
                statusCode: 500,
                body: { message: 'Failed to ensure the PND thread' },
              });
            }

            const body: EnsureThreadResponse = {
              created: result.outcome === 'created',
              threadConversationId,
            };

            return response.ok({ body });
          } finally {
            inFlight.delete(key);
          }
        } catch (error) {
          logger.error(
            `Failed to ensure the PND thread for gate "${gateId}" on Attack Discovery alert "${correlationId}": ${
              error instanceof Error ? error.message : String(error)
            }`
          );
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to ensure the PND thread' },
          });
        }
      }
    );
};
