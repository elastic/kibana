/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProposalWithMetadata } from '@kbn/agentic-investigations-plugin/common';
import { MOCK_INVESTIGATIONS } from './investigations';

/** A proposal as the list API returns it: conversation title and assignees resolved on read. */
type MockProposal = ProposalWithMetadata & { conversationTitle?: string; assignees: string[] };

const INVESTIGATION_TITLES = new Map(MOCK_INVESTIGATIONS.map(({ id, title }) => [id, title]));

const SYSTEM_USER = { username: 'system.alertzero', fullName: 'AlertZero', email: null };
const ANALYST = { username: 'analyst.mrodriguez', fullName: 'M. Rodriguez', email: null };

/** Hours before (negative) or after (positive) now, as an ISO 8601 timestamp. */
const at = (hours: number): string => new Date(Date.now() + hours * 3600_000).toISOString();

/**
 * Mock proposals in the shape the proposals API returns. `conversationId` values are
 * `MOCK_INVESTIGATIONS` ids, since an investigation is its conversation — the two sample
 * sets describe one set of incidents, and `conversationTitle` is derived from that link
 * rather than restated, so the two can never disagree.
 *
 * Covers each category the catalog declares plus decided proposals for the closed group,
 * and the cases with no happy path: expired, no action to run, and a failed execution.
 */
const PROPOSALS: ProposalWithMetadata[] = [
  {
    id: 'prop-impossible-travel-revoke-001',
    spaceId: 'default',
    conversationId: 'inv-officer-impossible-travel-001',
    comment:
      'MFA satisfied from two geos in 40 minutes. Live sessions are the blast radius — revoke before mailbox rules fire.',
    actionWorkflowId: 'system-alertzero-action-revoke-sessions',
    actionInput: { user: 'cfo@corp', providers: ['okta', 'm365'] },
    status: 'pending',
    impact: 'critical',
    confidence: 'high',
    category: 'respond',
    origin: 'worker',
    expiresAt: at(4),
    createdAt: at(-0.3),
    createdBy: SYSTEM_USER,
    action: { name: 'Revoke sessions', category: 'respond', impact: 'critical' },
    expired: false,
  },
  {
    id: 'prop-sales-nas-isolate-003',
    spaceId: 'default',
    conversationId: 'inv-officer-sales-nas-002',
    comment:
      '1,431 files renamed in four minutes. Isolate the share before restoring from SNAP-7740.',
    actionWorkflowId: 'system-alertzero-action-isolate-host',
    actionInput: { host: 'Sales-NAS' },
    status: 'pending',
    impact: 'high',
    confidence: 'high',
    category: 'respond',
    origin: 'worker',
    expiresAt: at(3),
    createdAt: at(-1.2),
    createdBy: SYSTEM_USER,
    action: { name: 'Isolate host', category: 'respond', impact: 'high' },
    expired: false,
  },
  {
    // Deadline already passed. The list API does not filter expired proposals, so this
    // row still offers Approve and the API refuses it on submit.
    id: 'prop-domain-admins-remove-004',
    spaceId: 'default',
    conversationId: 'inv-floor-domain-admins-003',
    comment:
      'svc-helpdesk elevated to Domain Admins with no change ticket inside the FIN-WS-04 window.',
    actionWorkflowId: 'system-alertzero-action-revert-group-change',
    actionInput: { principal: 'svc-helpdesk', group: 'Domain Admins' },
    status: 'pending',
    impact: 'high',
    confidence: 'medium',
    category: 'respond',
    origin: 'worker',
    expiresAt: at(-0.5),
    createdAt: at(-6),
    createdBy: SYSTEM_USER,
    action: { name: 'Revert group change', category: 'respond', impact: 'high' },
    expired: true,
  },
  {
    // No action to run, so there is no action name to title the card with.
    id: 'prop-findb-egress-005',
    spaceId: 'default',
    conversationId: 'inv-floor-findb-staged-005',
    comment:
      '4.2 GB archive staged on FIN-DB-02. Nothing has left the host yet — needs a human read before anything is proposed.',
    status: 'pending',
    impact: 'medium',
    confidence: 'medium',
    category: 'investigate',
    origin: 'worker',
    createdAt: at(-2),
    createdBy: SYSTEM_USER,
    expired: false,
  },
  {
    id: 'prop-phishing-block-006',
    spaceId: 'default',
    conversationId: 'inv-floor-phishing-url-006',
    comment: 'Invoice lure URL still reachable after one credential submission — fleet block.',
    actionWorkflowId: 'system-alertzero-action-block-url',
    actionInput: { url: 'hxxps://invoice-review.example/secure' },
    status: 'pending',
    impact: 'low',
    confidence: 'high',
    category: 'investigate',
    origin: 'analyst',
    expiresAt: at(8),
    createdAt: at(-3),
    createdBy: ANALYST,
    action: { name: 'Block URL', category: 'investigate', impact: 'low' },
    expired: false,
  },
  {
    id: 'prop-oauth-tune-008',
    spaceId: 'default',
    conversationId: 'inv-floor-oauth-tune-007',
    comment:
      'Salesforce sync volume matches the expected batch window. Threshold should exclude this SaaS pattern.',
    actionWorkflowId: 'system-alertzero-action-create-rule',
    actionInput: { name: 'OAuth token volume — excluding batch window' },
    status: 'pending',
    impact: 'low',
    confidence: 'high',
    category: 'configure',
    origin: 'worker',
    createdAt: at(-4),
    createdBy: SYSTEM_USER,
    action: { name: 'Create detection rule', category: 'configure', impact: 'low' },
    expired: false,
  },
  {
    id: 'prop-mailbox-rule-removed-009',
    spaceId: 'default',
    conversationId: 'inv-hunt-mailbox-auto-008',
    comment: 'Mailbox forwarding rule added to j.reyes at 09:43 and removed on approval.',
    actionWorkflowId: 'system-alertzero-action-remove-mailbox-rule',
    actionInput: { mailbox: 'j.reyes@corp', ruleId: 'inbox-rule-7740' },
    status: 'succeeded',
    impact: 'high',
    confidence: 'high',
    category: 'respond',
    origin: 'worker',
    decidedBy: ANALYST,
    decidedAt: at(-2),
    rationale: 'Confirmed exfil rule, not user-created. Removed.',
    createdAt: at(-2.4),
    createdBy: SYSTEM_USER,
    action: { name: 'Remove mailbox rule', category: 'respond', impact: 'high' },
    expired: false,
  },
  {
    // Approved, then the workflow failed. executionError has no destination in the queue.
    id: 'prop-oauth-tune-failed-010',
    spaceId: 'default',
    conversationId: 'inv-floor-oauth-tune-007',
    comment: 'Raise the OAuth token-abuse threshold so the nightly sync stops tripping it.',
    actionWorkflowId: 'system-alertzero-action-edit-rule',
    actionInput: { ruleId: 'rule-oauth-token-abuse', threshold: 250 },
    status: 'failed',
    impact: 'medium',
    confidence: 'medium',
    category: 'configure',
    origin: 'worker',
    decidedBy: ANALYST,
    decidedAt: at(-1),
    executionError: 'rule_not_found: rule-oauth-token-abuse was deleted before execution',
    createdAt: at(-1.5),
    createdBy: SYSTEM_USER,
    action: { name: 'Edit detection rule query', category: 'configure', impact: 'medium' },
    expired: false,
  },
];

export const MOCK_PROPOSALS: MockProposal[] = PROPOSALS.map((proposal) => ({
  ...proposal,
  assignees: [],
  conversationTitle: INVESTIGATION_TITLES.get(proposal.conversationId),
}));
