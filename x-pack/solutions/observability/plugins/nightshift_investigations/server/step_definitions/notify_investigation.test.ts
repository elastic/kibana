/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { KibanaRequest } from '@kbn/core/server';
import type { InvestigationNotification } from '../../common';
import type { GetInvestigationsClient } from '../routes/types';
import { notifyInvestigationStepDefinition } from './notify_investigation';

jest.mock('@kbn/workflows-extensions/server', () => ({
  createServerStepDefinition: jest.fn((definition) => definition),
}));

const request = {} as KibanaRequest;
const pending = {
  type: 'slack' as const,
  connector_id: 'elastic-apps-slack',
  channel: '#alerts',
  automation_name: 'Prod alerts',
};
const createContext = (signal = new AbortController().signal) =>
  ({
    input: { investigation_id: 'inv-1' },
    rawInput: { investigation_id: 'inv-1' },
    contextManager: {
      getFakeRequest: jest.fn().mockReturnValue(request),
      getContext: jest
        .fn()
        .mockReturnValue({ kibanaUrl: 'https://kibana.example.com', workflow: { spaceId: 'ops' } }),
      getScopedEsClient: jest.fn(),
      renderInputTemplate: jest.fn((value) => value),
      callKibanaApi: jest.fn(),
    },
    logger: loggerMock.create(),
    abortSignal: signal,
    stepId: 'notify_destinations',
    stepType: 'nightshift.notifyInvestigation',
  } as never);

const setup = () => {
  const record = {
    investigation_id: 'inv-1',
    title: 'Latency spike',
    status: 'completed',
    notifications: [{ ...pending }] as InvestigationNotification[],
  };
  const get = jest.fn().mockImplementation(async () => record);
  const claimNotification = jest
    .fn()
    .mockImplementation(async (_id, index: number, attemptId: string) => {
      const claim = {
        ...record.notifications[index],
        status: 'unconfirmed' as const,
        attempt_id: attemptId,
      };
      record.notifications[index] = claim;
      return claim;
    });
  const recordNotificationOutcome = jest
    .fn()
    .mockImplementation(async (_id, index: number, _attemptId, outcome) => {
      record.notifications[index] = { ...record.notifications[index], ...outcome };
    });
  const getInvestigationsClient = jest.fn().mockReturnValue({
    get,
    claimNotification,
    recordNotificationOutcome,
  }) as unknown as GetInvestigationsClient;
  const execute = jest
    .fn()
    .mockResolvedValue({ status: 'ok', actionId: pending.connector_id, data: { ts: '1.2' } });
  const getActionsClientWithRequestInSpace = jest.fn().mockResolvedValue({ execute });
  const getActions = jest.fn().mockReturnValue({ getActionsClientWithRequestInSpace });
  const definition = notifyInvestigationStepDefinition({ getInvestigationsClient, getActions });
  return {
    definition,
    record,
    get,
    claimNotification,
    recordNotificationOutcome,
    getInvestigationsClient,
    getActions,
    getActionsClientWithRequestInSpace,
    execute,
  };
};

describe('notifyInvestigationStepDefinition', () => {
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
        actionId: pending.connector_id,
        signal,
        params: expect.objectContaining({
          subActionParams: expect.objectContaining({
            channel: '#alerts',
            text: expect.stringContaining('/s/ops/app/nightshift'),
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
        claimNotification,
        recordNotificationOutcome,
        execute,
      } = setup();
      if (failure === 'unavailable') getActions.mockReturnValue(undefined);
      else getActionsClientWithRequestInSpace.mockRejectedValue(new Error('setup unavailable'));
      await expect(definition.handler(createContext())).resolves.toEqual({
        output: { sent: 0, failed: 1, unconfirmed: 0 },
      });
      expect(execute).not.toHaveBeenCalled();
      expect(claimNotification).toHaveBeenCalledTimes(1);
      expect(recordNotificationOutcome).toHaveBeenCalledWith(
        'inv-1',
        0,
        expect.any(String),
        expect.objectContaining({ status: 'failed', error: expect.stringContaining('available') })
      );
      expect(getActions.mock.invocationCallOrder[0]).toBeLessThan(
        claimNotification.mock.invocationCallOrder[0]
      );
    }
  );

  it.each(['sent', 'failed', 'unconfirmed'])(
    'skips %s destinations without resolving Actions',
    async (status) => {
      const { definition, record, getActions, claimNotification } = setup();
      record.notifications[0].status = status as InvestigationNotification['status'];
      await expect(definition.handler(createContext())).resolves.toEqual({
        output: { sent: 0, failed: 0, unconfirmed: status === 'unconfirmed' ? 1 : 0 },
      });
      expect(getActions).not.toHaveBeenCalled();
      expect(claimNotification).not.toHaveBeenCalled();
    }
  );

  it.each(['running', 'no destinations'])('returns early for %s', async (state) => {
    const { definition, record, getActions, claimNotification } = setup();
    if (state === 'running') record.status = 'running';
    else record.notifications = [];
    await expect(definition.handler(createContext())).resolves.toEqual({
      output: { sent: 0, failed: 0, unconfirmed: 0 },
    });
    expect(getActions).not.toHaveBeenCalled();
    expect(claimNotification).not.toHaveBeenCalled();
  });

  it('does not resolve Actions or claim when cancelled', async () => {
    const { definition, getActions, claimNotification } = setup();
    const controller = new AbortController();
    controller.abort();
    await expect(definition.handler(createContext(controller.signal))).resolves.toEqual({
      output: { sent: 0, failed: 0, unconfirmed: 0 },
    });
    expect(getActions).not.toHaveBeenCalled();
    expect(claimNotification).not.toHaveBeenCalled();
  });
});
