/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { KibanaRequest } from '@kbn/core/server';
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
const investigation = (notifications: unknown[] | undefined) => ({
  investigation_id: 'inv-1',
  title: 'Checkout latency spike',
  status: 'completed',
  summary: 'Latency rose after a deploy.',
  notifications,
});

const createContext = () =>
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
    abortSignal: new AbortController().signal,
    stepId: 'notify_destinations',
    stepType: 'nightshift.notifyInvestigation',
  } as never);

const setup = ({
  record,
  execute = jest
    .fn()
    .mockResolvedValue({ status: 'ok', actionId: 'elastic-apps-slack', data: { ts: '1.2' } }),
  actionsAvailable = true,
}: {
  record: ReturnType<typeof investigation>;
  execute?: jest.Mock;
  actionsAvailable?: boolean;
}) => {
  const get = jest.fn().mockResolvedValue(record);
  const setNotifications = jest.fn().mockResolvedValue(undefined);
  const getInvestigationsClient = jest
    .fn()
    .mockReturnValue({ get, setNotifications }) as unknown as GetInvestigationsClient;
  const getActionsClientWithRequest = jest.fn().mockResolvedValue({ execute });
  const definition = notifyInvestigationStepDefinition({
    getInvestigationsClient,
    getActions: () => (actionsAvailable ? ({ getActionsClientWithRequest } as never) : undefined),
  });
  return {
    definition,
    get,
    setNotifications,
    execute,
    getInvestigationsClient,
    getActionsClientWithRequest,
  };
};

describe('notifyInvestigationStepDefinition', () => {
  it('delivers pending destinations in the workflow space and records the results', async () => {
    const {
      definition,
      setNotifications,
      execute,
      getInvestigationsClient,
      getActionsClientWithRequest,
    } = setup({ record: investigation([pending]) });

    const result = await definition.handler(createContext());

    expect(getInvestigationsClient).toHaveBeenCalledWith(request, 'ops');
    expect(getActionsClientWithRequest).toHaveBeenCalledWith(request);
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({
        actionId: 'elastic-apps-slack',
        params: expect.objectContaining({
          subAction: 'sendMessage',
          subActionParams: expect.objectContaining({
            channel: '#alerts',
            text: expect.stringContaining(
              'https://kibana.example.com/s/ops/app/nightshift?investigationId=inv-1'
            ),
          }),
        }),
      })
    );
    expect(setNotifications).toHaveBeenCalledWith('inv-1', [
      expect.objectContaining({ ...pending, status: 'sent', message_ts: '1.2' }),
    ]);
    expect(result).toEqual({ output: { sent: 1, failed: 0 } });
  });

  it('records a failed delivery instead of throwing', async () => {
    const execute = jest.fn().mockResolvedValue({
      status: 'error',
      actionId: 'elastic-apps-slack',
      serviceMessage: 'Channel #alerts is not connected to this deployment',
    });
    const { definition, setNotifications } = setup({ record: investigation([pending]), execute });

    const result = await definition.handler(createContext());

    expect(setNotifications).toHaveBeenCalledWith('inv-1', [
      expect.objectContaining({
        status: 'failed',
        error: 'Channel #alerts is not connected to this deployment',
      }),
    ]);
    expect(result).toEqual({ output: { sent: 0, failed: 1 } });
  });

  it('is a no-op when the investigation has no pending destinations', async () => {
    const { definition, setNotifications, execute, getActionsClientWithRequest } = setup({
      record: investigation([{ ...pending, status: 'sent', message_ts: '1.1' }]),
    });

    const result = await definition.handler(createContext());

    expect(getActionsClientWithRequest).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
    expect(setNotifications).not.toHaveBeenCalled();
    expect(result).toEqual({ output: { sent: 0, failed: 0 } });
  });

  it('is a no-op when the investigation was started without destinations', async () => {
    const { definition, setNotifications } = setup({ record: investigation(undefined) });

    await expect(definition.handler(createContext())).resolves.toEqual({
      output: { sent: 0, failed: 0 },
    });
    expect(setNotifications).not.toHaveBeenCalled();
  });

  it('throws when the actions plugin is unavailable so the failure shows in the run', async () => {
    const { definition, setNotifications } = setup({
      record: investigation([pending]),
      actionsAvailable: false,
    });

    await expect(definition.handler(createContext())).rejects.toThrow(
      'actions plugin is not available'
    );
    expect(setNotifications).not.toHaveBeenCalled();
  });
});
