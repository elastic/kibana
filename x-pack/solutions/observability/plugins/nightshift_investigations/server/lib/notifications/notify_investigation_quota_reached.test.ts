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
  getInvestigationQuotaReachedMessage,
  getNightshiftSettingsUrl,
  getQuotaNoticeId,
  notifyInvestigationQuotaReached,
} from './notify_investigation_quota_reached';

const settingsLocator = {
  getRedirectUrl: jest.fn().mockReturnValue('/app/r?l=NIGHTSHIFT_SETTINGS_LOCATOR'),
};
const kibanaUrl = 'https://kibana.example.com';
const settingsUrl = 'https://kibana.example.com/app/r?l=NIGHTSHIFT_SETTINGS_LOCATOR';
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
        settingsLocator,
        kibanaUrl,
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
          text: getInvestigationQuotaReachedMessage(settingsUrl),
          threadTs: '1700000000.000100',
        },
      },
    });
  });

  it('links the settings page in the workflow space for an admin to follow', async () => {
    const { execute, run } = setup();

    await run();

    expect(settingsLocator.getRedirectUrl).toHaveBeenCalledWith(
      { tab: 'investigations' },
      { spaceId: 'default' }
    );
    const { text } = execute.mock.calls[0][0].params.subActionParams;
    expect(text).toBe(
      `The daily limit for automatic investigations has been reached. An admin can raise the limit in <${settingsUrl}|Nightshift settings>.`
    );
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
        settingsLocator,
        kibanaUrl,
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

describe('getNightshiftSettingsUrl', () => {
  it('leaves the link out when no Kibana URL is known or the URL is unusable', () => {
    expect(
      getNightshiftSettingsUrl({ locator: settingsLocator, spaceId: 'default' })
    ).toBeUndefined();
    expect(
      getNightshiftSettingsUrl({ locator: settingsLocator, spaceId: 'default', kibanaUrl: 'nope' })
    ).toBeUndefined();
    expect(getInvestigationQuotaReachedMessage()).toBe(
      'The daily limit for automatic investigations has been reached. An admin can raise the limit in the Nightshift settings.'
    );
  });
});
