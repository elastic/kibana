/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationWithPermissions } from '@kbn/agent-builder-common';
import type { Investigation } from '@kbn/agentic-investigations-plugin/common';
import { NIGHTSHIFT_PREVIEW_INVESTIGATION_ID } from '@kbn/custom-content-renderer';

const CREATED_AT = '2026-11-04T14:00:00.000Z';
const UPDATED_AT = '2026-11-04T14:12:00.000Z';
const TITLE = 'Checkout error rate climbed after the payments deploy';
const SUMMARY =
  'Checkout is failing for a slice of payment attempts. The investigation is still running.';

/**
 * One in-progress investigation, shaped like a query-API read, for the Nightshift preview flyout.
 * Findings are partial on purpose: a subject, an impact, and one open hypothesis, with no verdict.
 */
export const previewInvestigation: Investigation = {
  id: NIGHTSHIFT_PREVIEW_INVESTIGATION_ID,
  title: TITLE,
  title_pending: false,
  created_at: CREATED_AT,
  updated_at: UPDATED_AT,
  agent_id: 'nightshift.investigation',
  metadata: {
    status: 'open',
    severity: 'high',
    summary: SUMMARY,
  },
  in_progress: true,
  subjects: [
    {
      type: 'significant_event',
      id: 'checkout-error-rate',
      summary: 'Checkout error rate climbed after the payments deploy',
      trigger_type: 'automatic',
      created_at: CREATED_AT,
    },
  ],
  impact: {
    summary: 'Card payments are failing more often since the payments service rolled out.',
    entities: [{ id: 'checkout', name: 'checkout', type: 'service' }],
    created_at: UPDATED_AT,
  },
  hypotheses: {
    hypotheses: [
      {
        candidate: 'The payments deploy started failing a slice of card charges',
        confidence: 0.62,
        status: 'investigating',
        reason: 'Checkout errors rose within a minute of the payments service rollout.',
      },
    ],
    created_at: UPDATED_AT,
  },
  proposals: [],
  pending_proposal_count: 0,
};

/** The same investigation as the conversation the details flyout loads. */
export const previewConversation: ConversationWithPermissions = {
  id: NIGHTSHIFT_PREVIEW_INVESTIGATION_ID,
  agent_id: 'nightshift.investigation',
  user: { username: 'nightshift' },
  title: TITLE,
  created_at: CREATED_AT,
  updated_at: UPDATED_AT,
  rounds: [],
  template_id: 'investigation',
  metadata: {
    status: 'open',
    severity: 'high',
    summary: SUMMARY,
  },
  permissions: {
    rename: false,
    delete: false,
    update_access_control: false,
  },
};
