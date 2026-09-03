/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpServiceStart, KibanaRequest, Logger } from '@kbn/core/server';
import {
  deriveConversationIds,
  type PndConversationKind,
  type PndGateDefinition,
} from '@kbn/pnd-common';

import {
  PND_INCIDENT_AGENT_ID,
  PND_INVESTIGATION_AGENT_ID,
  PND_TUNING_AGENT_ID,
} from '../../../../../../common/constants';
import type { PndAgentInstaller } from '../../../../../agent_builder/install_pnd_agents';
import type { WatchWorkflowsManagementClient } from '../../../../../services/watches/watch_workflows_management_client';
import { getAgentBuilderConversation } from '../../../../helpers/get_agent_builder_conversation';
import { buildThreadAttachments, PND_THREAD_ATTACHMENT_IDS } from '../build_thread_attachments';
import { buildThreadTitle } from '../build_thread_title';
import { createPndConversation } from '../create_pnd_conversation';
import { createThreadAttachments } from '../create_thread_attachments';
import { findPndProposalRow } from '../find_pnd_proposal_row';

/**
 * Which of the three installed agents answers a thread (D3 — there is deliberately no fourth).
 *
 * Keyed on `PndGateDefinition.threadAgentKind`, so widening `PndConversationKind` fails this type
 * check rather than silently falling back to the default agent. `apply_tuning` is the one gate where
 * this differs from `parentKind`: the tuning specialist answers a thread that belongs to the
 * incident.
 */
const AGENT_ID_BY_THREAD_AGENT_KIND: Record<PndConversationKind, string> = {
  incident: PND_INCIDENT_AGENT_ID,
  investigation: PND_INVESTIGATION_AGENT_ID,
  tuning: PND_TUNING_AGENT_ID,
};

/** What `_ensure` did, in the terms the response's `created` flag and the log lines need. */
export type EnsureThreadConversationResult =
  /** This call materialised the thread. `missingAttachments` is empty on the happy path. */
  | { missingAttachments: string[]; outcome: 'created' }
  /** The thread was already there — the D6 idempotency answer a retried workflow step reports. */
  | { outcome: 'existed' }
  /** Agent Builder refused or failed; `status` is what it answered. */
  | { outcome: 'failed'; status: number };

export interface EnsureThreadConversationParams {
  /** Agent Builder's start contract; absent on a deployment without it. */
  agentBuilder?: Parameters<PndAgentInstaller['ensurePndAgents']>[0]['agentBuilder'];
  /** The discovery the thread is derived from; the caller has proved it can read it (S3). */
  correlationId: string;
  /** `buildAttackDiscoveryMarkdown(alert)` — the canonical renderer. */
  attackDiscoveryMarkdown: string;
  /** `truncateAttackDiscoveryTitle(alert.title)`. */
  attackDiscoveryTitle: string;
  /** The per-registration, per-space idempotent agent installer. */
  ensurePndAgents: PndAgentInstaller['ensurePndAgents'];
  gate: PndGateDefinition;
  http: HttpServiceStart;
  logger: Logger;
  /**
   * The Workflows management client, used only to look the paired proposal row up. `undefined` is a
   * **degrade, not a failure**: the row is best-effort (it usually does not exist yet on the eager
   * path), so a thread is still worth materialising without it.
   */
  managementClient: WatchWorkflowsManagementClient | undefined;
  request: KibanaRequest;
  spaceId: string;
  /** `deriveThreadConversationId({ correlationId, gateId })` — never re-derived here. */
  threadConversationId: string;
}

/** The paired proposal row, or `undefined` — never an error, and never a reason to stop. */
const readProposalRow = async ({
  correlationId,
  gate,
  logger,
  managementClient,
  spaceId,
}: Pick<
  EnsureThreadConversationParams,
  'correlationId' | 'gate' | 'logger' | 'managementClient' | 'spaceId'
>) => {
  if (managementClient == null) {
    logger.debug(
      () =>
        `Workflows management API is unavailable; seeding the PND thread for "${correlationId}" / "${gate.gateId}" without its proposal row`
    );
    return undefined;
  }

  try {
    return await findPndProposalRow({
      correlationId,
      gateId: gate.gateId,
      logger,
      managementClient,
      spaceId,
    });
  } catch (error) {
    // Read failures propagate out of `listPendingPndGates` by design, so they are caught here
    // rather than there: a broken proposals read must not stop a thread being materialised.
    logger.warn(
      `Could not read the proposal row for PND thread "${
        gate.gateId
      }" on Attack Discovery alert "${correlationId}": ${
        error instanceof Error ? error.message : String(error)
      }. Seeding the thread from the gate registry instead.`
    );
    return undefined;
  }
};

