/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResponseActionAgentType } from '../../../../../common/endpoint/service/response_actions/constants';
import { RESPONSE_ACTIONS_ALERT_AGENT_ID_FIELDS } from '../../../../../common/endpoint/service/response_actions/constants';

/**
 * Checks the provided `agentIdEcsField` path provided to see if it is being used by one
 * of the agent types that supports response actions and returns that agent type.
 * Defaults to `endpoint` if no match is found
 * @param agentIdEcsField
 */
export const getAgentTypeForAgentIdField = (agentIdEcsField: string): ResponseActionAgentType => {
  for (const [fieldAgentType, fieldValues] of Object.entries(
    RESPONSE_ACTIONS_ALERT_AGENT_ID_FIELDS
  )) {
    if (fieldValues.includes(agentIdEcsField)) {
      return fieldAgentType as ResponseActionAgentType;
    }
  }
  return 'endpoint';
};
