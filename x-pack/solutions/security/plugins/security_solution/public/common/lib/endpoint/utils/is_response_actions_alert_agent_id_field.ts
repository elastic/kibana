/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SUPPORTED_AGENT_ID_ALERT_FIELDS } from '../../../../../common/endpoint/service/response_actions/constants';

/**
 * Checks to see if a given alert field (ex. `agent.id`) is used by Agents that have support for response actions.
 */
export const isResponseActionsAlertAgentIdField = (field: string): boolean => {
  return SUPPORTED_AGENT_ID_ALERT_FIELDS.includes(field);
};
