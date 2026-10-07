/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import {
  hashContent,
  type VersionedAttachmentWithOrigin,
} from '@kbn/agent-builder-common/attachments';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import type { SignificantEvent } from '@kbn/significant-events-schema';
import { SIGNIFICANT_EVENT_ATTACHMENT_TYPE } from '../../../common';
import type { GetScopedClients, RouteHandlerScopedClients } from '../../routes/types';
import { createSignificantEventsServer } from '../utils/test_helpers';
import {
  createSignificantEventAttachmentType,
  formatSignificantEventAsText,
} from './significant_event_attachment_type';

const event: SignificantEvent = {
  '@timestamp': '2026-01-01T00:00:00.000Z',
  event_id: 'payment-outage',
  status: 'active',
  workflow_execution_id: 'workflow-1',
  stream_names: ['logs.payment'],
  title: 'Payment outage',
  symptom_hypothesis: 'Payment gateway timeout.',
  summary: 'Payments are failing.',
  severity: 'high',
  confidence: 0.8,
};

const createGetScopedClients = (
  events: SignificantEvent[]
): jest.MockedFunction<GetScopedClients> => {
  const findLatestByEventId = jest.fn().mockResolvedValue(events.at(-1));
  const getEventSearchClient = jest.fn(() => ({
    findLatestByEventId,
  }));

  return jest.fn().mockResolvedValue({
    getEventSearchClient,
  } as unknown as RouteHandlerScopedClients) as jest.MockedFunction<GetScopedClients>;
};

const createVersionedAttachment = (
  data: SignificantEvent
): VersionedAttachmentWithOrigin<typeof SIGNIFICANT_EVENT_ATTACHMENT_TYPE, SignificantEvent> => ({
  id: 'attachment-1',
  type: SIGNIFICANT_EVENT_ATTACHMENT_TYPE,
  origin: data.event_id,
  current_version: 1,
  versions: [
    {
      version: 1,
      data,
      created_at: '2026-01-01T00:00:00.000Z',
      content_hash: hashContent(data),
    },
  ],
});

describe('createSignificantEventAttachmentType', () => {
  it('validates a significant event payload', async () => {
    const type = createSignificantEventAttachmentType({
      logger: loggingSystemMock.createLogger(),
      getScopedClients: createGetScopedClients([]),
      server: createSignificantEventsServer({ featurePrivilege: 'read' }),
    });

    await expect(Promise.resolve(type.validate(event))).resolves.toEqual({
      valid: true,
      data: event,
    });
    await expect(
      Promise.resolve(type.validate({ title: 'Missing required fields' }))
    ).resolves.toEqual(expect.objectContaining({ valid: false }));
  });

  it('resolves the latest event by event_id', async () => {
    const updatedEvent = { ...event, status: 'inactive' as const };
    const type = createSignificantEventAttachmentType({
      logger: loggingSystemMock.createLogger(),
      getScopedClients: createGetScopedClients([event, updatedEvent]),
      server: createSignificantEventsServer({ featurePrivilege: 'read' }),
    });

    await expect(
      type.resolve?.('payment-outage', agentBuilderMocks.attachments.createResolveContextMock())
    ).resolves.toEqual(updatedEvent);
  });

  it('reports stale when the latest event differs from the stored snapshot', async () => {
    // Every events_write sets a new @timestamp; changing event_uuid alone (same timestamp)
    // cannot happen in production. Use a realistic update that bumps @timestamp.
    const updatedEvent = {
      ...event,
      status: 'inactive' as const,
      '@timestamp': '2026-01-01T00:01:00.000Z',
    };
    const type = createSignificantEventAttachmentType({
      logger: loggingSystemMock.createLogger(),
      getScopedClients: createGetScopedClients([updatedEvent]),
      server: createSignificantEventsServer({ featurePrivilege: 'read' }),
    });

    await expect(
      type.isStale?.(
        createVersionedAttachment(event),
        agentBuilderMocks.attachments.createResolveContextMock()
      )
    ).resolves.toBe(true);
  });

  it('reports stale when the latest event timestamp differs from the stored snapshot', async () => {
    const updatedEvent = { ...event, '@timestamp': '2026-01-01T00:01:00.000Z' };
    const type = createSignificantEventAttachmentType({
      logger: loggingSystemMock.createLogger(),
      getScopedClients: createGetScopedClients([updatedEvent]),
      server: createSignificantEventsServer({ featurePrivilege: 'read' }),
    });

    await expect(
      type.isStale?.(
        createVersionedAttachment(event),
        agentBuilderMocks.attachments.createResolveContextMock()
      )
    ).resolves.toBe(true);
  });

  it('does not report stale when event identity and timestamp match', async () => {
    const updatedEvent = { ...event, summary: 'Updated summary.' };
    const type = createSignificantEventAttachmentType({
      logger: loggingSystemMock.createLogger(),
      getScopedClients: createGetScopedClients([updatedEvent]),
      server: createSignificantEventsServer({ featurePrivilege: 'read' }),
    });

    await expect(
      type.isStale?.(
        createVersionedAttachment(event),
        agentBuilderMocks.attachments.createResolveContextMock()
      )
    ).resolves.toBe(false);
  });

  it('formats useful LLM text and exposes attachment metadata', async () => {
    const type = createSignificantEventAttachmentType({
      logger: loggingSystemMock.createLogger(),
      getScopedClients: createGetScopedClients([]),
      server: createSignificantEventsServer({ featurePrivilege: 'read' }),
    });

    expect(formatSignificantEventAsText(event)).toContain('Payment outage');
    expect(formatSignificantEventAsText(event)).toContain('Payment gateway timeout.');
    expect(type.isReadonly).toBe(true);
    expect(type.getTools?.()).toEqual([]);
    expect(type.getAgentDescription?.()).toContain('significant event attachment');
  });

  it('does not read an event without the Nightshift read privilege', async () => {
    const getScopedClients = createGetScopedClients([event]);
    const type = createSignificantEventAttachmentType({
      logger: loggingSystemMock.createLogger(),
      getScopedClients,
      server: createSignificantEventsServer({ featurePrivilege: 'none' }),
    });
    const context = agentBuilderMocks.attachments.createResolveContextMock();

    await expect(type.resolve?.(event.event_id, context)).resolves.toBeUndefined();
    await expect(type.isStale?.(createVersionedAttachment(event), context)).resolves.toBe(true);
    expect(getScopedClients).not.toHaveBeenCalled();
  });
});
