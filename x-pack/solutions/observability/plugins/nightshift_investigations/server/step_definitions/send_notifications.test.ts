/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { decompressFromBase64 } from 'lz-string';
import { MockUrlService } from '@kbn/share-plugin/common/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { KibanaRequest } from '@kbn/core/server';
import {
  InvestigationLocatorDefinition,
  NIGHTSHIFT_INVESTIGATION_LOCATOR_ID,
} from '../../common/locators';
import type { InvestigationNotification } from '../../common';
import type { GetInvestigationsClient } from '../routes/types';
import { sendNotificationsStepDefinition } from './send_notifications';

jest.mock('@kbn/workflows-extensions/server', () => ({
  createServerStepDefinition: jest.fn((definition) => definition),
}));

const request = {} as KibanaRequest;
const notificationDestination = {
  type: 'slack' as const,
  connector_id: 'elastic-apps-slack',
  params: { channel: '#alerts' },
  automation_name: 'Prod alerts',
};
const createContext = (
  signal = new AbortController().signal,
  spaceId = 'ops',
  kibanaUrl = 'https://kibana.example.com',
  investigationId = 'inv-1'
) =>
  ({
    input: { investigation_id: investigationId },
    rawInput: { investigation_id: investigationId },
    contextManager: {
      getFakeRequest: jest.fn().mockReturnValue(request),
      getContext: jest.fn().mockReturnValue({ kibanaUrl, workflow: { spaceId } }),
      getScopedEsClient: jest.fn(),
      renderInputTemplate: jest.fn((value) => value),
      callKibanaApi: jest.fn(),
    },
    logger: loggerMock.create(),
    abortSignal: signal,
    stepId: 'notify_destinations',
    stepType: 'nightshift.sendNotifications',
  } as never);

const setup = () => {
  const record = {
    investigation_id: 'inv-1',
    title: 'Latency spike',
    status: 'completed',
    notificationDestinations: [{ ...notificationDestination }],
    notifications: [] as InvestigationNotification[],
  };
  const get = jest.fn().mockImplementation(async () => record);
  const claimNotificationDestination = jest
    .fn()
    .mockImplementation(async (_id, index: number, attemptId: string) => {
      const claim = {
        destination_index: index,
        attempted_at: new Date().toISOString(),
        status: 'unconfirmed' as const,
        attempt_id: attemptId,
      };
      record.notifications.push(claim);
      return claim;
    });
  const recordNotificationOutcome = jest
    .fn()
    .mockImplementation(async (_id, destinationIndex: number, attemptId: string, outcome) => {
      const notificationIndex = record.notifications.findIndex(
        ({ destination_index, attempt_id }) =>
          destination_index === destinationIndex && attempt_id === attemptId
      );
      record.notifications[notificationIndex] = {
        ...record.notifications[notificationIndex],
        ...outcome,
      };
    });
  const getInvestigationsClient = jest.fn().mockReturnValue({
    get,
    claimNotificationDestination,
    recordNotificationOutcome,
  }) as unknown as GetInvestigationsClient;
  const execute = jest.fn().mockResolvedValue({
    status: 'ok',
    actionId: notificationDestination.connector_id,
    data: { ts: '1.2' },
  });
  const getActionsClientWithRequestInSpace = jest.fn().mockResolvedValue({ execute });
  const getActions = jest.fn().mockReturnValue({ getActionsClientWithRequestInSpace });
  const investigationLocator = new MockUrlService().locators.create(
    new InvestigationLocatorDefinition()
  );
  const definition = sendNotificationsStepDefinition({
    investigationLocator,
    getInvestigationsClient,
    getActions,
  });
  return {
    definition,
    investigationLocator,
    record,
    get,
    claimNotificationDestination,
    recordNotificationOutcome,
    getInvestigationsClient,
    getActions,
    getActionsClientWithRequestInSpace,
    execute,
  };
};

