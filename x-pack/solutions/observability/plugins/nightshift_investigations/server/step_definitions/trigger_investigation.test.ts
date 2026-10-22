/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { MAX_ARRAY_LENGTH, MAX_ID_LENGTH, MAX_TEXT_LENGTH } from '@kbn/significant-events-schema';
import { InvestigationQuotaDeniedError } from '../client/errors';
import type { GetInvestigationsClient } from '../routes/types';
import { triggerInvestigationStepDefinition } from './trigger_investigation';

jest.mock('@kbn/workflows-extensions/server', () => ({
  createServerStepDefinition: jest.fn((definition) => definition),
}));

const request = {} as KibanaRequest;
const createContext = (input: Record<string, unknown>) =>
  ({
    input,
    contextManager: {
      getFakeRequest: jest.fn().mockReturnValue(request),
      getContext: jest.fn().mockReturnValue({ workflow: { id: 'wf-1', spaceId: 'test-space' } }),
    },
  } as never);

const createDefinition = (start: jest.Mock, soClient = savedObjectsClientMock.create()) => {
  const getInvestigationsClient = jest
    .fn()
    .mockReturnValue({ start }) as unknown as GetInvestigationsClient;
  const getAutomationsSoClient = jest.fn().mockReturnValue(soClient);
  return {
    getAutomationsSoClient,
    definition: triggerInvestigationStepDefinition(getInvestigationsClient, getAutomationsSoClient),
    getInvestigationsClient,
  };
};

