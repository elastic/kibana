/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DeriveConversationIdsResponse } from '@kbn/pnd-common';

import { ATTACK_DISCOVERY_TITLE_MAX_LENGTH, truncateAttackDiscoveryTitle } from '.';

describe('truncateAttackDiscoveryTitle', () => {
  it('returns a short title unchanged', () => {
    expect(truncateAttackDiscoveryTitle('Lateral movement on host-a')).toBe(
      'Lateral movement on host-a'
    );
  });

  it('returns a title that is exactly at the bound unchanged', () => {
    const title = 'x'.repeat(ATTACK_DISCOVERY_TITLE_MAX_LENGTH);

    expect(truncateAttackDiscoveryTitle(title)).toBe(title);
  });

  it('clips an over-long title to the bound', () => {
    expect(truncateAttackDiscoveryTitle('x'.repeat(500))).toHaveLength(
      ATTACK_DISCOVERY_TITLE_MAX_LENGTH
    );
  });

  it('marks a clipped title with an ellipsis so it never reads as the whole title', () => {
    expect(truncateAttackDiscoveryTitle('x'.repeat(500)).endsWith('…')).toBe(true);
  });

  it('does not leave trailing whitespace in front of the ellipsis', () => {
    const kept = ATTACK_DISCOVERY_TITLE_MAX_LENGTH - 2;
    const title = `${'x'.repeat(kept)} ${'y'.repeat(50)}`;

    expect(truncateAttackDiscoveryTitle(title)).toBe(`${'x'.repeat(kept)}…`);
  });

  it('degrades a missing title to an empty string rather than throwing', () => {
    expect(truncateAttackDiscoveryTitle(undefined)).toBe('');
  });

  // The bound is the response contract's, so pin them together: widening one without the other would
  // 500 the route on a long title instead of clipping it.
  it('produces a value the response contract accepts', () => {
    const result = DeriveConversationIdsResponse.safeParse({
      attackDiscoveryMarkdown: '# Attack Discovery',
      attackDiscoveryTitle: truncateAttackDiscoveryTitle('x'.repeat(5000)),
      incidentConversationId: 'b3f2c1d0-0000-5000-8000-000000000002',
      investigationConversationId: 'b3f2c1d0-0000-5000-8000-000000000001',
    });

    expect(result.success).toBe(true);
  });
});
