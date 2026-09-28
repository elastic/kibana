/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { CortexTelemetry } from '../telemetry';
import { applyCortexEdits, optimizeCortex } from './optimize';
import type { CortexPageStore } from './page_store';

const createTelemetry = (): jest.Mocked<CortexTelemetry> => ({
  reportHydrated: jest.fn(),
  reportEditsApplied: jest.fn(),
});

describe('applyCortexEdits', () => {
  it('upserts, corroborates, and archives proposed pages', async () => {
    const store: CortexPageStore = {
      list: jest.fn().mockResolvedValue({
        pages: [],
        stats: { total: 0, established: 0, total_corroborations: 0 },
      }),
      get: jest.fn().mockResolvedValue(undefined),
      upsert: jest.fn().mockResolvedValue({}),
      corroborate: jest.fn().mockResolvedValue({}),
      archive: jest.fn().mockResolvedValue({}),
      pruneDuplicates: jest.fn().mockResolvedValue(0),
    };

    const telemetry = createTelemetry();
    await applyCortexEdits({
      store,
      telemetry,
      logger: loggerMock.create(),
      edits: [
        {
          action: 'upsert',
          entity_type: 'service',
          slug: 'checkout',
          title: 'Checkout',
          content: 'Checkout talks to Redis.',
          status: 'tentative',
        },
        {
          action: 'corroborate',
          entity_type: 'service',
          slug: 'checkout',
          title: 'Checkout',
        },
        {
          action: 'archive',
          entity_type: 'topic',
          slug: 'old-note',
          title: 'Old note',
        },
      ],
    });

    expect(store.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'service',
        slug: 'checkout',
        title: 'Checkout',
      })
    );
    expect(store.corroborate).toHaveBeenCalledWith('cortex_service_checkout');
    expect(store.archive).toHaveBeenCalledWith('cortex_topic_old-note');
    expect(telemetry.reportEditsApplied).toHaveBeenCalledWith([
      { action: 'upsert', entityType: 'service' },
      { action: 'corroborate', entityType: 'service' },
      { action: 'archive', entityType: 'topic' },
    ]);
  });

  // Pages are written one at a time, so a mid-loop failure still leaves the earlier edits in the
  // wiki. Dropping their counts would understate writes exactly when a run went wrong.
  it('reports the edits already written when a later edit throws', async () => {
    const store: CortexPageStore = {
      list: jest.fn().mockResolvedValue({
        pages: [],
        stats: { total: 0, established: 0, total_corroborations: 0 },
      }),
      get: jest.fn().mockResolvedValue(undefined),
      upsert: jest.fn().mockResolvedValue({}),
      corroborate: jest.fn().mockRejectedValue(new Error('request_timeout')),
      archive: jest.fn().mockResolvedValue({}),
      pruneDuplicates: jest.fn().mockResolvedValue(0),
    };

    const telemetry = createTelemetry();
    await expect(
      applyCortexEdits({
        store,
        telemetry,
        logger: loggerMock.create(),
        edits: [
          {
            action: 'upsert',
            entity_type: 'service',
            slug: 'checkout',
            title: 'Checkout',
            content: 'Checkout talks to Redis.',
          },
          {
            action: 'corroborate',
            entity_type: 'service',
            slug: 'checkout',
            title: 'Checkout',
          },
          {
            action: 'archive',
            entity_type: 'topic',
            slug: 'old-note',
            title: 'Old note',
          },
        ],
      })
    ).rejects.toThrow('request_timeout');

    expect(telemetry.reportEditsApplied).toHaveBeenCalledWith([
      { action: 'upsert', entityType: 'service' },
    ]);
    expect(store.archive).not.toHaveBeenCalled();
  });

  // A proposal naming a page that does not exist leaves the wiki untouched, so counting it would
  // overstate how much the optimizer actually writes.
  it('reports only the edits that changed a page', async () => {
    const store: CortexPageStore = {
      list: jest.fn().mockResolvedValue({
        pages: [],
        stats: { total: 0, established: 0, total_corroborations: 0 },
      }),
      get: jest.fn().mockResolvedValue(undefined),
      upsert: jest.fn().mockResolvedValue({}),
      corroborate: jest.fn().mockResolvedValue(undefined),
      archive: jest.fn().mockResolvedValue(undefined),
      pruneDuplicates: jest.fn().mockResolvedValue(0),
    };

    const telemetry = createTelemetry();
    await applyCortexEdits({
      store,
      telemetry,
      logger: loggerMock.create(),
      edits: [
        {
          action: 'corroborate',
          entity_type: 'service',
          slug: 'missing',
          title: 'Missing',
        },
      ],
    });

    expect(telemetry.reportEditsApplied).toHaveBeenCalledWith([]);
  });

  it('rewrites prefixed slugs onto the existing page', async () => {
    const store: CortexPageStore = {
      list: jest.fn().mockResolvedValue({
        pages: [
          {
            id: 'cortex_service_email-service',
            title: 'Email Service',
            entity_type: 'service',
            status: 'established',
            corroborations: 1,
            updated_at: '2026-09-09T12:00:00.000Z',
          },
        ],
        stats: { total: 1, established: 1, total_corroborations: 1 },
      }),
      get: jest.fn().mockResolvedValue({
        id: 'cortex_service_email-service',
        title: 'Email Service',
        entity_type: 'service',
        status: 'established',
        corroborations: 1,
        updated_at: '2026-09-09T12:00:00.000Z',
        slug: 'email-service',
        content: 'Sends mail.',
      }),
      upsert: jest.fn().mockResolvedValue({}),
      corroborate: jest.fn(),
      archive: jest.fn(),
      pruneDuplicates: jest.fn().mockResolvedValue(0),
    };

    await applyCortexEdits({
      store,
      telemetry: createTelemetry(),
      logger: loggerMock.create(),
      edits: [
        {
          action: 'upsert',
          entity_type: 'service',
          slug: 'cortex-service-email-service',
          title: 'Email Service',
          content: 'Updated.',
        },
      ],
    });

    expect(store.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: 'email-service',
        content: 'Updated.',
      })
    );
  });
});