describe('triggerInvestigationStepDefinition', () => {
  it('defaults an omitted trigger type to automatic', async () => {
    const start = jest.fn().mockResolvedValue({ investigation_id: 'investigation-1' });
    const { definition } = createDefinition(start);

    await definition.handler(
      createContext({
        subject_type: 'significant_event',
        subject_id: 'event-1',
        title: 'Checkout latency breach',
      })
    );

    expect(start).toHaveBeenCalledWith(
      expect.objectContaining({
        trigger_type: 'automatic',
      })
    );
  });

  it('starts without a title, which Agent Builder generates', async () => {
    const start = jest.fn().mockResolvedValue({ investigation_id: 'investigation-1' });
    const { definition } = createDefinition(start);

    await definition.handler(
      createContext({ subject_type: 'significant_event', subject_id: 'event-1' })
    );

    expect(start).toHaveBeenCalledWith(expect.objectContaining({ title: undefined }));
  });

  it('preserves an explicit manual trigger type', async () => {
    const start = jest.fn().mockResolvedValue({ investigation_id: 'investigation-1' });
    const { definition } = createDefinition(start);

    await definition.handler(
      createContext({
        subject_type: 'significant_event',
        subject_id: 'event-1',
        title: 'Checkout latency breach',
        trigger_type: 'manual',
      })
    );

    expect(start).toHaveBeenCalledWith(
      expect.objectContaining({
        trigger_type: 'manual',
      })
    );
  });

  it('forwards an explicit prompt and source ids unchanged', async () => {
    const start = jest.fn().mockResolvedValue({ investigation_id: 'investigation-1' });
    const { definition } = createDefinition(start);

    await definition.handler(
      createContext({
        subject_type: 'significant_event',
        subject_id: 'event-1',
        title: 'Checkout latency breach',
        message: 'Checkout latency breach\n\nThe probable cause is Redis saturation.',
        source_ids: ['logs.checkout', 'metrics.checkout'],
      })
    );

    expect(start).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Checkout latency breach\n\nThe probable cause is Redis saturation.',
        source_ids: ['logs.checkout', 'metrics.checkout'],
      })
    );
  });

  it('forwards notification destinations to the client', async () => {
    const start = jest.fn().mockResolvedValue({ investigation_id: 'investigation-1' });
    const { definition } = createDefinition(start);
    const notificationDestinations = [
      {
        type: 'slack',
        connector_id: 'elastic-apps-slack',
        params: { channel: '#alerts' },
        automation_id: 'a1',
      },
    ];

    await definition.handler(
      createContext({
        subject_type: 'significant_event',
        subject_id: 'event-1',
        title: 'Checkout latency breach',
        notificationDestinations,
      })
    );

    expect(start).toHaveBeenCalledWith(expect.objectContaining({ notificationDestinations }));
  });

  it('forwards the Slack thread to the client', async () => {
    const start = jest.fn().mockResolvedValue({ investigation_id: 'investigation-1' });
    const { definition } = createDefinition(start);
    const slackThread = { workspace: 'T1', channel: 'C1', thread_ts: '1.1' };

    await definition.handler(
      createContext({
        subject_type: 'manual',
        subject_id: 'slack:C1:1.1',
        message: 'Investigate the service errors reported in this Slack thread.',
        slack_thread: slackThread,
      })
    );

    expect(start).toHaveBeenCalledWith(expect.objectContaining({ slack_thread: slackThread }));
  });

  it.each([
    ['the Relay key when it sent one', 'slack:T1:C1:1.1-relay', 'slack:T1:C1:1.1-relay'],
    ['the same key built from the thread when the Relay sent none', '', 'slack:T1:C1:1.1'],
  ])('keys a Slack thread subject by %s', async (_, externalConversationId, expectedId) => {
    const start = jest.fn().mockResolvedValue({ investigation_id: 'investigation-1' });
    const { definition } = createDefinition(start);
    const slackThread = {
      workspace: 'T1',
      channel: 'C1',
      thread_ts: '1.1',
      external_conversation_id: externalConversationId,
    };

    await definition.handler(
      createContext({
        subject_type: 'slack_thread',
        message: 'Investigate this alert.',
        slack_thread: slackThread,
      })
    );

    expect(start).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: { type: 'slack_thread', id: expectedId, summary: undefined },
        slack_thread: slackThread,
      })
    );
  });

  it('rejects a Slack thread without a workspace', async () => {
    const start = jest.fn();
    const { definition } = createDefinition(start);

    await expect(
      definition.handler(
        createContext({
          subject_type: 'manual',
          subject_id: 'slack:C1:1.1',
          message: 'Investigate the service errors reported in this Slack thread.',
          slack_thread: { workspace: '', channel: 'C1', thread_ts: '1.1' },
        })
      )
    ).rejects.toThrow();
    expect(start).not.toHaveBeenCalled();
  });

  it('rejects a destination without a connector or channel', async () => {
    const start = jest.fn();
    const { definition } = createDefinition(start);

    await expect(
      definition.handler(
        createContext({
          subject_type: 'significant_event',
          subject_id: 'event-1',
          title: 'Checkout latency breach',
          notificationDestinations: [{ type: 'slack', params: { channel: '#alerts' } }],
        })
      )
    ).rejects.toThrow();
    expect(start).not.toHaveBeenCalled();
  });

  it('rejects invalid prompt and source inputs before starting', async () => {
    const start = jest.fn();
    const { definition } = createDefinition(start);

    await expect(
      definition.handler(
        createContext({
          subject_type: 'significant_event',
          subject_id: 'event-1',
          title: 'Checkout latency breach',
          message: '',
        })
      )
    ).rejects.toThrow();
    await expect(
      definition.handler(
        createContext({
          subject_type: 'significant_event',
          subject_id: 'event-1',
          title: 'Checkout latency breach',
          source_ids: Array.from({ length: MAX_ARRAY_LENGTH + 1 }, () => 'logs.checkout'),
        })
      )
    ).rejects.toThrow();
    await expect(
      definition.handler(
        createContext({
          subject_type: 'significant_event',
          subject_id: 'event-1',
          title: 'Checkout latency breach',
          message: 'x'.repeat(MAX_TEXT_LENGTH + 1),
          source_ids: ['x'.repeat(MAX_ID_LENGTH + 1)],
        })
      )
    ).rejects.toThrow();

    expect(start).not.toHaveBeenCalled();
  });

  it('propagates a denied start without retrying', async () => {
    const error = new InvestigationQuotaDeniedError();
    const start = jest.fn().mockRejectedValue(error);
    const { definition } = createDefinition(start);

    await expect(
      definition.handler(
        createContext({
          subject_type: 'significant_event',
          subject_id: 'event-1',
          title: 'Checkout latency breach',
        })
      )
    ).rejects.toBe(error);
    expect(start).toHaveBeenCalledTimes(1);
  });
});

it('starts a manual question with a fresh subject and forwards scope and timeout', async () => {
  const start = jest.fn().mockResolvedValue({ investigation_id: 'investigation-1' });
  const { definition } = createDefinition(start);
  await definition.handler(
    createContext({
      subject_type: 'manual',
      message: 'Review checkout errors.',
      scope_query: 'service.name:checkout',
      timeout_seconds: 30,
    })
  );
  expect(start).toHaveBeenCalledWith(
    expect.objectContaining({
      subject: { type: 'manual', id: 'manual', summary: undefined },
      message: 'Review checkout errors.',
      trigger_type: 'automatic',
      context: { scope_query: 'service.name:checkout' },
      timeout_seconds: 30,
    })
  );
});

