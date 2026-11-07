/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityAgentAttribution } from './entity_agent_activity_model';
import {
  relationshipAgentAttribution,
  relationshipAgentRuntimeLabel,
} from './relationship_graph_attribution';

it('describes the verified request without claiming credential delegation or human intent', () => {
  const attribution = relationshipAgentAttribution('authenticated_requester');
  expect(attribution.label).toBe('Requested agent work');
  expect(attribution.evidence).toBe('Verified requester account');
  expect(attribution.verified).toBe(true);
  expect(attribution.description).toContain('This account authenticated the request');
  expect(attribution.description).toContain(
    "does not establish credential delegation or the person's intent"
  );
});

it('distinguishes a recorded execution identity from a verified requester or owner', () => {
  const attribution = relationshipAgentAttribution('runtime_principal');
  expect(attribution.label).toBe('Agent runs as this identity');
  expect(attribution.evidence).toBe('Recorded runtime identity');
  expect(attribution.verified).toBe(true);
  expect(attribution.description).toContain(
    'does not establish who requested the work or who owns the account'
  );
});

const unverifiedAttributions: Array<{
  attribution: EntityAgentAttribution | undefined;
  label: string;
}> = [
  { attribution: 'local_account', label: 'Linked local account' },
  { attribution: 'unverified_account', label: 'Reported requester' },
  { attribution: 'entity_reference', label: 'Linked in evidence' },
  { attribution: undefined, label: 'Linked in evidence' },
];

it.each(unverifiedAttributions)(
  'does not promote $attribution evidence to an authenticated request',
  ({ attribution, label }) => {
    const result = relationshipAgentAttribution(attribution);
    expect(result.label).toBe(label);
    expect(result.verified).toBe(false);
    expect(result.evidence).not.toBe('Verified requester account');
    expect(result.label).not.toBe('Requested agent work');
  }
);

it('keeps the execution identity explicit and does not invent a missing principal', () => {
  expect(relationshipAgentRuntimeLabel('runtime@example.iam.gserviceaccount.com')).toBe(
    'Runs as runtime@example.iam.gserviceaccount.com'
  );
  expect(relationshipAgentRuntimeLabel()).toBe('Execution identity not recorded');
  expect(relationshipAgentRuntimeLabel('   ')).toBe('Execution identity not recorded');
});
