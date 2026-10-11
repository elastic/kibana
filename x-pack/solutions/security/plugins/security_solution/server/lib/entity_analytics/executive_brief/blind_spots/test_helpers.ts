/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  elasticsearchServiceMock,
  httpServerMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import type { SnapshotContext } from '../snapshot/context';
import { EvidenceRegistry } from '../snapshot/evidence_registry';
import { buildTacticLookup } from './mitre_tactics';
import type { TacticLookup } from './mitre_tactics';

/** v19-style tactic set; TA0005 is "Stealth" and positions follow the managed matrix order. */
export const TEST_TACTICS = [
  { id: 'TA0001', name: 'Initial Access', position: 2 },
  { id: 'TA0002', name: 'Execution', position: 3 },
  { id: 'TA0004', name: 'Privilege Escalation', position: 5 },
  { id: 'TA0005', name: 'Stealth', position: 6 },
  { id: 'TA0006', name: 'Credential Access', position: 8 },
  { id: 'TA0008', name: 'Lateral Movement', position: 10 },
  { id: 'TA0010', name: 'Exfiltration', position: 13 },
] as const;

export const createTestLookup = (): TacticLookup => buildTacticLookup(TEST_TACTICS);

export const createTestContext = (
  overrides: Partial<SnapshotContext> = {}
): SnapshotContext & {
  esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
} => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  return {
    spaceId: 'default',
    timeRange: { from: '2026-09-08T00:00:00.000Z', to: '2026-10-08T00:00:00.000Z', range: '30d' },
    esClient,
    request: httpServerMock.createKibanaRequest(),
    logger: loggingSystemMock.createLogger(),
    abortSignal: new AbortController().signal,
    registry: new EvidenceRegistry(),
    services: {},
    ...overrides,
  } as SnapshotContext & { esClient: typeof esClient };
};
