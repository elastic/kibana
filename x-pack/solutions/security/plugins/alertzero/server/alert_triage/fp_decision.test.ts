/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  applyFpDecisions,
  buildFpDecisionKiId,
  FP_DECISION_APPROVED_TTL_MS,
  writeFpDecisionKi,
} from './fp_decision';
import { buildFpClosureSubjectKey, buildFpPatternKey } from './fp_pattern_key';

describe('fp_decision', () => {
  it('builds a stable decision KI id', () => {
    expect(buildFpDecisionKiId({ spaceId: 'default', subjectKey: 'abc' })).toBe(
      buildFpDecisionKiId({ spaceId: 'default', subjectKey: 'abc' })
    );
    expect(buildFpDecisionKiId({ spaceId: 'default', subjectKey: 'abc' })).not.toBe(
      buildFpDecisionKiId({ spaceId: 'other', subjectKey: 'abc' })
    );
  });

  it('auto-closes matching approved patterns and skips high severity', async () => {
    const ruleId = 'rule-1';
    const low = {
      _id: 'low-1',
      'process.executable': '/usr/bin/curl',
      'kibana.alert.severity': 'low',
    };
    const high = {
      _id: 'high-1',
      'process.executable': '/usr/bin/curl',
      'kibana.alert.severity': 'high',
    };
    const patternKey = buildFpPatternKey({ ruleId, alert: low });
    const subjectKey = buildFpClosureSubjectKey({ ruleId, patternKey });
    const kiId = buildFpDecisionKiId({ spaceId: 'default', subjectKey });
    const store = new Map<string, Record<string, unknown>>();

    const esClient = {
      get: async ({ id }: { id: string }) => {
        const doc = store.get(id);
        if (!doc) {
          const err = Object.assign(new Error('not found'), { statusCode: 404 });
          throw err;
        }
        return { _source: doc };
      },
      index: async ({ id, document }: { id: string; document: Record<string, unknown> }) => {
        store.set(id, document);
      },
    };

    await writeFpDecisionKi({
      esClient,
      spaceId: 'default',
      subjectKey,
      patternKey,
      ruleId,
      kind: 'approved',
      now: 1_000,
    });
    expect(store.get(kiId)?.type).toBe('security.fp_decision');
    expect(FP_DECISION_APPROVED_TTL_MS).toBeGreaterThan(0);

    const result = await applyFpDecisions({
      spaceId: 'default',
      ruleId,
      alerts: [low, high],
      esClient,
      now: 2_000,
    });
    expect(result.closeAlertIds).toEqual(['low-1']);
    expect(result.remainingAlertIds).toEqual(['high-1']);
  });
});
