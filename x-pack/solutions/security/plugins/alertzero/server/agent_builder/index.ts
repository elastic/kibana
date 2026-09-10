/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server';
import { proposalAttachmentType } from './attachments/proposal_attachment_type';

/**
 * Registers all AlertZero attachment types with Agent Builder.
 * Called from `server/plugin.ts` setup(), alongside `registerAgentType`.
 */
export const registerAlertZeroAttachments = ({
  agentBuilder,
}: {
  agentBuilder: AgentBuilderPluginSetup;
}): void => {
  agentBuilder.attachments.registerType(
    proposalAttachmentType as Parameters<typeof agentBuilder.attachments.registerType>[0]
  );
};
