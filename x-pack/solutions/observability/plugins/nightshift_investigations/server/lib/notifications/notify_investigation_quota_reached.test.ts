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
  notifyInvestigationLimitReached,
  type LimitNoticeReason,
  type LimitNoticeTarget,
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

describe('notifyInvestigationLimitReached', () => {
  const request = {} as KibanaRequest;
  const signal = new AbortController().signal;
  const logger = { warn: jest.fn() };
  const threadTarget = (channel: string): LimitNoticeTarget => ({
    connectorId: 'elastic-apps-slack',
    channel,
    threadTs: '1700000000.000100',
  });

  const setup = (executeResult: object = { status: 'ok' }, runSignal = signal) => {
    const soClient = savedObjectsClientMock.create();
    soClient.get.mockRejectedValue(SavedObjectsErrorHelpers.createGenericNotFoundError());
    const execute = jest.fn().mockResolvedValue(executeResult);
    const getActions = jest.fn().mockReturnValue({
      getActionsClientWithRequestInSpace: jest.fn().mockResolvedValue({ execute }),
    });
    const notify = (targets: LimitNoticeTarget[], reason: LimitNoticeReason) =>
      notifyInvestigationLimitReached({
        getSoClient: () => soClient,
        getActions,
        request,
        spaceId: 'default',
        targets,
        reason,
        settingsLocator,
        kibanaUrl,
        signal: runSignal,
        logger,
      });
    const run = (
      channel = 'C1',
      deniedBy: 'automatic' | 'manual' | 'all' = 'automatic',
      limit?: number
    ) => notify([threadTarget(channel)], { type: 'quota', deniedBy, limit });
    return { soClient, execute, getActions, run, notify };
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
          text: getInvestigationQuotaReachedMessage({ settingsUrl }),
          threadTs: '1700000000.000100',
        },
      },
    });
  });

  it("posts an automation's limit to its channel through its connector, with a marker per automation", async () => {
    const { soClient, execute, notify } = setup();
    const automationNoticeId = 'automation-limit-notice:a1:C2';

    await notify([{ connectorId: 'slack-connector', channel: 'C2' }], {
      type: 'automation',
      automationId: 'a1',
      automationName: 'Checkout <errors>',
      limit: 3,
    });

    expect(soClient.create).toHaveBeenCalledWith(
      'nightshift-automation-budget',
      { automationId: automationNoticeId, date: today, used: 1 },
      { id: automationNoticeId, overwrite: false }
    );
    expect(execute).toHaveBeenCalledWith({
      actionId: 'slack-connector',
      signal,
      params: {
        subAction: 'sendMessage',
        subActionParams: {
          channel: 'C2',
          text: 'The automation *Checkout &lt;errors&gt;* has reached its daily limit of 3 investigations. It resumes at 00:00 UTC, or an admin can raise the limit on the automation.',
        },
      },
    });
  });

  it('names the limit that denied the start, with its own channel marker', async () => {
    const { soClient, execute, run } = setup();

    await run('C1', 'all', 10);

    expect(soClient.create).toHaveBeenCalledWith(
      'nightshift-automation-budget',
      expect.objectContaining({ automationId: 'investigation-quota-notice:all:C1' }),
      { id: 'investigation-quota-notice:all:C1', overwrite: false }
    );
    expect(execute.mock.calls[0][0].params.subActionParams.text).toBe(
      `Elastic nightshift has reached today's limit of 10 investigations in total. New investigations resume at 00:00 UTC, or an admin can raise the limit in <${settingsUrl}|settings>.`
    );
  });

  it('links the settings page in the workflow space for an admin to follow', async () => {
    const { execute, run } = setup();

    await run('C1', undefined, 5);

    expect(settingsLocator.getRedirectUrl).toHaveBeenCalledWith(
      { tab: 'investigations' },
      { spaceId: 'default' }
    );
    const { text } = execute.mock.calls[0][0].params.subActionParams;
    expect(text).toBe(
      `Elastic nightshift has reached today's limit of 5 automatic investigations across all automations. New investigations resume at 00:00 UTC, or an admin can raise the limit in <${settingsUrl}|settings>.`
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

  it('logs a failed delivery and still posts to the other channels', async () => {
    const { execute, notify } = setup();
    execute.mockResolvedValueOnce({ status: 'error', serviceMessage: 'channel_not_found' });

    await expect(
      notify(
        [
          { connectorId: 'slack-connector', channel: 'C1' },
          { connectorId: 'slack-connector', channel: 'C2' },
        ],
        { type: 'quota', deniedBy: 'automatic' }
      )
    ).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('channel_not_found'));
    expect(execute.mock.calls.map(([{ params }]) => params.subActionParams.channel)).toEqual([
      'C1',
      'C2',
    ]);
  });

  it('claims no further channel once the run is cancelled', async () => {
    const controller = new AbortController();
    const { soClient, execute, notify } = setup(undefined, controller.signal);
    execute.mockImplementationOnce(async () => {
      controller.abort();
      return { status: 'ok' };
    });

    await notify(
      [
        { connectorId: 'slack-connector', channel: 'C1' },
        { connectorId: 'slack-connector', channel: 'C2' },
      ],
      { type: 'quota', deniedBy: 'automatic' }
    );

    expect(soClient.create).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('logs instead of throwing when the saved objects client is unavailable', async () => {
    const { getActions } = setup();

    await expect(
      notifyInvestigationLimitReached({
        getSoClient: () => {
          throw new Error('savedObjects is not available');
        },
        getActions,
        request,
        spaceId: 'default',
        targets: [threadTarget('C1')],
        reason: { type: 'quota', deniedBy: 'automatic' },
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
      "Elastic nightshift has reached today's limit for automatic investigations across all automations. New investigations resume at 00:00 UTC, or an admin can raise the limit in settings."
    );
    expect(getInvestigationQuotaReachedMessage({ limit: 1 })).toBe(
      "Elastic nightshift has reached today's limit of 1 automatic investigation across all automations. New investigations resume at 00:00 UTC, or an admin can raise the limit in settings."
    );
    expect(getInvestigationQuotaReachedMessage({ limit: 0, deniedBy: 'manual' })).toBe(
      "Elastic nightshift has reached today's limit of 0 manual investigations. New investigations stay blocked until an admin changes the limit or turns off enforcement in settings."
    );
    expect(getInvestigationQuotaReachedMessage({ limit: 5 })).toBe(
      "Elastic nightshift has reached today's limit of 5 automatic investigations across all automations. New investigations resume at 00:00 UTC, or an admin can raise the limit in settings."
    );
    expect(getInvestigationQuotaReachedMessage({ deniedBy: 'manual', limit: 1 })).toBe(
      "Elastic nightshift has reached today's limit of 1 manual investigation. New investigations resume at 00:00 UTC, or an admin can raise the limit in settings."
    );
  });
});
