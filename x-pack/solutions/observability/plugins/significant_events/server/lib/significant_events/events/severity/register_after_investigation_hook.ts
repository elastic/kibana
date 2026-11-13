/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { ConversationRoundStatus, isConversationNotFoundError } from '@kbn/agent-builder-common';
import {
  HookExecutionMode,
  HookLifecycle,
  type AfterExecutionHookContext,
  type AgentBuilderPluginSetup,
} from '@kbn/agent-builder-server';
import { NIGHTSHIFT_INVESTIGATION_AGENT_ID } from '@kbn/nightshift-investigations-plugin/common';
import {
  episodeIdsOf,
  eventIdsGovernedBy,
  isForbidden,
  isRecordedInvestigation,
  type InvestigationsReader,
} from './investigation_outcome';
import type { SeveritySync } from './sync_severity';
import type { RuleEventsClient } from '../rule_events_client';

interface AfterInvestigationHookDeps {
  agenticInvestigations?: InvestigationsReader;
  getEventClient: (request: KibanaRequest) => Promise<RuleEventsClient>;
  severitySync: SeveritySync;
}

/** `failure` is absent while the findings are not recorded yet. */
type AttemptResult = { done: true } | { done: false; failure?: string };

const HOOK_ID = 'after-investigation-severity-sync';

/** The wait before each attempt, so they run about 0, 2 and 12 s in: the final findings can land late. */
const DEFAULT_RETRY_DELAYS_MS = [0, 2_000, 10_000];

/** A conversation that is not an investigation (or no longer exists) has nothing to write through. */
const isNotAnInvestigation = (error: unknown): boolean =>
  isConversationNotFoundError(error) ||
  (error instanceof Error && error.name === 'WrongTemplateError');

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Fast path: writes the investigation's severity through to its events after the recorder's
 * final pass. Reads and Discovery resolve the same severity, so a miss is still correct. Non-blocking,
 * so it runs after the recorder's blocking hook and never affects the investigation.
 */
export const registerAfterInvestigationHook = ({
  agentBuilder,
  getDeps,
  logger,
  retryDelaysMs = DEFAULT_RETRY_DELAYS_MS,
}: {
  agentBuilder: Pick<AgentBuilderPluginSetup, 'hooks'>;
  getDeps: () => AfterInvestigationHookDeps | undefined;
  logger: Logger;
  retryDelaysMs?: number[];
}): void => {
  const attempt = async ({
    conversationId,
    request,
  }: {
    conversationId: string;
    request: KibanaRequest;
  }): Promise<AttemptResult> => {
    const deps = getDeps();
    if (!deps?.agenticInvestigations) return { done: true };

    const investigation = await deps.agenticInvestigations
      .getInvestigationsClient(request)
      .get(conversationId);
    // The final pass is not visible yet, or this round recorded no findings: try again shortly.
    // A not-recorded attempt also clears an earlier failure: the state to report is the latest one.
    if (!isRecordedInvestigation(investigation)) return { done: false };

    const eventClient = await deps.getEventClient(request);
    const { eventIds } = eventIdsGovernedBy({
      investigation,
      eventIdsByEpisode: await eventClient.findEventIdsByEpisodeIds(episodeIdsOf(investigation)),
    });
    // The sync resolves again, from the events' episodes: a newer investigation can govern the same
    // events, and the newest recorded one wins.
    const outcome = await deps.severitySync.syncEvents({
      request,
      eventClient,
      eventIds: [...eventIds],
    });
    if (outcome.status === 'unavailable') {
      // A timeout or an error may pass; the other reasons will not by waiting.
      return outcome.reason === 'timeout' || outcome.reason === 'error'
        ? { done: false, failure: outcome.reason }
        : { done: true };
    }
    return { done: true };
  };

  const handler = async (context: AfterExecutionHookContext): Promise<void> => {
    const { agentId, conversationId, conversationAccess, round, request } = context;
    if (
      agentId !== NIGHTSHIFT_INVESTIGATION_AGENT_ID ||
      !conversationId ||
      conversationAccess === 'readOnly' ||
      round.status !== ConversationRoundStatus.completed
    ) {
      return;
    }

    let lastFailure: string | undefined;
    for (const delay of retryDelaysMs) {
      if (delay > 0) await wait(delay);
      try {
        const result = await attempt({ conversationId, request });
        if (result.done) return;
        lastFailure = result.failure;
      } catch (error) {
        if (isForbidden(error) || isNotAnInvestigation(error)) {
          logger.debug(
            `Investigation ${conversationId} severity not written through: it cannot be read as an investigation`
          );
          return;
        }
        lastFailure = error instanceof Error ? error.message : String(error);
        logger.debug(
          `Investigation ${conversationId} severity write-through failed: ${lastFailure}`
        );
      }
    }

    if (lastFailure) {
      logger.warn(
        `Investigation ${conversationId} severity was not written through after ${retryDelaysMs.length} attempts (${lastFailure}); the next investigation run or Discovery write will write it`
      );
    } else {
      logger.debug(
        `Investigation ${conversationId} has no recorded findings; nothing to write through`
      );
    }
  };

  agentBuilder.hooks.register({
    id: HOOK_ID,
    hooks: {
      [HookLifecycle.afterExecution]: { mode: HookExecutionMode.nonBlocking, handler },
    },
  });
};
