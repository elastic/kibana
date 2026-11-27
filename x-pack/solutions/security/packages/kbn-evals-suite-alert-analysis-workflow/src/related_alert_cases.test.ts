/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { parse } from 'yaml';
import { SECURITY_ALERT_ANALYSIS_WORKFLOW } from '@kbn/workflows/managed';
import {
  RELATED_ALERT_CASES,
  MIN_ENTITY_SCORE,
  buildRelatedAlertDoc,
  nestEntityFields,
} from './related_alert_cases';
import { CLASSIFICATIONS } from './constants';
import { classificationAccuracy, validVerdict } from './evaluators';

interface EntityField {
  field: string;
  score: number;
  aliases?: Array<{ field: string; score: number }>;
}

interface GraphStep {
  name: string;
  type?: string;
  with?: {
    entity_fields: EntityField[];
    min_entity_score: number;
    ignore_entities: Array<{ field: string; values: string[] }>;
  };
  steps?: GraphStep[];
}

const findStep = (steps: GraphStep[], name: string): GraphStep | undefined => {
  for (const step of steps) {
    if (step.name === name) return step;
    const nested = step.steps && findStep(step.steps, name);
    if (nested) return nested;
  }
  return undefined;
};

// The weights the worker actually runs with, read from the managed workflow definition.
const graphConfig = (() => {
  const workflow = parse(SECURITY_ALERT_ANALYSIS_WORKFLOW.yaml) as { steps: GraphStep[] };
  const step = findStep(workflow.steps, 'get_related_alerts');
  if (step?.type !== 'security.buildAlertEntityGraph' || !step.with) {
    throw new Error('get_related_alerts step not found in the alert-analysis workflow');
  }
  return step.with;
})();

/** Walks nested objects only, as the entity graph reads `_source` (flat dotted keys are missed). */
const valuesAtPath = (obj: unknown, path: string[]): unknown[] => {
  if (obj == null) return [];
  if (path.length === 0) return Array.isArray(obj) ? obj : [obj];
  if (Array.isArray(obj)) return obj.flatMap((item) => valuesAtPath(item, path));
  if (typeof obj !== 'object') return [];
  const [head, ...tail] = path;
  return valuesAtPath((obj as Record<string, unknown>)[head], tail);
};

/** First value at a dotted path, walking nested objects. */
const at = (doc: Record<string, unknown>, field: string): unknown =>
  valuesAtPath(doc, field.split('.'))[0];

const entityValues = (doc: Record<string, unknown>, field: string): string[] => {
  const ignored = graphConfig.ignore_entities.find((entry) => entry.field === field)?.values ?? [];
  return valuesAtPath(doc, field.split('.')).filter(
    (v): v is string => typeof v === 'string' && v.trim().length > 0 && !ignored.includes(v)
  );
};

/**
 * Link score between two alert docs, following the worker's `computeParentLinks`: each matching
 * field (or alias) scores into its top-level label, a label keeps its highest score, labels sum.
 */
const linkScore = (child: Record<string, unknown>, parent: Record<string, unknown>): number => {
  const labelScores = new Map<string, number>();
  for (const { field, score, aliases = [] } of graphConfig.entity_fields) {
    const childValues = entityValues(child, field);
    for (const match of [{ field, score }, ...aliases]) {
      const parentValues = entityValues(parent, match.field);
      if (childValues.some((v) => parentValues.includes(v))) {
        const label = field.split('.')[0];
        labelScores.set(label, Math.max(labelScores.get(label) ?? 0, match.score));
      }
    }
  }
  return [...labelScores.values()].reduce((sum, s) => sum + s, 0);
};

const docsFor = (caseIndex: number, runId: string) => {
  const testCase = RELATED_ALERT_CASES[caseIndex];
  return [testCase.target, ...testCase.related].map((fixture, index) =>
    buildRelatedAlertDoc(fixture, `${testCase.id}-${index}-${runId}`, index, runId)
  );
};

