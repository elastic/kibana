/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assertSlackChannelsEligible } from './assert_slack_channels_eligible';

const automation = {
  trigger: {
    rows: [{ kind: 'slack' as const, event: 'message' as const, channels: ['C1', 'C2'] }],
  },
  completions: [
    { action: 'post_to_slack' as const, targetMode: 'channel' as const, destination: 'C3' },
    { action: 'post_to_slack' as const, targetMode: 'self' as const, destination: 'U1' },
  ],
};

describe('assertSlackChannelsEligible', () => {
  it('checks trigger channels and channel destinations, not direct messages', async () => {
    const checkEligibility = jest.fn().mockResolvedValue([]);
    await expect(assertSlackChannelsEligible({ automation, checkEligibility })).resolves.toBe(
      undefined
    );
    expect(checkEligibility).toHaveBeenCalledWith(['C1', 'C2', 'C3']);
  });

  it('fails closed with a 503 when the check throws', async () => {
    const checkEligibility = jest.fn().mockRejectedValue(new Error('relay down'));
    await expect(
      assertSlackChannelsEligible({ automation, checkEligibility })
    ).rejects.toMatchObject({ output: { statusCode: 503 } });
  });

  it('skips the check when no channels are used', async () => {
    const checkEligibility = jest.fn();
    await assertSlackChannelsEligible({
      automation: { trigger: { rows: [] }, completions: [] },
      checkEligibility,
    });
    expect(checkEligibility).not.toHaveBeenCalled();
  });
});
