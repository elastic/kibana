/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { didForensicsRun } from './deep_watch_run';
import {
  cleanSkipFallbacks,
  gateCorrectness,
  summarizeDiscrimination,
  triageCorrectness,
  validOutputContract,
} from './evaluators';
import type { GateOutcome } from './evaluators';
import { DEEP_WATCH_GOLDEN_ROWS } from './golden_dataset';

const outcome = (over: Partial<GateOutcome> = {}): GateOutcome => ({
  id: 'row',
  expectedIncident: true,
  expectForensics: true,
  actualIncident: true,
  actualForensics: true,
  ...over,
});

describe('didForensicsRun', () => {
  it('reports a skip when every forensic field is at its empty fallback', () => {
    expect(didForensicsRun({ patientZero: '', attackTimeline: '', iocs: [] })).toBe(false);
  });

  it('treats whitespace-only forensic text as a skip', () => {
    expect(didForensicsRun({ patientZero: '   ', attackTimeline: '', iocs: [] })).toBe(false);
  });

  it('reports a run when the forensic step produced a patient zero', () => {
    expect(didForensicsRun({ patientZero: 'WKSTN-RECV01', iocs: [] })).toBe(true);
  });

  it('reports a run when only indicators came back', () => {
    expect(didForensicsRun({ patientZero: '', iocs: ['ip | 1.2.3.4 | c2'] })).toBe(true);
  });
});

describe('gateCorrectness', () => {
  it('credits a gate that opened when it should have', () => {
    expect(gateCorrectness(outcome())).toBe(1);
  });

  it('fails a gate that ran forensics on a non-incident', () => {
    expect(gateCorrectness(outcome({ expectForensics: false, actualForensics: true }))).toBe(0);
  });

  it('fails a gate that skipped forensics on a confirmed incident', () => {
    expect(gateCorrectness(outcome({ expectForensics: true, actualForensics: false }))).toBe(0);
  });
});

describe('triageCorrectness', () => {
  it('scores the verdict independently of the gate', () => {
    expect(triageCorrectness(outcome({ expectedIncident: false, actualIncident: true }))).toBe(0);
  });
});

describe('summarizeDiscrimination', () => {
  it('refuses to call an all-positive run discriminating even at 100% accuracy', () => {
    const report = summarizeDiscrimination([outcome({ id: 'a' }), outcome({ id: 'b' })]);
    expect(report.accuracy).toBe(1);
    expect(report.discriminates).toBe(false);
  });

  it('reports discrimination only once both directions are observed', () => {
    const report = summarizeDiscrimination([
      outcome({ id: 'pos' }),
      outcome({
        id: 'neg',
        expectedIncident: false,
        expectForensics: false,
        actualIncident: false,
        actualForensics: false,
      }),
    ]);
    expect(report.discriminates).toBe(true);
    expect(report.truePositives).toBe(1);
    expect(report.trueNegatives).toBe(1);
  });

  it('does not credit an always-open gate with discrimination', () => {
    const report = summarizeDiscrimination([
      outcome({ id: 'pos' }),
      outcome({
        id: 'neg',
        expectedIncident: false,
        expectForensics: false,
        actualIncident: false,
        actualForensics: true,
      }),
    ]);
    expect(report.discriminates).toBe(false);
    expect(report.accuracy).toBeLessThan(1);
  });
});

describe('validOutputContract', () => {
  it('accepts the scalar string array the platform allows', () => {
    expect(validOutputContract({ iocs: ['ip | 1.2.3.4 | c2'] })).toBe(1);
  });

  it('rejects object array elements that fail the runtime output validator', () => {
    expect(validOutputContract({ iocs: [{ type: 'ip' } as unknown as string] })).toBe(0);
  });
});

describe('cleanSkipFallbacks', () => {
  it('passes a skip whose fields are genuinely empty', () => {
    expect(cleanSkipFallbacks({ patientZero: '', attackTimeline: '', iocs: [] })).toBe(1);
  });

  it('fails a populated run that leaked a template expression', () => {
    // Regression: an earlier version returned 1 here because the leaked text
    // made the run look like a successful forensic reconstruction.
    expect(
      cleanSkipFallbacks({
        patientZero: 'WKSTN-RECV01',
        attackTimeline: '{{ steps.reconstruct_attack.output.structured_output.attackTimeline }}',
        iocs: ['ip | 1.2.3.4 | c2'],
      })
    ).toBe(0);
  });

  it('fails a skip that leaked an unrendered template expression', () => {
    expect(
      cleanSkipFallbacks({ patientZero: '{{ steps.reconstruct_attack.output }}', iocs: [] })
    ).toBe(0);
  });
});

describe('golden dataset', () => {
  it('contains both gate directions so the suite can discriminate', () => {
    expect(DEEP_WATCH_GOLDEN_ROWS.some((r) => r.expectForensics)).toBe(true);
    expect(DEEP_WATCH_GOLDEN_ROWS.some((r) => !r.expectForensics)).toBe(true);
  });

  it('keeps forensic expectation tied to the incident verdict', () => {
    for (const row of DEEP_WATCH_GOLDEN_ROWS) {
      expect(row.expectForensics).toBe(row.expectedIncident);
    }
  });

  it('uses unique golden ids', () => {
    const ids = DEEP_WATCH_GOLDEN_ROWS.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
