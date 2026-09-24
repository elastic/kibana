/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { KNOWLEDGE_INDICATORS_DATA_STREAM } from '../knowledge_indicators';
import { DETECTIONS_DATA_STREAM } from '../significant_events/detections';
import { EVENTS_DATA_STREAM } from '../significant_events/events';
import { SecurityError } from '../errors/security_error';
import {
  assertCanWriteKnowledgeIndicators,
  assertCanWriteSignificantEvents,
} from './assert_write_access';

// Grants write everywhere except the resource under test, so a passing assertion proves it keys off
// the right resource rather than an unrelated grant.
const buildEsClient = ({ ki = true, detections = true }: { ki?: boolean; detections?: boolean }) =>
  ({
    security: {
      hasPrivileges: jest.fn(async () => ({
        index: {
          [KNOWLEDGE_INDICATORS_DATA_STREAM]: { read: true, write: ki },
          [DETECTIONS_DATA_STREAM]: { read: true, write: detections },
          [EVENTS_DATA_STREAM]: { read: true },
        },
      })),
    },
  } as unknown as ElasticsearchClient);

describe('assertCanWriteKnowledgeIndicators', () => {
  it('resolves with knowledge indicator write access', async () => {
    await expect(
      assertCanWriteKnowledgeIndicators({
        esClient: buildEsClient({ ki: true }),
        isSecurityEnabled: true,
      })
    ).resolves.toBeUndefined();
  });

  it('throws a 403 when only knowledge indicator write is missing', async () => {
    await expect(
      assertCanWriteKnowledgeIndicators({
        esClient: buildEsClient({ ki: false, detections: true }),
        isSecurityEnabled: true,
      })
    ).rejects.toBeInstanceOf(SecurityError);
  });
});

describe('assertCanWriteSignificantEvents', () => {
  it('resolves with detections write access', async () => {
    await expect(
      assertCanWriteSignificantEvents({
        esClient: buildEsClient({ detections: true }),
        isSecurityEnabled: true,
      })
    ).resolves.toBeUndefined();
  });

  it('throws a 403 when only detections write is missing', async () => {
    await expect(
      assertCanWriteSignificantEvents({
        esClient: buildEsClient({ ki: true, detections: false }),
        isSecurityEnabled: true,
      })
    ).rejects.toBeInstanceOf(SecurityError);
  });
});