describe('optimizeCortex', () => {
  it('applies LLM proposals from the investigation transcript', async () => {
    const store: CortexPageStore = {
      list: jest.fn().mockResolvedValue({
        pages: [],
        stats: { total: 0, established: 0, total_corroborations: 0 },
      }),
      get: jest.fn().mockResolvedValue(undefined),
      upsert: jest.fn().mockResolvedValue({}),
      corroborate: jest.fn(),
      archive: jest.fn(),
      pruneDuplicates: jest.fn().mockResolvedValue(0),
    };

    await optimizeCortex({
      store,
      telemetry: createTelemetry(),
      logger: loggerMock.create(),
      userMessage: 'Why is checkout slow?',
      assistantMessage: 'Redis lock contention on checkout.',
      proposeEdits: async () => ({
        edits: [
          {
            action: 'upsert',
            entity_type: 'service',
            slug: 'checkout',
            title: 'Checkout',
            content: 'Redis lock contention.',
            status: 'tentative',
          },
        ],
      }),
    });

    expect(store.pruneDuplicates).toHaveBeenCalled();
    expect(store.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: 'checkout',
        content: 'Redis lock contention.',
      })
    );
  });

  it('skips writes when the optimizer proposes nothing', async () => {
    const store: CortexPageStore = {
      list: jest.fn().mockResolvedValue({
        pages: [],
        stats: { total: 0, established: 0, total_corroborations: 0 },
      }),
      get: jest.fn(),
      upsert: jest.fn(),
      corroborate: jest.fn(),
      archive: jest.fn(),
      pruneDuplicates: jest.fn().mockResolvedValue(0),
    };

    const telemetry = createTelemetry();
    await optimizeCortex({
      store,
      telemetry,
      logger: loggerMock.create(),
      userMessage: 'hello',
      assistantMessage: 'nothing durable',
      proposeEdits: async () => ({ edits: [] }),
    });

    expect(store.upsert).not.toHaveBeenCalled();
    expect(telemetry.reportEditsApplied).not.toHaveBeenCalled();
  });
});
