/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NIGHTSHIFT_ASSISTANT_AGENT_ID, NIGHTSHIFT_INVESTIGATION_AGENT_ID } from '../../common';

/**
 * Agents whose rounds read and write the shared Cortex wiki and Semantic Memory. The hooks run
 * from managed workflows that also have a manual trigger, so an unlisted or missing agent id is
 * refused rather than trusted.
 */
const KNOWLEDGE_AGENT_IDS: ReadonlySet<string> = new Set([
  NIGHTSHIFT_INVESTIGATION_AGENT_ID,
  NIGHTSHIFT_ASSISTANT_AGENT_ID,
]);

/** Whether a round from this agent may read and update Cortex and Semantic Memory. */
export const usesKnowledge = (agentId: string | undefined): boolean =>
  agentId !== undefined && KNOWLEDGE_AGENT_IDS.has(agentId.trim());

/** Whether a round from this agent reads and reinforces the decision trees: the investigator only. */
export const usesDecisionTrees = (agentId: string | undefined): boolean =>
  agentId?.trim() === NIGHTSHIFT_INVESTIGATION_AGENT_ID;
