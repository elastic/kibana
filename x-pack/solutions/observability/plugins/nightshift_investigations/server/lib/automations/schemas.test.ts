/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { automationCompletionSchema, automationCompletionInputSchema } from './schemas';

describe('automation completion input', () => {
  it.each([undefined, '', '   '])(
    'requires a channel destination for Slack completion (%s)',
    (destination) => {
      expect(
        automationCompletionSchema.safeParse({
          action: 'post_to_slack',
          targetMode: 'channel',
          destination,
        }).success
      ).toBe(false);
    }
  );
  it('allows a partial update before merged validation', () => {
    expect(automationCompletionInputSchema.safeParse({ targetMode: 'channel' }).success).toBe(true);
  });
  it('matches the notification connector and destination limits', () => {
    expect(
      automationCompletionSchema.safeParse({
        action: 'post_to_slack',
        targetMode: 'channel',
        destination: 'x'.repeat(500),
        connectorId: 'x'.repeat(500),
      }).success
    ).toBe(true);
    for (const field of ['destination', 'connectorId'])
      expect(automationCompletionSchema.safeParse({ [field]: 'x'.repeat(501) }).success).toBe(
        false
      );
    expect(automationCompletionSchema.safeParse({ connectorId: '' }).success).toBe(false);
  });
  it.each(['thread', 'self'])('does not require a destination in %s mode', (targetMode) => {
    expect(
      automationCompletionSchema.safeParse({ action: 'post_to_slack', targetMode }).success
    ).toBe(true);
  });
});
