/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InvalidNotificationDestinationError } from '../client/errors';
import { startInvestigationRoute } from './start_investigation';

const { handler, params } = startInvestigationRoute['POST /internal/nightshift/investigations'];

const schema = params.shape.body;

const alert = {
  'kibana.alert.uuid': 'alert-1',
  'kibana.alert.rule.uuid': 'rule-1',
  'kibana.alert.rule.name': 'Test rule',
  'kibana.alert.rule.rule_type_id': 'test.rule',
  'kibana.alert.rule.category': 'Test category',
  'kibana.alert.reason': 'Threshold exceeded',
  'kibana.alert.status': 'active',
  'kibana.alert.start': '2026-09-02T10:00:00.000Z',
};

const start = jest.fn().mockResolvedValue({ investigation_id: 'investigation-1' });
const getInvestigationsClient = jest.fn().mockReturnValue({ start });
const getAlertsClient = jest.fn().mockResolvedValue({
  getAuthorizedAlertsIndices: jest.fn().mockResolvedValue(['.alerts-observability.test']),
  find: jest.fn().mockResolvedValue({ hits: { hits: [{ _source: alert }] } }),
});

const getEpisodeLookup = jest.fn().mockReturnValue({});

beforeEach(() => jest.clearAllMocks());

it('loads the alert and builds the investigation context server-side', async () => {
  await expect(
    handler({
      request: {},
      getInvestigationsClient,
      getAlertsClient,
      getEpisodeLookup,
      params: { body: { subject: { type: 'alert', ids: ['alert-1'] } } },
    } as never)
  ).resolves.toEqual({ investigation_id: 'investigation-1' });
  // Agent Builder titles the investigation, so no title is derived from the rule name.
  expect(start).toHaveBeenCalledWith({
    subject: { type: 'alert', id: 'alert-1' },
    title: undefined,
    context: { alerts: [expect.objectContaining({ id: 'alert-1', rule_id: 'rule-1' })] },
    trigger_type: 'manual',
  });
});

it('loads every alert id and stores the first as the subject', async () => {
  const find = jest.fn().mockResolvedValue({
    hits: { hits: [{ _source: alert }, { _source: { ...alert, 'kibana.alert.uuid': 'alert-2' } }] },
  });
  const alertsClient = {
    getAuthorizedAlertsIndices: jest.fn().mockResolvedValue(['.alerts-observability.test']),
    find,
  };
  await handler({
    request: {},
    getInvestigationsClient,
    getAlertsClient: jest.fn().mockResolvedValue(alertsClient),
    getEpisodeLookup,
    params: { body: { subject: { type: 'alert', ids: ['alert-1', 'alert-2', 'alert-1'] } } },
  } as never);
  expect(find).toHaveBeenCalledTimes(1);
  expect(start).toHaveBeenCalledWith(
    expect.objectContaining({
      subject: { type: 'alert', id: 'alert-1', summary: undefined },
      context: {
        alerts: [
          expect.objectContaining({ id: 'alert-1' }),
          expect.objectContaining({ id: 'alert-2' }),
        ],
      },
    })
  );
});

it('requires at least one alert id', () => {
  expect(schema.safeParse({ subject: { type: 'alert', ids: [] } }).success).toBe(false);
});

it('passes a caller-provided title on', async () => {
  await handler({
    request: {},
    getInvestigationsClient,
    getAlertsClient,
    getEpisodeLookup,
    params: { body: { subject: { type: 'alert', ids: ['alert-1'] }, title: 'Custom title' } },
  } as never);
  expect(start).toHaveBeenCalledWith(expect.objectContaining({ title: 'Custom title' }));
});

it('no longer accepts a concurrency key', () => {
  expect(
    schema.safeParse({ subject: { type: 'alert', ids: ['alert-1'] }, concurrency_key: 'key-1' })
      .success
  ).toBe(true);
  expect(
    schema.parse({ subject: { type: 'alert', ids: ['alert-1'] }, concurrency_key: 'key-1' })
  ).not.toHaveProperty('concurrency_key');
});

