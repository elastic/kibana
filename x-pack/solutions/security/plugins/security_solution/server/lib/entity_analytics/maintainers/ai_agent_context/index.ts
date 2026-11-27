/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkObject, RegisterEntityMaintainerConfig } from '@kbn/entity-store/server';
import type { Entity } from '@kbn/entity-store/common/domain/definitions/entity.gen';
import type { AiAgentContext } from '@kbn/entity-store/common/domain/definitions/ai_agent_context';
import { getEntitiesAlias, ENTITY_LATEST } from '@kbn/entity-store/common/domain/entity_index';
import { computeAiAgentContexts } from './compute_ai_agent_context';
import { readAgentRows, readRelatedRows } from './read_context_rows';

export const AI_AGENT_CONTEXT_MAINTAINER_ID = 'ai_agent_context';
const LOG_PREFIX = `[${AI_AGENT_CONTEXT_MAINTAINER_ID}]`;
const WRITE_CHUNK_SIZE = 1_000;

/**
 * The partial update for one agent. The whole context object is written, `null` keys included,
 * because a partial update merges objects: a key left out would keep its stale value.
 */
export const buildAiAgentContextUpdate = (
  agentId: string,
  context: AiAgentContext
): BulkObject => ({
  type: 'ai_agent',
  // The generated Entity schema doesn't describe `ai_agent_context`; the ai_agent definition maps it.
  doc: { entity: { id: agentId, attributes: { ai_agent_context: context } } } as unknown as Entity,
});

export const aiAgentContextMaintainer: RegisterEntityMaintainerConfig = {
  id: AI_AGENT_CONTEXT_MAINTAINER_ID,
  description:
    'Copies facts about the people and hosts each AI agent is related to onto the agent row',
  interval: '1h',
  timeout: '1h',
  initialState: {},
  run: async ({ esClient, logger, status, crudClient, signal }) => {
    const { namespace } = status.metadata;
    const index = getEntitiesAlias(ENTITY_LATEST, namespace);

    const agents = await readAgentRows(esClient, index, signal);
    if (agents.length === 0) {
      logger.debug(`${LOG_PREFIX} No ai_agent rows in namespace ${namespace}`);
      return status.state;
    }
    const relatedRows = await readRelatedRows(esClient, index, agents, signal);
    if (signal.aborted) {
      logger.info(`${LOG_PREFIX} Aborted before writing; agent rows keep their last context`);
      return status.state;
    }

    const contexts = computeAiAgentContexts({
      agents,
      relatedRows,
      now: new Date().toISOString(),
    });
    const objects = [...contexts].map(([agentId, context]) =>
      buildAiAgentContextUpdate(agentId, context)
    );

    let notFound = 0;
    let failed = 0;
    for (let start = 0; start < objects.length; start += WRITE_CHUNK_SIZE) {
      const errors = await crudClient.bulkUpdateEntity({
        objects: objects.slice(start, start + WRITE_CHUNK_SIZE),
        force: true,
      });
      notFound += errors.filter((error) => error.status === 404).length;
      failed += errors.filter((error) => error.status !== 404).length;
      if (errors.some((error) => error.status !== 404)) {
        logger.error(`${LOG_PREFIX} Failed writes: ${JSON.stringify(errors.slice(0, 10))}`);
      }
    }

    logger.info(
      `${LOG_PREFIX} Completed run: ${agents.length} agents, ${relatedRows.length} related rows, ${
        objects.length - notFound - failed
      } written, ${notFound} no longer in store, ${failed} failed`
    );
    return status.state;
  },
};
