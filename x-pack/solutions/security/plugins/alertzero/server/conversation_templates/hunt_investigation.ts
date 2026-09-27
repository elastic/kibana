/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { ConversationTemplate } from '@kbn/agent-builder-common';

export const HUNT_INVESTIGATION_TEMPLATE_ID = 'hunt-investigation';

/**
 * Applied to every Hunt Watch Investigation conversation
 * (`find_or_create_investigation`'s `hunt.findOrCreateInvestigation` step) so the
 * Worker branch and its children can read and write typed metadata. A separate
 * template from the platform's generic `investigation` (registered by
 * agent_builder_platform): that one has no `hunt.expectedProposalCount` /
 * `hunt.expectedProposalCountRunId` fields, and the client rejects a metadata
 * write for any field the applied template doesn't define.
 */
export const huntInvestigationTemplate: ConversationTemplate = {
  id: HUNT_INVESTIGATION_TEMPLATE_ID,
  version: 1,
  name: 'Hunt Watch Investigation',
  description: 'Applied to every Hunt Watch Investigation conversation.',
  fields: {
    status: {
      input_type: 'SELECT',
      description: 'Current Investigation status.',
      default_value: 'open',
      required: true,
      options: ['open', 'closed'],
    },
    close_reason: {
      input_type: 'SELECT',
      description: 'Reason the Investigation was closed.',
      required: false,
      options: ['benign', 'resolved'],
    },
    summary: {
      input_type: 'TEXT',
      description: 'Closure summary written by the packaging step or the gate child.',
      required: false,
      max_length: 10_000,
    },
    'hunt.expectedProposalCount': {
      input_type: 'NUMBER',
      description:
        'Count of Proposals the current run minted; the barrier a gate child checks (created >= this) before closing the Investigation.',
      required: false,
    },
    'hunt.expectedProposalCountRunId': {
      input_type: 'TEXT',
      description:
        'Run id the expectedProposalCount barrier belongs to, so a stale run cannot be read as authoritative for a newer one.',
      required: false,
    },
  },
};

export const registerHuntInvestigationTemplate = (agentBuilder: AgentBuilderPluginSetup): void => {
  agentBuilder.conversationTemplates.register(huntInvestigationTemplate);
};
