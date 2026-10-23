/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import {
  assertSlackChannelsEligible,
  collectAutomationSlackChannels,
} from './assert_slack_channels_eligible';

const request = httpServerMock.createKibanaRequest();
const automation = {
  trigger: {
    rows: [{ kind: 'slack' as const, event: 'message' as const, channels: ['C1', 'C2'] }],
  },
  completions: [
    { action: 'post_to_slack' as const, targetMode: 'channel' as const, destination: 'C3' },
  ],
};

describe('collectAutomationSlackChannels', () => {
  it('gathers trigger channels and channel-mode post destinations', () => {
    expect(collectAutomationSlackChannels(automation)).toEqual(['C1', 'C2', 'C3']);
  });

  it('ignores direct-message destinations', () => {
    expect(
      collectAutomationSlackChannels({
        trigger: { rows: [] },
        completions: [{ action: 'post_to_slack', targetMode: 'self', destination: 'U1' }],
      })
    ).toEqual([]);
  });
});

describe('assertSlackChannelsEligible', () => {
  it('passes when nothing is ineligible', async () => {
    const checkEligibility = jest.fn().mockResolvedValue([]);
    await expect(
      assertSlackChannelsEligible({ request, automation, checkEligibility })
    ).resolves.toBeUndefined();
    expect(checkEligibility).toHaveBeenCalledWith(request, ['C1', 'C2', 'C3']);
  });

  it('rejects private channels with a 400 that lists their ids', async () => {
    const checkEligibility = jest.fn().mockResolvedValue(['C2']);
    await expect(
      assertSlackChannelsEligible({ request, automation, checkEligibility })
    ).rejects.toMatchObject({
      output: { statusCode: 400 },
      message: expect.stringContaining('C2'),
    });
  });

  it('fails closed with a 503 when the check throws', async () => {
    const checkEligibility = jest.fn().mockRejectedValue(new Error('relay down'));
    await expect(
      assertSlackChannelsEligible({ request, automation, checkEligibility })
    ).rejects.toMatchObject({ output: { statusCode: 503 } });
  });

  it('skips the check when no channels are used', async () => {
    const checkEligibility = jest.fn();
    await assertSlackChannelsEligible({
      request,
      automation: { trigger: { rows: [] }, completions: [] },
      checkEligibility,
    });
    expect(checkEligibility).not.toHaveBeenCalled();
  });
});
