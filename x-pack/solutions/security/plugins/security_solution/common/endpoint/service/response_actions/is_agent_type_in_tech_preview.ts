/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResponseActionAgentType } from './constants';

const TECH_PREVIEW_AGENT_TYPE = Object.freeze<Record<ResponseActionAgentType, boolean>>({
  endpoint: false,
  microsoft_defender_endpoint: false,
  crowdstrike: false,
  sentinel_one: false,
});

/**
 * Returns boolean indicating if agent type is in tech preview or not.
 * @param agentType
 */
export const isAgentTypeInTechPreview = (agentType: ResponseActionAgentType) => {
  return TECH_PREVIEW_AGENT_TYPE[agentType] ?? true;
};
