/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscoveryRecommendedAction, PndProposalRow } from '@kbn/pnd-common';

import { RECOMMENDED_ACTIONS_LABEL } from '../../../../pages/conversations/helpers/parse_recommended_actions';
import { PND_HITL_PROPOSAL } from '../pnd_hitl_proposal';

/** A Kibana-executable action, which is the kind that gets a toggle. */
export const PND_STAGED_ISOLATE_HOST: AttackDiscoveryRecommendedAction = {
  action_type: 'isolate_host',
  capability_ref: 'endpoint.isolate',
  execution: 'kibana_api',
  priority: 'immediate',
  rationale: 'The host is beaconing to a known C2 address.',
  targets: { alert_ids: ['alert-1'], hosts: ['host-1'], ips: [], users: [] },
  title: 'Isolate host-1',
};

/** Toggleable, but the workflow only surfaces it — it is never executed. */
export const PND_STAGED_ANALYZE_EXFIL: AttackDiscoveryRecommendedAction = {
  action_type: 'analyze_exfiltration_ips',
  capability_ref: 'threat_hunting.exfil_ips',
  execution: 'kibana_api',
  priority: 'investigation',
  rationale: 'Two destination IPs carried the bulk of the outbound bytes.',
  targets: { alert_ids: [], hosts: [], ips: ['203.0.113.7', '203.0.113.9'], users: [] },
  title: 'Analyze the exfiltration IPs',
};

/** A manual action, listed read-only with no toggle. */
export const PND_STAGED_REVOKE_USER: AttackDiscoveryRecommendedAction = {
  action_type: 'revoke_user_account',
  execution: 'manual',
  priority: 'hardening',
  rationale: 'The account authenticated from the compromised host.',
  targets: { alert_ids: [], hosts: [], ips: [], users: ['cfo@corp'] },
  title: 'Revoke the cfo@corp account',
};

export const PND_STAGED_ACTIONS: AttackDiscoveryRecommendedAction[] = [
  PND_STAGED_ISOLATE_HOST,
  PND_STAGED_ANALYZE_EXFIL,
  PND_STAGED_REVOKE_USER,
];

/**
 * The reasoning summary `watch_floor.yaml`'s `reason_incident_contained` step
 * renders: prose, the label anchor, the `| json` array, a period, then the
 * incident responder's own closing statement.
 */
export const stagedContainmentReasoning = (actions: AttackDiscoveryRecommendedAction[]): string =>
  `Approving executes ONLY the Kibana-executable actions you toggle on. ${RECOMMENDED_ACTIONS_LABEL}\n${JSON.stringify(
    actions
  )}.\nThe incident responder's own closing statement follows. The blast radius is contained to host-1.`;

/**
 * A pending `incident_contained` gate whose reasoning carries staged actions
 * behind the label anchor — the row that exercises the card's
 * **recommended-actions** branch.
 */
export const PND_HITL_CONTAINMENT_PROPOSAL: PndProposalRow = {
  ...PND_HITL_PROPOSAL,
  alwaysGate: true,
  gateId: 'incident_contained',
  message: 'Review the staged containment actions — approve to execute only what you toggle on.',
  reasoning: stagedContainmentReasoning(PND_STAGED_ACTIONS),
  recommendedAction: 'contain',
  reversible: false,
  stepId: 'await_incident_contained',
};
