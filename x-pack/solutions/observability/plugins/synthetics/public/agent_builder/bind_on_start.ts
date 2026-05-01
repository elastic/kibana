/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import type { ApplicationStart, HttpStart } from '@kbn/core/public';
import { registerMonitorManagementAttachmentUIDefinition } from './attachments';

interface BindAgentBuilderOnStartOptions {
  /** Optional plugin contract — `undefined` when `agentBuilder` is not loaded. */
  agentBuilder: AgentBuilderPluginStart | undefined;
  /** Browser HTTP client, used by canvas Create / Update buttons. */
  http: HttpStart;
  /** Application contract, used for capability lookup + monitor-detail nav. */
  application: ApplicationStart;
}

export interface BindAgentBuilderOnStartResult {
  registered: boolean;
  reason?: 'plugin_missing';
}

/**
 * Browser-side counterpart to `bindAgentBuilder` (server). Registers the
 * Synthetics monitor-management attachment UI definition with the
 * `agentBuilder` plugin's attachment service.
 *
 * Same single gate as the server bind: `agentBuilder` plugin presence.
 * No additional FF — the Agent Builder UX itself is the gate.
 *
 * Calling without registration is **not an error**: many Kibana flavours
 * omit `agentBuilder` and we want the no-op path silent.
 */
export const bindAgentBuilderOnStart = ({
  agentBuilder,
  http,
  application,
}: BindAgentBuilderOnStartOptions): BindAgentBuilderOnStartResult => {
  if (!agentBuilder) {
    return { registered: false, reason: 'plugin_missing' };
  }

  registerMonitorManagementAttachmentUIDefinition({
    attachmentService: agentBuilder.attachments,
    http,
    application,
  });
  return { registered: true };
};
