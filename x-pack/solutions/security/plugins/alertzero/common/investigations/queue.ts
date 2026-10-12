/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProposalWithMetadata } from '@kbn/proposals-common';

export const CLOSED_GROUP_KEY = 'closed' as const;

/** The lead proposal of a queue item, with the investigation fields the approval flows read. */
export interface ProposalItem extends ProposalWithMetadata {
  conversationTitle?: string;
  conversationAgentId?: string;
  conversationAssignees: string[];
  entityIds?: string[];
}

export interface InvestigationQueueItem {
  id: string;
  title?: string;
  /** One-line card text from `metadata.description`. */
  description?: string;
  agentId?: string;
  createdAt: string;
  updatedAt: string;
  status: 'open' | 'closed';
  closeReason?: string;
  verdict?: string;
  /** User ids assigned to the investigation. Empty when unset. */
  assignees: string[];
  /** Absent when the conversation has no Impact document. */
  entityIds?: string[];
  /** The section's action category. Absent for closed investigations. */
  category?: string;
  /** Creation time of the newest proposal in the category, pending or decided. */
  newestProposalAt?: string;
  /** Pending proposals in the category. Absent for closed investigations. */
  pendingProposalCount?: number;
  /** Newest pending proposal in the category. Absent when none is pending, and for closed ones. */
  leadProposal?: ProposalWithMetadata;
}

export interface InvestigationsPageResponse {
  investigations: InvestigationQueueItem[];
  total: number;
}

export interface InvestigationsPageParams {
  size: number;
  from: number;
}

/** Rows per request. `from` walks the queue; this only bounds one page of it. */
export const MAX_QUEUE_PAGE_SIZE = 100;

/**
 * Conversations cannot be joined to proposals, so each category is resolved from at
 * most this many conversations holding pending proposals, and closed investigations
 * are read as one bounded window. It is also the deepest `from + size` a page may ask for.
 */
export const MAX_QUEUE_REACH = 1_000;

/** The window a page has to fit inside, whatever offset it starts at. */
export const fitsQueueReach = ({ size, from }: InvestigationsPageParams) =>
  from + size <= MAX_QUEUE_REACH;