describe('related-alert cases: fixtures', () => {
  it('has the five designed cases with the expected verdicts', () => {
    expect(RELATED_ALERT_CASES.map(({ id, expected }) => [id, expected])).toEqual([
      ['related-benign-sshd-scary-names', 'false_positive'],
      ['related-malicious-control', 'true_positive'],
      ['related-lolbin-procdump-control', 'true_positive'],
      ['related-injection-negative-control', 'true_positive'],
      ['related-malicious-id-only-control', 'true_positive'],
    ]);
  });

  it('uses the min_entity_score the workflow runs with', () => {
    expect(graphConfig.min_entity_score).toBe(MIN_ENTITY_SCORE);
  });

  it.each(RELATED_ALERT_CASES.map((c, i) => [c.id, i] as const))(
    '%s: every related alert links to the target in the entity graph',
    (_id, caseIndex) => {
      const [target, ...related] = docsFor(caseIndex, 'run-a');
      expect(related.length).toBeGreaterThan(0);
      for (const doc of related) {
        expect(linkScore(doc, target)).toBeGreaterThanOrEqual(MIN_ENTITY_SCORE);
      }
    }
  );

  it.each(RELATED_ALERT_CASES.map((c, i) => [c.id, i] as const))(
    '%s: alerts of a concurrent run never link to this run',
    (_id, caseIndex) => {
      const [target] = docsFor(caseIndex, 'run-a');
      for (const doc of docsFor(caseIndex, 'run-b')) {
        expect(linkScore(doc, target)).toBeLessThan(MIN_ENTITY_SCORE);
      }
    }
  );

  it('the shared host and user names alone would not link (why user.id is needed)', () => {
    const [target, related] = docsFor(0, 'run-a');
    const { id: _userId, ...userWithoutId } = related.user as Record<string, unknown>;
    const withoutUserId = { ...related, user: userWithoutId };
    expect(linkScore(withoutUserId, target)).toBeLessThan(MIN_ENTITY_SCORE);
  });

  it('indexes host, user and process as nested objects, not flat dotted keys', () => {
    for (const caseIndex of RELATED_ALERT_CASES.keys()) {
      const docs = docsFor(caseIndex, 'run-a');
      docs.forEach((doc, index) => {
        expect(Object.keys(doc).filter((k) => /^(host|user|process)\./.test(k))).toEqual([]);
        expect(entityValues(doc, 'host.id')).toHaveLength(1);
        expect(entityValues(doc, 'user.id')).toHaveLength(1);
        const hasProcess = !(index === 0 && RELATED_ALERT_CASES[caseIndex].target.esqlQuery);
        expect(entityValues(doc, 'process.entity_id')).toHaveLength(hasProcess ? 1 : 0);
      });
    }
  });

  it('benign case is a macOS curl target with scary-named related alerts and benign command lines', () => {
    const [target, ...related] = docsFor(0, 'run-a');
    const hostId = at(target, 'host.id');
    expect(target['kibana.alert.rule.name']).toBe('Suspicious Binary Execution via SSH');
    expect(at(target, 'process.executable')).toBe('/usr/bin/curl');
    expect(at(target, 'host.os.family')).toBe('darwin');
    expect(at(target, 'process.pe')).toBeUndefined();
    expect(target['kibana.alert.entity.id']).toEqual([
      `host:${hostId}`,
      `user:jdoe@${hostId}@local`,
    ]);
    expect(related.map((doc) => doc['kibana.alert.rule.name'])).toEqual([
      'SSH Remote Port Tunneling',
      'Potential SSH Brute Force',
      'Credential Discovery via Recursive Grep',
    ]);
    expect(related.map((doc) => at(doc, 'process.command_line'))).toEqual([
      '/usr/libexec/sshd-auth -i -R',
      '/usr/libexec/sshd-keygen-wrapper',
      'grep -rn --include=*.go -e password_hash -e PasswordReset ./internal/auth',
    ]);
  });

  it('the malicious control shares the benign target and differs only in related alerts', () => {
    const [benign, control] = RELATED_ALERT_CASES;
    expect(control.target).toBe(benign.target);
    expect(control.related.map((r) => r.key)).not.toEqual(benign.related.map((r) => r.key));
  });

  describe('related-malicious-id-only-control', () => {
    const caseIndex = RELATED_ALERT_CASES.findIndex(
      ({ id }) => id === 'related-malicious-id-only-control'
    );

    it('the target fixture declares no host.name or user.name', () => {
      const { observable } = RELATED_ALERT_CASES[caseIndex].target;
      expect(observable['host.id']).toEqual(expect.any(String));
      expect(observable['user.id']).toEqual(expect.any(String));
      expect(Object.keys(observable).filter((key) => /^(host|user)\.name$/.test(key))).toEqual([]);
    });

    it('the target carries host.id and user.id but no host.name or user.name', () => {
      const [target] = docsFor(caseIndex, 'run-a');
      expect(at(target, 'host.id')).toEqual(expect.any(String));
      expect(at(target, 'user.id')).toBe('501');
      expect(at(target, 'host.name')).toBeUndefined();
      expect(at(target, 'user.name')).toBeUndefined();
      expect(JSON.stringify(target)).not.toContain('undefined');
      expect(target['kibana.alert.entity.id']).toBeUndefined();
    });

    it('related alerts keep their host and user names', () => {
      const [, ...related] = docsFor(caseIndex, 'run-a');
      related.forEach((doc) => {
        expect(at(doc, 'host.name')).toBe('jdoe-mbp');
        expect(at(doc, 'user.name')).toBe('jdoe');
      });
    });

    it('the target is an aggregating ES|QL rule alert, not a custom-query Endpoint alert', () => {
      const [target] = docsFor(caseIndex, 'run-a');
      expect(target).toMatchObject({
        'kibana.alert.rule.category': 'ES|QL Rule',
        'kibana.alert.rule.type': 'esql',
        'kibana.alert.rule.rule_type_id': 'siem.esqlRule',
        'kibana.alert.rule.parameters': { type: 'esql', language: 'esql' },
        'kibana.alert.ancestors': [{ depth: 0, index: '', id: '', type: 'event' }],
      });
      const { query } = target['kibana.alert.rule.parameters'] as { query: string };
      expect(query).toMatch(/^FROM logs-endpoint\.events\.process-\*/);
      expect(query).toContain('BY host.id, user.id');
      expect(
        Object.keys(target).filter((key) =>
          /^kibana\.alert\.(original_event|original_data_stream|original_time)/.test(key)
        )
      ).toEqual([]);
    });

    it('only this case is marked as correlated by id', () => {
      expect(
        RELATED_ALERT_CASES.filter(({ correlatedBy }) => correlatedBy === 'id').map(({ id }) => id)
      ).toEqual(['related-malicious-id-only-control']);
    });

    it('shares its related alerts with the malicious control', () => {
      const control = RELATED_ALERT_CASES.find(({ id }) => id === 'related-malicious-control');
      expect(RELATED_ALERT_CASES[caseIndex].related).toEqual(control?.related);
    });
  });

  it('builds the existing four cases byte-identically to the pre-change helper', () => {
    const digest = (caseIndex: number) =>
      createHash('sha256')
        .update(JSON.stringify(docsFor(caseIndex, 'run-a')))
        .digest('hex');
    expect(RELATED_ALERT_CASES.slice(0, 4).map((_c, i) => digest(i))).toEqual([
      '961670ecb96a39a5bd952a9f96e424a0f529929d6c1126d29321be6903aca0f4',
      '3c4fc050b37ef039516f54cd24693c1b5da40601152a4495abb0cb2f6138c763',
      'a669467cc83380ed3b4d019ba15c8e6d4dba1c25ffbe6e65a4a116d8bce19229',
      'f172e51f5f15eaaa1cf9168a1db43f4acfb80f368dd80cd77e6f928f6185f36f',
    ]);
  });

  it('builds per-run docs with unique rule, entity and host ids', () => {
    const [fixture] = RELATED_ALERT_CASES[0].related;
    const docA = buildRelatedAlertDoc(fixture, 'alert-a', 1, 'run-a');
    const docB = buildRelatedAlertDoc(fixture, 'alert-b', 1, 'run-b');
    expect(at(docA, 'host.id')).not.toEqual(at(docB, 'host.id'));
    expect(at(docA, 'host.name')).toBe(fixture.observable['host.name']);
    expect(docA['kibana.alert.rule.uuid']).toBe('alert-a-rule');
    expect(at(docA, 'process.entity_id')).toBe('entity-alert-a');
  });

  it('nestEntityFields nests only host, user and process keys', () => {
    expect(
      nestEntityFields({
        'host.os.name': 'macOS',
        'host.id': 'h',
        'user.name': 'u',
        'process.parent.name': 'zsh',
        'event.code': 'behavior',
        agent: { id: 'a' },
      })
    ).toEqual({
      'event.code': 'behavior',
      agent: { id: 'a' },
      host: { os: { name: 'macOS' }, id: 'h' },
      user: { name: 'u' },
      process: { parent: { name: 'zsh' } },
    });
  });
});

