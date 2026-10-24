/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationPublicClient } from '@kbn/agent-builder-server';
import { readTelemetryNotAfter } from './investigation_conversation';

const conversationsReturning = (
  metadata: Record<string, unknown> | undefined
): Pick<ConversationPublicClient, 'bulkGet'> =>
  ({
    bulkGet: async (ids: string[]) =>
      new Map(metadata === undefined ? [] : ids.map((id) => [id, { metadata }])),
  } as unknown as Pick<ConversationPublicClient, 'bulkGet'>);

describe('readTelemetryNotAfter', () => {
  it('returns the timestamp stored on the conversation', async () => {
    await expect(
      readTelemetryNotAfter(
        conversationsReturning({ telemetry_not_after: '2026-04-19T16:27:00.000Z' }),
        'inv-1'
      )
    ).resolves.toBe('2026-04-19T16:27:00.000Z');
  });

  it('returns undefined when the conversation or the field is absent', async () => {
    await expect(readTelemetryNotAfter(conversationsReturning(undefined), 'inv-1')).resolves.toBe(
      undefined
    );
    await expect(
      readTelemetryNotAfter(conversationsReturning({ telemetry_not_after: 5 }), 'inv-1')
    ).resolves.toBe(undefined);
  });
});
