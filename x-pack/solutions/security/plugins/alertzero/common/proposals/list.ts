/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProposalWithMetadata } from '@kbn/agentic-investigations-plugin/common';

export const CLOSED_GROUP_KEY = 'closed' as const;

export interface ProposalItem extends ProposalWithMetadata {
  // Absent when the server cannot read the conversation (access control, not found, etc.)
  conversationTitle?: string;
  /**
   * Agent the conversation is bound to, needed to build its Agent Builder URL. Absent under the
   * same conditions as `conversationTitle`; callers fall back to Agent Builder's legacy
   * conversation redirect, which resolves the agent itself.
   */
  conversationAgentId?: string;
  /**
   * User ids assigned to the investigation, from conversation metadata. Always an array —
   * empty when unset or the conversation is unreadable — so callers need no fallback.
   */
  conversationAssignees: string[];
}

export interface ProposalsPageResponse {
  proposals: ProposalItem[];
  total: number;
}