it('forwards connector_id for an alert investigation', async () => {
  await handler({
    request: {},
    getInvestigationsClient,
    getAlertsClient,
    getEpisodeLookup,
    params: {
      body: {
        subject: { type: 'alert', ids: ['alert-1'] },
        connector_id: 'custom-model',
      },
    },
  } as never);
  expect(start).toHaveBeenCalledWith(expect.objectContaining({ connector_id: 'custom-model' }));
});

it('starts a manual investigation from the question alone', async () => {
  const body = schema.parse({
    subject: { type: 'manual' },
    message: 'Why did checkout p99 spike?',
  });

  await handler({
    request: {},
    getInvestigationsClient,
    getAlertsClient,
    getEpisodeLookup,
    params: { body },
  } as never);

  // Agent Builder titles the investigation, so the question is not made its title.
  expect(start).toHaveBeenCalledWith({
    subject: { type: 'manual', id: 'manual' },
    message: 'Why did checkout p99 spike?',
    trigger_type: 'manual',
  });
});

it('forwards connector_id for a manual investigation', async () => {
  const body = schema.parse({
    subject: { type: 'manual' },
    message: 'Why did checkout p99 spike?',
    connector_id: 'custom-model',
  });

  await handler({
    request: {},
    getInvestigationsClient,
    getAlertsClient,
    getEpisodeLookup,
    params: { body },
  } as never);

  expect(start).toHaveBeenCalledWith(expect.objectContaining({ connector_id: 'custom-model' }));
});

it('passes a manual investigation title on only when the caller gives one', async () => {
  const explicit = schema.parse({
    subject: { type: 'manual' },
    title: 'Checkout p99 spike',
    message: 'Why did checkout p99 spike?',
  });
  await handler({
    request: {},
    getInvestigationsClient,
    getAlertsClient,
    getEpisodeLookup,
    params: { body: explicit },
  } as never);
  expect(start).toHaveBeenLastCalledWith(expect.objectContaining({ title: 'Checkout p99 spike' }));
});

it('rejects a manual investigation without a question', () => {
  expect(schema.safeParse({ subject: { type: 'manual' } }).success).toBe(false);
});

it('returns service unavailable when alert lookup is not wired', async () => {
  await expect(
    handler({
      request: {},
      getInvestigationsClient,
      getAlertsClient: () => undefined,
      params: { body: { subject: { type: 'alert', ids: ['alert-1'] } } },
    } as never)
  ).rejects.toMatchObject({ output: { statusCode: 503 } });
});

it.each(['alert', 'manual'])(
  'validates and forwards destination-only notificationDestinations for %s starts',
  async (type) => {
    const destination = { type: 'slack', connector_id: 'slack', params: { channel: '#alerts' } };
    const input = {
      subject: type === 'alert' ? { type, ids: ['alert-1'] } : { type, id: 'alert-1' },
      message: 'Investigate',
      notificationDestinations: [destination],
    };
    const body = schema.parse(input);
    await handler({
      request: {},
      getInvestigationsClient,
      getAlertsClient,
      getEpisodeLookup,
      params: { body },
    } as never);
    expect(start).toHaveBeenCalledWith(
      expect.objectContaining({ notificationDestinations: [destination] })
    );
    expect(
      schema.safeParse({ ...input, notificationDestinations: [{ ...destination, status: 'sent' }] })
        .success
    ).toBe(false);
    expect(
      schema.safeParse({ ...input, notificationDestinations: Array(5).fill(destination) }).success
    ).toBe(true);
    expect(
      schema.safeParse({ ...input, notificationDestinations: Array(6).fill(destination) }).success
    ).toBe(false);
  }
);

it('returns bad request for runtime notification validation failures', async () => {
  start.mockRejectedValueOnce(
    new InvalidNotificationDestinationError('Unsupported notification type')
  );
  await expect(
    handler({
      request: {},
      getInvestigationsClient,
      getAlertsClient,
      getEpisodeLookup,
      params: {
        body: schema.parse({
          subject: { type: 'manual' },
          message: 'Investigate',
          notificationDestinations: [{ type: 'unsupported', connector_id: 'c', params: {} }],
        }),
      },
    } as never)
  ).rejects.toMatchObject({ output: { statusCode: 400 } });
});