it.each([
  { subject_type: 'manual' },
  { subject_type: 'manual', message: '   ' },
  { subject_type: 'alert' },
  { subject_type: 'significant_event' },
  { subject_type: 'manual', message: 'Review', timeout_seconds: 0 },
  { subject_type: 'slack_thread', message: 'Review' },
  {
    subject_type: 'slack_thread',
    slack_thread: { workspace: 'T1', channel: 'C1', thread_ts: '1.1' },
  },
  {
    subject_type: 'slack_thread',
    subject_id: 'slack:T1:C1:1.1',
    message: 'Review',
    slack_thread: { workspace: 'T1', channel: 'C1', thread_ts: '1.1' },
  },
])('rejects an incomplete investigation before starting: %j', async (input) => {
  const start = jest.fn();
  const { definition } = createDefinition(start);
  await expect(definition.handler(createContext(input))).rejects.toThrow();
  expect(start).not.toHaveBeenCalled();
});

describe('automation budget enforcement before dispatch', () => {
  const input = { automation_id: 'a1', subject_type: 'manual', message: 'Review errors.' };
  const setup = (limit: number, used: number) => {
    const soClient = savedObjectsClientMock.create();
    soClient.get.mockImplementation(async (type, id) => ({
      id,
      type,
      references: [],
      version: 'v1',
      attributes:
        type === 'nightshift-automation'
          ? { workflowId: 'wf-1', runtime: { dailyDispatchLimit: limit } }
          : { automationId: 'a1', date: new Date().toISOString().slice(0, 10), used },
    }));
    const start = jest.fn().mockResolvedValue({ investigation_id: 'inv-1' });
    return { start, soClient, ...createDefinition(start, soClient) };
  };

  it.each(['manual', 'alert', 'significant_event'])(
    'skips %s dispatches when the limit is reached',
    async (subjectType) => {
      const { start, definition, soClient, getInvestigationsClient } = setup(2, 2);
      expect(
        await definition.handler(
          createContext({ ...input, subject_type: subjectType, subject_id: 'subject-1' })
        )
      ).toEqual({
        output: { skip_reason: 'daily_limit', daily_limit: 2 },
      });
      expect(start).not.toHaveBeenCalled();
      expect(getInvestigationsClient).not.toHaveBeenCalled();
      expect(soClient.update).not.toHaveBeenCalled();
    }
  );

  it('reserves the slot before the client starts, retaining it if the start fails', async () => {
    const { start, definition, soClient } = setup(2, 1);
    const error = new Error('Start failed');
    start.mockImplementation(async () => {
      expect(soClient.update).toHaveBeenCalledWith(
        'nightshift-automation-budget',
        'a1',
        expect.objectContaining({ used: 2 }),
        { version: 'v1' }
      );
      throw error;
    });
    await expect(definition.handler(createContext(input))).rejects.toBe(error);
    expect(soClient.update).toHaveBeenCalledTimes(1);
  });

  it('starts within the budget and leaves ordinary investigation output unchanged', async () => {
    const { definition, getAutomationsSoClient } = setup(2, 1);
    expect(await definition.handler(createContext(input))).toEqual({
      output: { investigation_id: 'inv-1' },
    });
    expect(getAutomationsSoClient).toHaveBeenCalledWith(request, 'test-space');
  });

  it('refuses to consume the budget of an automation belonging to another workflow', async () => {
    const { definition, start, soClient } = setup(2, 0);
    soClient.get.mockResolvedValueOnce({
      id: 'a1',
      type: 'nightshift-automation',
      references: [],
      attributes: { workflowId: 'another-workflow', runtime: {} },
    });
    await expect(definition.handler(createContext(input))).rejects.toThrow('does not belong');
    expect(start).not.toHaveBeenCalled();
    expect(soClient.create).not.toHaveBeenCalled();
  });

  it('does not dispatch when the owning automation was deleted or storage is unavailable', async () => {
    const { definition, start, soClient } = setup(2, 0);
    const error = SavedObjectsErrorHelpers.createGenericNotFoundError(
      'nightshift-automation',
      'a1'
    );
    soClient.get.mockRejectedValueOnce(error);
    await expect(definition.handler(createContext(input))).rejects.toBe(error);
    expect(start).not.toHaveBeenCalled();
  });
});
