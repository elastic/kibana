/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server';
import { createMonitorManagementAttachmentType } from './attachments/monitor_management_attachment_type';
import { createMonitorSmlType } from './sml/monitor_sml_type';
import { monitorManagementSkill } from './skills';

interface BindAgentBuilderOptions {
  /** May be `undefined` when the optional `agentBuilder` plugin is missing. */
  agentBuilder: AgentBuilderPluginSetup | undefined;
  logger: Logger;
}

export interface BindAgentBuilderResult {
  registered: boolean;
  /** Reason the binding was a no-op (only set when registered=false). */
  reason?: 'plugin_missing';
}

/**
 * Conditionally registers the Synthetics × Agent Builder integration
 * with the `agentBuilder` plugin during `setup()`.
 *
 * Single gate: the `agentBuilder` plugin is actually present. It's
 * declared optional in `kibana.jsonc` (deployments without Agent Builder
 * — e.g. some on-prem / classic stack flavours — still need to boot),
 * so we have to guard.
 *
 * No additional Synthetics-side feature flag: the broader Agent Builder
 * UX is itself the gate. When `agentBuilder` is enabled in a Kibana
 * deployment, registering one more skill / attachment type / SML type
 * is cheap (no UI footprint until an LLM produces a matching attachment)
 * and keeping the integration unconditional avoids dead config surface.
 *
 * Returns `{ registered: true }` on success — useful for tests and for
 * future diagnostic / observability hooks that want to mirror the same
 * predicate without re-implementing it.
 */
export const bindAgentBuilder = ({
  agentBuilder,
  logger,
}: BindAgentBuilderOptions): BindAgentBuilderResult => {
  if (!agentBuilder) {
    logger.debug(
      'Synthetics × Agent Builder integration: agentBuilder plugin not present; skipping.'
    );
    return { registered: false, reason: 'plugin_missing' };
  }

  // Cast: `registerType` is generic over the attachment type's data
  // shape, but the agentBuilder plugin's contract narrows to a single
  // unknown-data definition. Same pattern used by `dashboard_agent`.
  agentBuilder.attachments.registerType(
    createMonitorManagementAttachmentType({
      logger,
    }) as Parameters<typeof agentBuilder.attachments.registerType>[0]
  );

  agentBuilder.sml.registerType(
    createMonitorSmlType({ logger }) as Parameters<typeof agentBuilder.sml.registerType>[0]
  );

  agentBuilder.skills.register(monitorManagementSkill);

  logger.info(
    'Synthetics × Agent Builder integration: registered attachment type, SML type, and monitor-management skill.'
  );

  return { registered: true };
};
