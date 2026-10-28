/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { MAX_ARRAY_LENGTH, MAX_ID_LENGTH, MAX_TEXT_LENGTH } from '@kbn/significant-events-schema';
import { InvestigationQuotaDeniedError } from '../client/errors';
import type { GetInvestigationsClient } from '../routes/types';
import { fetchInvestigationAlertSnapshots } from '../lib/alert_snapshot';
import { notifyInvestigationQuotaReached } from '../lib/notifications/notify_investigation_quota_reached';
import { triggerInvestigationStepDefinition } from './trigger_investigation';

jest.mock('../lib/notifications/notify_investigation_quota_reached', () => ({
  notifyInvestigationQuotaReached: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../lib/alert_snapshot', () => ({ fetchInvestigationAlertSnapshots: jest.fn() }));

jest.mock('@kbn/workflows-extensions/server', () => ({
  createServerStepDefinition: jest.fn((definition) => definition),
}));

const request = {} as KibanaRequest;
const logger = loggingSystemMock.createLogger();
const createContext = (input: Record<string, unknown>) =>
  ({
    input,
    logger,
    contextManager: {
      getFakeRequest: jest.fn().mockReturnValue(request),
      getContext: jest.fn().mockReturnValue({
        workflow: { id: 'wf-1', spaceId: 'test-space' },
        kibanaUrl: 'https://kibana.example.com',
      }),
    },
  } as never);

const createDefinition = (start: jest.Mock, soClient = savedObjectsClientMock.create()) => {
  const getInvestigationsClient = jest
    .fn()
    .mockReturnValue({ start }) as unknown as GetInvestigationsClient;
  const getAutomationsSoClient = jest.fn().mockReturnValue(soClient);
  const getAlertsClient = jest.fn().mockResolvedValue({});
  const getEpisodeLookup = jest.fn().mockReturnValue({ spaceId: 'test-space' });
  const getActions = jest.fn().mockReturnValue(undefined);
  const settingsLocator = { getRedirectUrl: jest.fn() } as never;
  return {
    getAutomationsSoClient,
    getAlertsClient,
    getEpisodeLookup,
    definition: triggerInvestigationStepDefinition(
      getInvestigationsClient,
      getAutomationsSoClient,
      getAlertsClient,
      getEpisodeLookup,
      getActions,
      settingsLocator
    ),
    getActions,
    getInvestigationsClient,
  };
};

describe('triggerInvestigationStepDefinition', () => {
  describe('alert subjects', () => {
    const snapshots = [{ alert_version: 'v2', id: 'episode-1' }];

    it('resolves the alert by id when the step carries no alerts, in the workflow space', async () => {
      (fetchInvestigationAlertSnapshots as jest.Mock).mockResolvedValue(snapshots);
      const start = jest.fn().mockResolvedValue({ investigation_id: 'investigation-1' });
      const { definition, getEpisodeLookup } = createDefinition(start);

      await definition.handler(
        createContext({
          subject_type: 'alert',
          subject_id: 'episode-1',
          telemetry_target: 'orca',
        })
      );

      expect(getEpisodeLookup).toHaveBeenCalledWith(request, 'test-space');
      expect(fetchInvestigationAlertSnapshots).toHaveBeenCalledWith(
        expect.objectContaining({ alertIds: ['episode-1'] })
      );
      expect(start).toHaveBeenCalledWith(
        expect.objectContaining({ context: { alerts: snapshots }, telemetry_target: 'orca' }),
        expect.anything()
      );
    });

    it('keeps the caller-provided alerts without looking anything up', async () => {
      (fetchInvestigationAlertSnapshots as jest.Mock).mockClear();
      const start = jest.fn().mockResolvedValue({ investigation_id: 'investigation-1' });
      const { definition } = createDefinition(start);
      const context = { alerts: [{ id: 'alert-1' }] };

      await definition.handler(
        createContext({ subject_type: 'alert', subject_id: 'alert-1', context })
      );

      expect(fetchInvestigationAlertSnapshots).not.toHaveBeenCalled();
      expect(start).toHaveBeenCalledWith(expect.objectContaining({ context }), expect.anything());
    });
  });

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
      }),
      expect.anything()
    );
  });

  it('starts without a title, which Agent Builder generates', async () => {
    const start = jest.fn().mockResolvedValue({ investigation_id: 'investigation-1' });
    const { definition } = createDefinition(start);

    await definition.handler(
      createContext({ subject_type: 'significant_event', subject_id: 'event-1' })
    );

    expect(start).toHaveBeenCalledWith(
      expect.objectContaining({ title: undefined }),
      expect.anything()
    );
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
      }),
      expect.anything()
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
      }),
      expect.anything()
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

    expect(start).toHaveBeenCalledWith(
      expect.objectContaining({ notificationDestinations }),
      expect.anything()
    );
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

    expect(start).toHaveBeenCalledWith(
      expect.objectContaining({ slack_thread: slackThread }),
      expect.anything()
    );
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
      }),
      expect.anything()
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

  it('skips a start denied by the global limit without retrying', async () => {
    const start = jest.fn().mockRejectedValue(new InvestigationQuotaDeniedError());
    const { definition } = createDefinition(start);

    expect(
      await definition.handler(
        createContext({
          subject_type: 'significant_event',
          subject_id: 'event-1',
          title: 'Checkout latency breach',
        })
      )
    ).toEqual({ output: { skip_reason: 'investigation_limit' } });
    expect(start).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith(
      'Skipped investigation of significant_event/event-1: global investigation limit reached'
    );
  });
});

