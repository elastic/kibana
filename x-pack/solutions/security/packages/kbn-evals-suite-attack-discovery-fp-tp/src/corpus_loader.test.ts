/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CORPUS_CASE_COUNTS, type CorpusName } from './constants';
import {
  loadAllCorpora,
  loadCorpus,
  loadCorpusExamples,
  parseCase,
  toExample,
} from './corpus_loader';

describe('corpus_loader — real vendored corpora', () => {
  it('loads all seven corpora with the known case counts', () => {
    const all = loadAllCorpora();
    expect(Object.keys(all).sort()).toEqual(Object.keys(CORPUS_CASE_COUNTS).sort());
    for (const [name, expected] of Object.entries(CORPUS_CASE_COUNTS)) {
      expect(all[name as CorpusName]).toHaveLength(expected);
    }
  });

  it('enforces the documented label counts per corpus', () => {
    expect(loadCorpus('guide-sanity').filter((c) => c.label === 'true_positive')).toHaveLength(300);
    expect(loadCorpus('guide-sanity').filter((c) => c.label === 'false_positive')).toHaveLength(
      225
    );
    expect(loadCorpus('guide-sanity').filter((c) => c.label === 'inconclusive')).toHaveLength(225);
    expect(loadCorpus('botsv3-benign-day').every((c) => c.label === 'false_positive')).toBe(true);
    expect(loadCorpus('botsv3-fp-alerts').every((c) => c.label === 'false_positive')).toBe(true);
    expect(loadCorpus('tp-chains').every((c) => c.label === 'true_positive')).toBe(true);
    expect(
      loadCorpus('adversarial-twins').filter((c) => c.label === 'false_positive')
    ).toHaveLength(15);
    expect(loadCorpus('adversarial-twins').filter((c) => c.label === 'inconclusive')).toHaveLength(
      6
    );
    expect(loadCorpus('perturbations').filter((c) => c.label === 'true_positive')).toHaveLength(12);
    expect(loadCorpus('perturbations').filter((c) => c.label === 'inconclusive')).toHaveLength(3);
    expect(
      loadCorpus('cloud-fp-synthetic').filter((c) => c.label === 'false_positive')
    ).toHaveLength(73);
    expect(loadCorpus('cloud-fp-synthetic').filter((c) => c.label === 'inconclusive')).toHaveLength(
      5
    );
  });

  it('tags guide-sanity examples as sanity-only and botsv3-fp-alerts as provisional', () => {
    const guide = loadCorpusExamples('guide-sanity');
    expect(guide.every((e) => e.metadata.sanityOnly)).toBe(true);
    expect(guide.every((e) => !e.metadata.provisional)).toBe(true);

    const fpAlerts = loadCorpusExamples('botsv3-fp-alerts');
    expect(fpAlerts.every((e) => e.metadata.provisional)).toBe(true);
    expect(fpAlerts.every((e) => !e.metadata.sanityOnly)).toBe(true);

    const cloudFp = loadCorpusExamples('cloud-fp-synthetic');
    expect(cloudFp.every((e) => e.metadata.provisional)).toBe(true);
    expect(cloudFp.every((e) => e.metadata.labelProvenance === 'synthetic')).toBe(true);
  });

  it('carries mutation_spec on every adversarial-mutation case', () => {
    for (const name of ['adversarial-twins', 'perturbations'] as CorpusName[]) {
      for (const c of loadCorpus(name)) {
        expect(c.label_provenance).toBe('adversarial-mutation');
        expect(c.mutation_spec).toBeDefined();
        expect(c.mutation_spec!.broken_invariant).not.toBe('');
      }
    }
  });

  it('maps a case onto an eval Example with provenance metadata', () => {
    const c = loadCorpus('tp-chains')[0];
    const example = toExample(c);
    expect(example.expected).toEqual({ label: 'true_positive' });
    expect(example.output).toEqual({ classification: 'true_positive' });
    expect(example.metadata.caseId).toBe(c.case_id);
    expect(example.metadata.labelProvenance).toBe('replay');
    expect(example.input.caseId).toBe(c.case_id);
    expect(example.input.payload).toEqual(c.payload);
  });
});

