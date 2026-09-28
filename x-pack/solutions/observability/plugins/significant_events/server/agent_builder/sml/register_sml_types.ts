/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderSmlPluginSetup } from '@kbn/agent-builder-sml-plugin/server';
import type { DataStreamsStart } from '@kbn/core-data-streams-server';
import type { GetScopedClients } from '../../routes/types';
import { createSignificantEventSmlType } from './significant_event_sml_type';

export const registerAgentBuilderSmlTypes = ({
  agentBuilderSml,
  getScopedClients,
  getDataStreams,
  isAvailable,
}: {
  agentBuilderSml?: AgentBuilderSmlPluginSetup;
  getScopedClients: GetScopedClients;
  getDataStreams: () => Promise<DataStreamsStart>;
  isAvailable: () => Promise<boolean>;
}): void => {
  agentBuilderSml?.registerType(
    createSignificantEventSmlType({
      getScopedClients,
      getDataStreams,
      isAvailable,
    })
  );
};