/**
 * Materialise the `[Thread]` conversation for one HITL proposal, idempotently (D5 / D6).
 *
 * The whole of `_ensure`'s work, in the order the idempotency argument needs:
 *
 * 1. **Pre-read.** `GET /api/agent_builder/conversations/{threadId}` as the caller. A readable
 *    conversation short-circuits to `existed` — no create hop, no attachments, no second thread.
 * 2. **Create.** One `POST /api/agent_builder/conversations` at the derived id, with a server-built
 *    title. No LLM turn.
 * 3. **Conflict and post-failure re-read.** The create route maps `op_type: create` conflicts to
 *    **409**. That is treated as `existed`. Any other non-2xx is re-read before it is reported as a
 *    failure, because a concurrent creator may have won the race through another path.
 * 4. **Attachments.** Three `type: 'text'` attachments with deterministic ids, created only on the
 *    path that created the conversation, best-effort and logged.
 *
 * The fourth control — the per-registration in-flight `Map` that coalesces two simultaneous calls
 * for one `(space, threadId)` pair — lives in the route, because it must outlive a single
 * invocation of this function.
 *
 * ⛔ **No deterministic `execution_id`.** It is the obvious fifth control and it is wrong: the
 * execution document persists, so every retry would `400` forever.
 */
export const ensureThreadConversation = async ({
  agentBuilder,
  correlationId,
  attackDiscoveryMarkdown,
  attackDiscoveryTitle,
  ensurePndAgents,
  gate,
  http,
  logger,
  managementClient,
  request,
  spaceId,
  threadConversationId,
}: EnsureThreadConversationParams): Promise<EnsureThreadConversationResult> => {
  const preRead = await getAgentBuilderConversation({
    conversationId: threadConversationId,
    http,
    request,
    spaceId,
  });

  if (preRead.exists) {
    logger.debug(
      () =>
        `PND thread "${threadConversationId}" already exists for gate "${gate.gateId}" on Attack Discovery alert "${correlationId}"`
    );
    return { outcome: 'existed' };
  }

  const proposal = await readProposalRow({
    correlationId,
    gate,
    logger,
    managementClient,
    spaceId,
  });

  // ADR-011: name an agent only when the install reported success, so agent existence and agent-id
  // availability degrade together and the create route falls back to the default agent rather than
  // hard-failing on an agent that was never ensured.
  const agentsInstalled = await ensurePndAgents({ agentBuilder, spaceId });
  const agentId = agentsInstalled ? AGENT_ID_BY_THREAD_AGENT_KIND[gate.threadAgentKind] : undefined;

  const { status } = await createPndConversation({
    agentId,
    conversationId: threadConversationId,
    http,
    request,
    spaceId,
    title: buildThreadTitle({ attackDiscoveryTitle, gate }),
  });

  if (status === 409) {
    logger.debug(
      () =>
        `Agent Builder answered 409 while creating PND thread "${threadConversationId}" for gate "${gate.gateId}" on Attack Discovery alert "${correlationId}" — treating it as a concurrent create rather than a failure.`
    );
    return { outcome: 'existed' };
  }

  if (status < 200 || status >= 300) {
    const postFailureRead = await getAgentBuilderConversation({
      conversationId: threadConversationId,
      http,
      request,
      spaceId,
    });

    if (postFailureRead.exists) {
      logger.warn(
        `Agent Builder answered ${status} while creating PND thread "${threadConversationId}" for gate "${gate.gateId}" on Attack Discovery alert "${correlationId}", but the thread now exists — treating it as a concurrent create rather than a failure.`
      );
      return { outcome: 'existed' };
    }

    logger.warn(
      `Failed to materialise PND thread "${threadConversationId}" for gate "${gate.gateId}" on Attack Discovery alert "${correlationId}" in space "${spaceId}": Agent Builder answered ${status}.`
    );
    return { outcome: 'failed', status };
  }

  const threadAttachments = buildThreadAttachments({ attackDiscoveryMarkdown, gate, proposal });
  const attackDiscoveryAttachment = threadAttachments.find(
    ({ id }) => id === PND_THREAD_ATTACHMENT_IDS.attackDiscovery
  );

  const { missing } = await createThreadAttachments({
    attachments: threadAttachments,
    conversationId: threadConversationId,
    http,
    logger,
    request,
    spaceId,
  });

  // A3: the investigation *container* must carry the Attack Discovery attachment. Floor mints
  // that conversation with no attachments; only this hop (and the later thread `_ensure`)
  // can attach it. Best-effort: a miss must not fail the thread, which is the deliverable.
  if (attackDiscoveryAttachment != null) {
    await createThreadAttachments({
      attachments: [attackDiscoveryAttachment],
      conversationId: deriveConversationIds(correlationId).investigationConversationId,
      http,
      logger,
      request,
      spaceId,
    });
  }

  logger.info(
    `Materialised PND thread "${threadConversationId}" for gate "${
      gate.gateId
    }" on Attack Discovery alert "${correlationId}" in space "${spaceId}"${
      missing.length === 0 ? '' : `, without ${missing.length} of its 3 attachments`
    }`
  );

  return { missingAttachments: missing, outcome: 'created' };
};
