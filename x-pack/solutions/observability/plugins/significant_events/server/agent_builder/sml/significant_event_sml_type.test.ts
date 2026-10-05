/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { KibanaRequest } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { SignificantEvent } from '@kbn/significant-events-schema';
import { SIGNIFICANT_EVENT_KI_TYPE } from '@kbn/agent-builder-elastic-ai-index-ki-types';
import { SIGNIFICANT_EVENT_ATTACHMENT_TYPE } from '../../../common';
import type { GetScopedClients, RouteHandlerScopedClients } from '../../routes/types';
import { RuleEventsClient } from '../../lib/significant_events/events/rule_events_client';
import { createSignificantEventSmlType } from './significant_event_sml_type';

jest.mock('../../lib/significant_events/events/rule_events_client', () => ({
  RuleEventsClient: jest.fn(),
}));

const event: SignificantEvent = {
  '@timestamp': '2026-01-01T00:00:00.000Z',
  event_id: 'payment-outage',
  workflow_execution_id: 'workflow-1',
  status: 'active',
  stream_names: ['logs.payment'],
  title: 'Payment outage',
  symptom_hypothesis: 'Payment gateway timeout.',
  summary: 'Payments are failing.',
  severity: 'high',
  confidence: 0.8,
};

const findLatestPaginated = jest.fn();
const findLatestByEventId = jest.fn();
const isAvailable = jest.fn().mockResolvedValue(true);

const asCurrentUser = {} as never;

const createGetScopedClients = (
  _events: SignificantEvent[]
): jest.MockedFunction<GetScopedClients> =>
  jest.fn().mockResolvedValue({
    scopedClusterClient: { asCurrentUser },
  } as unknown as RouteHandlerScopedClients) as jest.MockedFunction<GetScopedClients>;

describe('createSignificantEventSmlType', () => {
  beforeEach(() => {
    findLatestPaginated.mockReset();
    findLatestByEventId.mockReset();
    jest.mocked(RuleEventsClient).mockClear();
    isAvailable.mockReset().mockResolvedValue(true);
    jest
      .mocked(RuleEventsClient)
      .mockImplementation(
        () => ({ findLatestPaginated, findLatestByEventId } as unknown as RuleEventsClient)
      );
  });

  it('equals SIGNIFICANT_EVENT_KI_TYPE', () => {
    const smlType = createSignificantEventSmlType({
      getScopedClients: createGetScopedClients([]),
      isAvailable,
    });

    expect(smlType.id).toBe(SIGNIFICANT_EVENT_KI_TYPE);
  });

  it('lists significant events for SML indexing', async () => {
    findLatestPaginated.mockResolvedValue({ hits: [event] });
    const smlType = createSignificantEventSmlType({
      getScopedClients: createGetScopedClients([]),
      isAvailable,
    });

    const esClient = {} as never;
    const iterator = smlType.list({
      esClient,
      savedObjectsClient: {} as never,
      logger: loggingSystemMock.createLogger(),
    });

    await expect(iterator[Symbol.asyncIterator]().next()).resolves.toEqual({
      done: false,
      value: [
        {
          id: 'payment-outage',
          updatedAt: '2026-01-01T00:00:00.000Z',
          spaces: ['*'],
        },
      ],
    });
    expect(RuleEventsClient).toHaveBeenCalledWith({ esClient, space: DEFAULT_SPACE_ID });
    expect(findLatestPaginated).toHaveBeenCalledWith({ page: 1, perPage: 100 });
  });

  it('does not create a client when significant events are unavailable', async () => {
    isAvailable.mockResolvedValue(false);
    const smlType = createSignificantEventSmlType({
      getScopedClients: createGetScopedClients([]),
      isAvailable,
    });

    const iterator = smlType.list({
      esClient: {} as never,
      savedObjectsClient: {} as never,
      logger: loggingSystemMock.createLogger(),
    });

    await expect(iterator[Symbol.asyncIterator]().next()).resolves.toEqual({
      done: true,
      value: undefined,
    });
    expect(RuleEventsClient).not.toHaveBeenCalled();
  });

  it('indexes a significant event chunk', async () => {
    findLatestByEventId.mockResolvedValue(event);
    const smlType = createSignificantEventSmlType({
      getScopedClients: createGetScopedClients([]),
      isAvailable,
    });

    const result = await smlType.getSmlEntry('payment-outage', {
      esClient: {} as never,
      savedObjectsClient: {} as never,
      logger: loggingSystemMock.createLogger(),
    });

    expect(result).toEqual(
      expect.objectContaining({
        type: SIGNIFICANT_EVENT_KI_TYPE,
        title: 'Payment outage',
      })
    );
    expect(result).not.toHaveProperty('permissions');
    expect(result?.content).toContain('Payment gateway timeout.');
    expect(findLatestByEventId).toHaveBeenCalledWith('payment-outage');
  });

  it('getPermissions returns the streams read API privilege', () => {
    const smlType = createSignificantEventSmlType({
      getScopedClients: createGetScopedClients([]),
      isAvailable,
    });
    const permissions = smlType.getPermissions!('payment-outage', {
      esClient: {} as never,
      savedObjectsClient: {} as never,
      logger: loggingSystemMock.createLogger(),
    });
    expect(permissions).toEqual({
      kibana: { privileges: { name: [`ai_index:${SIGNIFICANT_EVENT_KI_TYPE}/read`] } },
    });
  });

  it('converts an SML document into an attachment', async () => {
    findLatestByEventId.mockResolvedValue(event);
    const smlType = createSignificantEventSmlType({
      getScopedClients: createGetScopedClients([]),
      isAvailable,
    });

    await expect(
      smlType.toAttachment(
        {
          type: SIGNIFICANT_EVENT_KI_TYPE,
          title: 'Payment outage',
          content: 'Payment outage',
          id: 'chunk-1',
          '@timestamp': '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
          references: [
            { uri: `${SIGNIFICANT_EVENT_KI_TYPE}://payment-outage`, relation: 'derived_from' },
          ],
          governance: {
            provenance: {
              created_by: { uri: 'crawler://sml', metadata: { ingestion_method: 'manual' } },
              updated_by: { uri: 'crawler://sml', metadata: { ingestion_method: 'manual' } },
            },
          },
          permissions: {
            kibana: {
              privileges: [
                {
                  space: 'default',
                  name: [`ai_index:${SIGNIFICANT_EVENT_KI_TYPE}/read`],
                  count: 1,
                },
              ],
            },
          },
        },
        {
          request: {} as KibanaRequest,
          savedObjectsClient: {} as never,
          spaceId: 'default',
        }
      )
    ).resolves.toEqual({
      type: SIGNIFICANT_EVENT_ATTACHMENT_TYPE,
      origin: 'payment-outage',
      data: event,
    });
    expect(RuleEventsClient).toHaveBeenCalledWith({
      esClient: asCurrentUser,
      space: DEFAULT_SPACE_ID,
    });
  });
});
