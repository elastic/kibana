/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */
import { RESPONSE_ACTION_AGENT_TYPE } from '../../../../common/endpoint/service/response_actions/constants';

/**
 * Typed error classes raised by the runner. The route maps each one to
 * a 4xx status; anything else surfaces as a 500. Keeping the taxonomy
 * here (instead of in the route) keeps it co-located with the code that
 * raises the error and lets the agent-builder tool reuse the same
 * mapping when it lands.
 */
export class UnsupportedAgentTypeError extends Error {
  readonly code = 'UNSUPPORTED_AGENT_TYPE' as const;
  constructor(agentType: string) {
    super(
      `Agent type [${agentType}] is not supported. Supported types: ${RESPONSE_ACTION_AGENT_TYPE.join(
        ', '
      )}`
    );
    this.name = 'UnsupportedAgentTypeError';
  }
}

export class UnsupportedCommandForAgentTypeError extends Error {
  readonly code = 'UNSUPPORTED_COMMAND_FOR_AGENT_TYPE' as const;
  constructor(command: string, agentType: string) {
    super(`Command [${command}] is not supported for agent type [${agentType}]`);
    this.name = 'UnsupportedCommandForAgentTypeError';
  }
}

export class MissingConnectorActionsError extends Error {
  readonly code = 'MISSING_CONNECTOR_ACTIONS' as const;
  constructor(agentType: string) {
    super(
      `Agent type [${agentType}] requires a connector-actions client which is not yet wired through the route. Use agentType=endpoint or pass connectorActions explicitly.`
    );
    this.name = 'MissingConnectorActionsError';
  }
}