describe('related-alert cases: deterministic verdict check', () => {
  const [benign] = RELATED_ALERT_CASES;
  const expectedFor = (expected: string) => ({ classification: expected });

  it('ClassificationAccuracy scores a correct benign verdict 1 and an escalation 0', async () => {
    const correct = await classificationAccuracy.evaluate({
      output: { classification: 'false_positive', executionStatus: 'completed' },
      expected: expectedFor(benign.expected),
    } as never);
    expect(correct).toMatchObject({ score: 1, label: 'false_positive' });

    const escalated = await classificationAccuracy.evaluate({
      output: { classification: 'true_positive', executionStatus: 'completed' },
      expected: expectedFor(benign.expected),
    } as never);
    expect(escalated).toMatchObject({ score: 0, label: 'true_positive' });
  });

  it('ClassificationAccuracy scores a missing verdict 0, not as a match', async () => {
    const missing = await classificationAccuracy.evaluate({
      output: { executionStatus: 'failed' },
      expected: expectedFor('false_positive'),
    } as never);
    expect(missing).toMatchObject({ score: 0, label: 'none' });
  });

  it('ValidVerdict accepts every enum value and rejects an out-of-range confidence', async () => {
    for (const classification of CLASSIFICATIONS) {
      const result = await validVerdict.evaluate({
        output: { classification, confidenceScore: 0.5 },
      } as never);
      expect(result).toMatchObject({ score: 1 });
    }
    const outOfRange = await validVerdict.evaluate({
      output: { classification: 'false_positive', confidenceScore: 1.5 },
    } as never);
    expect(outOfRange).toMatchObject({ score: 0 });
  });
});
