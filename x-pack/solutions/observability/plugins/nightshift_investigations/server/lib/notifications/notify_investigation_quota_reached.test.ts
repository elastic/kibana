/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import {
  INVESTIGATION_QUOTA_REACHED_MESSAGE,
  getQuotaNoticeId,
  notifyInvestigationQuotaReached,
} from './notify_investigation_quota_reached';

const today = new Date().toISOString().slice(0, 10);
const noticeId = getQuotaNoticeId('C1');
const marker = (id: string, date: string) =>
  ({
    id,
    type: 'nightshift-automation-budget',
    references: [],
    version: 'v1',
    attributes: { automationId: id, date, used: 1 },
  } as never);

describe('notifyInvestigationQuotaReached', () => {
  const request = {} as KibanaRequest;
  const signal = new AbortController().signal;
  const logger = { warn: jest.fn() };

  const setup = (executeResult: object = { status: 'ok' }) => {
    const soClient = savedObjectsClientMock.create();
    soClient.get.mockRejectedValue(SavedObjectsErrorHelpers.createGenericNotFoundError());
    const execute = jest.fn().mockResolvedValue(executeResult);
    const getActions = jest.fn().mockReturnValue({
      getActionsClientWithRequestInSpace: jest.fn().mockResolvedValue({ execute }),
    });
    const run = (channel = 'C1') =>
      notifyInvestigationQuotaReached({
        getSoClient: () => soClient,
        getActions,
        request,
        spaceId: 'default',
        slackThread: { channel, thread_ts: '1700000000.000100' },
        signal,
        logger,
      });
    return { soClient, execute, getActions, run };
  };

  beforeEach(() => logger.warn.mockClear());

  it('replies in the thread through the Elastic Slack connector and claims the channel marker', async () => {
    const { soClient, execute, run } = setup();

    await run();

    expect(soClient.create).toHaveBeenCalledWith(
      'nightshift-automation-budget',
      { automationId: noticeId, date: today, used: 1 },
      { id: noticeId, overwrite: false }
    );
    expect(execute).toHaveBeenCalledWith({
      actionId: 'elastic-apps-slack',
      signal,
      params: {
        subAction: 'sendMessage',
        subActionParams: {
          channel: 'C1',
          text: INVESTIGATION_QUOTA_REACHED_MESSAGE,
          threadTs: '1700000000.000100',
        },
      },
    });
  });

  it('posts once per channel and day', async () => {
    const { soClient, execute, run } = setup();
    soClient.get.mockImplementation(async (_type, id) => {
      if (id === noticeId) return marker(id, today);
      throw SavedObjectsErrorHelpers.createGenericNotFoundError();
    });

    await run('C1');
    expect(execute).not.toHaveBeenCalled();

    await run('C2');
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          subActionParams: expect.objectContaining({ channel: 'C2' }),
        }),
      })
    );
  });

  it('posts again on a later day', async () => {
    const { soClient, execute, run } = setup();
    soClient.get.mockResolvedValue(marker(noticeId, '2020-01-01'));

    await run();

    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('logs instead of throwing when delivery fails', async () => {
    const { run } = setup({ status: 'error', serviceMessage: 'channel_not_found' });

    await expect(run()).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('channel_not_found'));
  });

  it('logs instead of throwing when the saved objects client is unavailable', async () => {
    const { getActions } = setup();

    await expect(
      notifyInvestigationQuotaReached({
        getSoClient: () => {
          throw new Error('savedObjects is not available');
        },
        getActions,
        request,
        spaceId: 'default',
        slackThread: { channel: 'C1', thread_ts: '1700000000.000100' },
        signal,
        logger,
      })
    ).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('savedObjects'));
  });

  it('logs instead of throwing when the actions plugin is unavailable', async () => {
    const { getActions, run } = setup();
    getActions.mockReturnValue(undefined);

    await expect(run()).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalled();
  });
});