describe('investigation quota notice', () => {
  const slackThread = { workspace: 'W1', channel: 'C1', thread_ts: '1700000000.000100' };
  const slackInput = {
    subject_type: 'slack_thread',
    slack_thread: slackThread,
    message: 'Check this.',
  };

  beforeEach(() => jest.mocked(notifyInvestigationQuotaReached).mockClear());

  it('tells the Slack thread when the global limit denies the start', async () => {
    const error = new InvestigationQuotaDeniedError();
    const soClient = savedObjectsClientMock.create();
    const { definition, getActions } = createDefinition(
      jest.fn().mockRejectedValue(error),
      soClient
    );

    expect(await definition.handler(createContext(slackInput))).toEqual({
      output: { skip_reason: 'investigation_limit' },
    });

    const [params] = jest.mocked(notifyInvestigationQuotaReached).mock.calls[0];
    expect(params).toEqual(
      expect.objectContaining({
        getActions,
        spaceId: 'test-space',
        slackThread,
        kibanaUrl: 'https://kibana.example.com',
      })
    );
    expect(params.getSoClient()).toBe(soClient);
  });

  it.each([
    ['an alert', { subject_type: 'alert', subject_id: 'alert-1', context: { alerts: [] } }],
    ['a manual question', { subject_type: 'manual', message: 'Review errors.' }],
  ])('does not post for %s', async (_name, input) => {
    const error = new InvestigationQuotaDeniedError();
    const { definition } = createDefinition(jest.fn().mockRejectedValue(error));

    expect(await definition.handler(createContext(input))).toEqual({
      output: { skip_reason: 'investigation_limit' },
    });

    expect(notifyInvestigationQuotaReached).not.toHaveBeenCalled();
  });

  it('does not post for other start failures', async () => {
    const error = new Error('boom');
    const { definition } = createDefinition(jest.fn().mockRejectedValue(error));

    await expect(definition.handler(createContext(slackInput))).rejects.toBe(error);

    expect(notifyInvestigationQuotaReached).not.toHaveBeenCalled();
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
    }),
    expect.anything()
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
      const { start, definition, soClient } = setup(2, 2);
      start.mockImplementation(async (_request, { automationBudget }) => {
        await automationBudget.consume();
        return { investigation_id: 'inv-1' };
      });
      expect(
        await definition.handler(
          createContext({ ...input, subject_type: subjectType, subject_id: 'subject-1' })
        )
      ).toEqual({
        output: { skip_reason: 'daily_limit', daily_limit: 2 },
      });
      expect(soClient.update).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('for automation a1: daily limit of 2 reached')
      );
    }
  );

  it('charges the budget only when the client opens a new investigation', async () => {
    const { start, definition, soClient } = setup(2, 1);
    start.mockImplementation(async (_request, { automationBudget }) => {
      await automationBudget.consume();
      expect(soClient.update).toHaveBeenCalledWith(
        'nightshift-automation-budget',
        'a1',
        expect.objectContaining({ used: 2 }),
        { version: 'v1' }
      );
      return { investigation_id: 'inv-1' };
    });
    await definition.handler(createContext(input));
    expect(soClient.update).toHaveBeenCalledTimes(1);
  });

  it('does not charge the budget when the client continues an open investigation', async () => {
    const { definition, soClient } = setup(2, 2);
    expect(await definition.handler(createContext(input))).toEqual({
      output: { investigation_id: 'inv-1' },
    });
    expect(soClient.update).not.toHaveBeenCalled();
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
