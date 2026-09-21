/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import { createThreatAttachmentType } from './threat';
import { createSignificantSecurityEventAttachmentType } from './significant_security_event';
import { createHuntCorrelationAttachmentType } from './hunt_correlation';

/**
 * Registers the three Hunt Watch attachment types on the
 * Agent Builder attachment registry. Must be called from `setup()`, inside the plugin's
 * existing `config.enabled` guard — the corresponding allow-list entries live in
 * `AGENT_BUILDER_BUILTIN_ATTACHMENTS` and registering an id absent from that allow-list
 * throws at boot.
 */
export const registerAttachments = (agentBuilder: AgentBuilderPluginSetup) => {
  agentBuilder.attachments.registerType(createThreatAttachmentType());
  agentBuilder.attachments.registerType(createSignificantSecurityEventAttachmentType());
  agentBuilder.attachments.registerType(createHuntCorrelationAttachmentType());
};