describe('sendNotificationsStepDefinition', () => {
  it.each([
    ['default', '/app/r'],
    ['ops', '/s/ops/app/r'],
  ])(
    'sends a locator link in the %s space with the correct investigation',
    async (spaceId, path) => {
      const { definition, record, execute } = setup();
      record.investigation_id = 'inv/test?id=1&name=a';
      const context = createContext(
        new AbortController().signal,
        spaceId,
        'https://kibana.example.com',
        record.investigation_id
      );
      await definition.handler(context);
      const text = execute.mock.calls[0][0].params.subActionParams.text as string;
      const link = text.match(/<([^|]+)\|Open the investigation in Kibana>/)?.[1];
      expect(link).toBeDefined();
      const url = new URL(link ?? '');
      expect(url.origin).toBe('https://kibana.example.com');
      expect(url.pathname).toBe(path);
      expect(url.searchParams.get('l')).toBe(NIGHTSHIFT_INVESTIGATION_LOCATOR_ID);
      expect(JSON.parse(decompressFromBase64(url.searchParams.get('lz') ?? ''))).toEqual({
        investigationId: record.investigation_id,
      });
    }
  );

  it.each([
    [
      '/kibana/s/ops/app/r?l=investigation',
      'https://kibana.example.com/kibana/s/ops/app/r?l=investigation',
    ],
    [
      'https://public.example.com/kibana/s/ops/app/r?l=investigation',
      'https://public.example.com/kibana/s/ops/app/r?l=investigation',
    ],
  ])(
    'preserves the locator base path and public origin for %s',
    async (redirectUrl, expectedUrl) => {
      const { definition, investigationLocator, execute } = setup();
      jest.spyOn(investigationLocator, 'getRedirectUrl').mockReturnValue(redirectUrl);
      await definition.handler(createContext());
      expect(execute.mock.calls[0][0].params.subActionParams.text).toContain(expectedUrl);
    }
  );

  it('uses the workflow authentication and non-default space for saved connectors', async () => {
    const {
      definition,
      execute,
      getInvestigationsClient,
      getActionsClientWithRequestInSpace,
      recordNotificationOutcome,
    } = setup();
    const signal = new AbortController().signal;
    await expect(definition.handler(createContext(signal))).resolves.toEqual({
      output: { sent: 1, failed: 0, unconfirmed: 0 },
    });
    expect(getInvestigationsClient).toHaveBeenCalledWith(request, 'ops');
    expect(getActionsClientWithRequestInSpace).toHaveBeenCalledWith(request, 'ops');
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({
        actionId: notificationDestination.connector_id,
        signal,
        params: expect.objectContaining({
          subActionParams: expect.objectContaining({
            channel: '#alerts',
            text: expect.stringContaining('https://kibana.example.com/s/ops/app/r?'),
          }),
        }),
      })
    );
    expect(recordNotificationOutcome).toHaveBeenCalledWith(
      'inv-1',
      0,
      expect.any(String),
      expect.objectContaining({ status: 'sent', message_ts: '1.2' })
    );
  });

  it.each(['unavailable', 'throws'])(
    'persists failed results when Actions setup %s',
    async (failure) => {
      const {
        definition,
        getActions,
        getActionsClientWithRequestInSpace,
        claimNotificationDestination,
        recordNotificationOutcome,
        execute,
      } = setup();
      if (failure === 'unavailable') getActions.mockReturnValue(undefined);
      else getActionsClientWithRequestInSpace.mockRejectedValue(new Error('setup unavailable'));
      await expect(definition.handler(createContext())).resolves.toEqual({
        output: { sent: 0, failed: 1, unconfirmed: 0 },
      });
      expect(execute).not.toHaveBeenCalled();
      expect(claimNotificationDestination).toHaveBeenCalledTimes(1);
      expect(recordNotificationOutcome).toHaveBeenCalledWith(
        'inv-1',
        0,
        expect.any(String),
        expect.objectContaining({ status: 'failed', error: expect.stringContaining('available') })
      );
      expect(getActions.mock.invocationCallOrder[0]).toBeLessThan(
        claimNotificationDestination.mock.invocationCallOrder[0]
      );
    }
  );

  it.each(['sent', 'failed', 'unconfirmed'])(
    'skips %s destinations without resolving Actions',
    async (status) => {
      const { definition, record, getActions, claimNotificationDestination } = setup();
      record.notifications = [
        {
          destination_index: 0,
          attempt_id: 'a',
          attempted_at: '2026-10-02T00:00:00.000Z',
          status: status as InvestigationNotification['status'],
        },
      ];
      await expect(definition.handler(createContext())).resolves.toEqual({
        output: { sent: 0, failed: 0, unconfirmed: status === 'unconfirmed' ? 1 : 0 },
      });
      expect(getActions).not.toHaveBeenCalled();
      expect(claimNotificationDestination).not.toHaveBeenCalled();
    }
  );

  it.each(['running', 'no destinations'])('returns early for %s', async (state) => {
    const { definition, record, getActions, claimNotificationDestination } = setup();
    if (state === 'running') record.status = 'running';
    else record.notificationDestinations = [];
    await expect(definition.handler(createContext())).resolves.toEqual({
      output: { sent: 0, failed: 0, unconfirmed: 0 },
    });
    expect(getActions).not.toHaveBeenCalled();
    expect(claimNotificationDestination).not.toHaveBeenCalled();
  });

  it('does not resolve Actions or claim when cancelled', async () => {
    const { definition, getActions, claimNotificationDestination } = setup();
    const controller = new AbortController();
    controller.abort();
    await expect(definition.handler(createContext(controller.signal))).resolves.toEqual({
      output: { sent: 0, failed: 0, unconfirmed: 0 },
    });
    expect(getActions).not.toHaveBeenCalled();
    expect(claimNotificationDestination).not.toHaveBeenCalled();
  });
});
