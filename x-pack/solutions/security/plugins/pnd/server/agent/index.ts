/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  PND_THIN_AGENT_ID,
  PND_THIN_AGENT_TYPE_ID,
  PND_THIN_AGENT_NAME,
  PND_THIN_AGENT_DESCRIPTION,
  PND_THIN_AGENT_LABELS,
  PND_THIN_AGENT_AVATAR_SYMBOL,
  agentType,
  registerAgentType,
  createAgentRequest,
} from './agent';
export { ensureAgent, ensureAgentSafe } from './ensure_agent';