describe('corpus_loader — parseCase validation semantics', () => {
  const seen = () => new Set<string>();

  it('accepts a canonical case line', () => {
    const line = JSON.stringify({
      case_id: 'x-1',
      corpus: 'tp-chains',
      label: 'true_positive',
      label_provenance: 'replay',
      source_ref: 'BOTSv3:beat-host-1',
      payload: { event: 'data' },
      gold_rationale: 'because',
    });
    expect(() => parseCase(line, 't:1', seen())).not.toThrow();
  });

  it('throws on a corrupted gold label', () => {
    const line = JSON.stringify({
      case_id: 'x-2',
      corpus: 'tp-chains',
      label: 'benign_malware',
      label_provenance: 'replay',
      source_ref: 'BOTSv3:x',
      payload: {},
      gold_rationale: 'because',
    });
    expect(() => parseCase(line, 't:2', seen())).toThrow(/label/);
  });

  it('throws on a label outside the enum even when plausibly named', () => {
    const line = JSON.stringify({
      case_id: 'x-3',
      corpus: 'tp-chains',
      label: 'TRUE_POSITIVE',
      label_provenance: 'replay',
      source_ref: 'BOTSv3:x',
      payload: {},
      gold_rationale: 'because',
    });
    expect(() => parseCase(line, 't:3', seen())).toThrow(/label/);
  });

  it('throws on an unknown label_provenance', () => {
    const line = JSON.stringify({
      case_id: 'x-4',
      corpus: 'tp-chains',
      label: 'true_positive',
      label_provenance: 'guessed',
      source_ref: 'BOTSv3:x',
      payload: {},
      gold_rationale: 'because',
    });
    expect(() => parseCase(line, 't:4', seen())).toThrow(/label_provenance/);
  });

  it('throws on missing required fields', () => {
    const base = {
      case_id: 'x-5',
      corpus: 'tp-chains',
      label: 'true_positive',
      label_provenance: 'replay',
      source_ref: 'BOTSv3:x',
      payload: {},
      gold_rationale: 'because',
    };
    for (const field of Object.keys(base) as (keyof typeof base)[]) {
      const clone: Record<string, unknown> = { ...base };
      delete clone[field];
      expect(() => parseCase(JSON.stringify(clone), 't:5', seen())).toThrow(
        new RegExp(`'${field}'`)
      );
    }
  });

  it('throws on empty required fields', () => {
    const line = JSON.stringify({
      case_id: 'x-6',
      corpus: 'tp-chains',
      label: 'true_positive',
      label_provenance: 'replay',
      source_ref: '',
      payload: {},
      gold_rationale: 'because',
    });
    expect(() => parseCase(line, 't:6', seen())).toThrow(/'source_ref' is empty/);
  });

  it('throws on duplicate case_id', () => {
    const make = (id: string) =>
      JSON.stringify({
        case_id: id,
        corpus: 'tp-chains',
        label: 'true_positive',
        label_provenance: 'replay',
        source_ref: 'BOTSv3:x',
        payload: {},
        gold_rationale: 'because',
      });
    const ids = seen();
    parseCase(make('dup'), 't:7a', ids);
    expect(() => parseCase(make('dup'), 't:7b', ids)).toThrow(/duplicate case_id/);
  });

  it('throws on invalid JSON', () => {
    expect(() => parseCase('{not json', 't:8', seen())).toThrow(/invalid JSON/);
  });

  it('throws on an unknown corpus value', () => {
    const line = JSON.stringify({
      case_id: 'x-9',
      corpus: 'made-up-corpus',
      label: 'true_positive',
      label_provenance: 'replay',
      source_ref: 'x',
      payload: {},
      gold_rationale: 'because',
    });
    expect(() => parseCase(line, 't:9', seen())).toThrow(/unknown corpus/);
  });

  it('throws when an adversarial-mutation case lacks mutation_spec', () => {
    const line = JSON.stringify({
      case_id: 'x-10',
      corpus: 'adversarial-twins',
      label: 'false_positive',
      label_provenance: 'adversarial-mutation',
      source_ref: 'x',
      payload: {},
      gold_rationale: 'because',
    });
    expect(() => parseCase(line, 't:10', seen())).toThrow(/mutation_spec/);
  });
});
