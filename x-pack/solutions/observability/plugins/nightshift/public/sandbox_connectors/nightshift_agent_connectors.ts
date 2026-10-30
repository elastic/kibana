/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentsServiceStartContract } from '@kbn/agent-builder-browser';
import {
  NIGHTSHIFT_ASSISTANT_AGENT_ID,
  NIGHTSHIFT_INVESTIGATION_AGENT_ID,
} from '@kbn/nightshift-investigations-plugin/common';
import { isHttpNotFoundError } from '../common/http_error';

type ConnectorAgents = Pick<
  AgentsServiceStartContract,
  'addConnectorToAgent' | 'removeConnectorFromAgent'
>;

/**
 * The hidden assistant answers Slack mentions with the investigator's connectors, so every
 * change to the investigator's connectors is applied to it as well. It is only installed while
 * the sandbox is available, so a space without it is skipped.
 */
const updateAssistant = async (update: () => Promise<unknown>): Promise<void> => {
  try {
    await update();
  } catch (error) {
    if (!isHttpNotFoundError(error)) throw error;
  }
};

/** Assigns a connector to the investigation agent and the assistant. */
export const addConnectorToNightshiftAgents = async (
  agents: ConnectorAgents,
  connectorId: string
): Promise<void> => {
  await agents.addConnectorToAgent({ agentId: NIGHTSHIFT_INVESTIGATION_AGENT_ID, connectorId });
  await updateAssistant(() =>
    agents.addConnectorToAgent({ agentId: NIGHTSHIFT_ASSISTANT_AGENT_ID, connectorId })
  );
};

/** Removes a connector from the investigation agent and the assistant. */
export const removeConnectorFromNightshiftAgents = async (
  agents: ConnectorAgents,
  connectorId: string
): Promise<void> => {
  await agents.removeConnectorFromAgent({
    agentId: NIGHTSHIFT_INVESTIGATION_AGENT_ID,
    connectorId,
  });
  await updateAssistant(() =>
    agents.removeConnectorFromAgent({ agentId: NIGHTSHIFT_ASSISTANT_AGENT_ID, connectorId })
  );
};
