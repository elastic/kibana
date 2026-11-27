/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkObject, RegisterEntityMaintainerConfig } from '@kbn/entity-store/server';
import type { Entity } from '@kbn/entity-store/common/domain/definitions/entity.gen';
import type { AiAgentActivity } from '@kbn/entity-store/common/domain/definitions/ai_agent_activity';
import { getEntitiesAlias, ENTITY_LATEST } from '@kbn/entity-store/common/domain/entity_index';
import { ACTIVITY_MAX_PROCESS_EVENTS } from '../../../../../common/entity_analytics/ai_security/activity/constants';
import { getSessionsWindow } from '../../../../../common/entity_analytics/ai_security/activity/build_agent_sessions';
import { computeAiAgentActivity } from './compute_ai_agent_activity';
import { readAgentIdentities, readOwnProcessEvents } from './read_activity_events';

export const AI_AGENT_ACTIVITY_MAINTAINER_ID = 'ai_agent_activity';
const LOG_PREFIX = `[${AI_AGENT_ACTIVITY_MAINTAINER_ID}]`;
const WRITE_CHUNK_SIZE = 1_000;

/** The partial update for one agent. The whole object is written each run. */
export const buildAiAgentActivityUpdate = (
  agentId: string,
  activity: AiAgentActivity
): BulkObject => ({
  type: 'ai_agent',
  // The generated Entity schema doesn't describe `ai_agent_activity`; the ai_agent definition maps it.
  doc: {
    entity: { id: agentId, attributes: { ai_agent_activity: activity } },
  } as unknown as Entity,
});

export const aiAgentActivityMaintainer: RegisterEntityMaintainerConfig = {
  id: AI_AGENT_ACTIVITY_MAINTAINER_ID,
  description:
    "Counts each AI agent's sessions over the last 30 days from its own Defend process events and writes them on the agent row",
  interval: '1h',
  timeout: '1h',
  initialState: {},
  run: async ({ esClient, logger, status, crudClient, signal }) => {
    const { namespace } = status.metadata;
    const index = getEntitiesAlias(ENTITY_LATEST, namespace);

    const agents = await readAgentIdentities(esClient, index, signal);
    if (agents.length === 0) {
      logger.debug(`${LOG_PREFIX} No ai_agent rows in namespace ${namespace}`);
      return status.state;
    }
    const now = Date.now();
    const { eventsByAgent, failedAgents, error } = await readOwnProcessEvents({
      esClient,
      namespace,
      agents,
      window: getSessionsWindow(now),
      signal,
    });
    if (signal.aborted) {
      logger.info(`${LOG_PREFIX} Aborted before writing; agent rows keep their last activity`);
      return status.state;
    }
    if (failedAgents > 0) {
      logger.error(
        `${LOG_PREFIX} Couldn't read process events for ${failedAgents} agents, they keep their last activity: ${error}`
      );
    }

    const objects = agents.flatMap(({ entityId, agentName }) => {
      const ownEvents = eventsByAgent.get(entityId);
      return ownEvents
        ? [
            buildAiAgentActivityUpdate(
              entityId,
              computeAiAgentActivity({ agentName, ownEvents, now })
            ),
          ]
        : [];
    });
    const truncated = [...eventsByAgent.values()].filter(
      (events) => events.length >= ACTIVITY_MAX_PROCESS_EVENTS
    ).length;

    let notFound = 0;
    let failed = 0;
    for (let start = 0; start < objects.length; start += WRITE_CHUNK_SIZE) {
      const errors = await crudClient.bulkUpdateEntity({
        objects: objects.slice(start, start + WRITE_CHUNK_SIZE),
        force: true,
      });
      notFound += errors.filter((writeError) => writeError.status === 404).length;
      failed += errors.filter((writeError) => writeError.status !== 404).length;
      if (errors.some((writeError) => writeError.status !== 404)) {
        logger.error(`${LOG_PREFIX} Failed writes: ${JSON.stringify(errors.slice(0, 10))}`);
      }
    }

    logger.info(
      `${LOG_PREFIX} Completed run: ${
        agents.length
      } agents, ${failedAgents} not read, ${truncated} with more than ${ACTIVITY_MAX_PROCESS_EVENTS} process events (oldest sessions left out), ${
        objects.length - notFound - failed
      } written, ${notFound} no longer in store, ${failed} failed`
    );
    return status.state;
  },
};
