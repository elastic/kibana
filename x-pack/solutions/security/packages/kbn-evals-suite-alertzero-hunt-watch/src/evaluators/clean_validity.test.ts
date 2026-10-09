/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one or more
 * contributor license agreements. Licensed under the Elastic License 2.0.
 */

import { loadManifest, loadSamples } from '../fixtures/load_corpus';
import {
  buildLabels,
  sampleBase,
  techniqueRelated,
  deriveRIocZoneChains,
} from '../datasets/labels';
import { m3Verdict, T1_APPLICABLE, T2_APPLICABLE, classifyHitIds } from './clean_validity';
import { InvalidCell, type ReportClass } from '../types';
import { sut, behNone, behExecNoHit, behExecHit, T2_FAILURES } from './sut_mirror';
import {
  harnessIds,
  distinctIdsOk,
  batches,
  harnessTrigger,
  isForeignHitIndex,
  REPORT_IDS_CAP,
} from '../harness/trigger';

/**
 * Jest port of the rev7_check.py executable oracle (18 proofs). Each proof is
 * expressed as: BASE verdict, MUTANT verdict, and the assertion that they
 * differ (the flip). The mutant is always the WRONG behaviour; these tests pin
 * the shipped behaviour by showing the mutant goes red.
 *
 * Fixture mapping from the oracle (rev7_check.py):
 * - fixtures are built with sut() so they carry a wire-realistic completeness;
 * - mutants are expressed as option overrides on m3Verdict / helper params.
 */

const manifest = loadManifest();
const samples = loadSamples();
const labels = buildLabels({ manifest, samples });

/** rev7 proof() helper: asserts BASE != MUTANT, mirroring "FLIP=True". */
const proof = (name: string, base: unknown, mutant: unknown): void => {
  // The assertion is performed by the caller via expect(); this helper exists
  // so each proof's base/mutant pair stays visually paired.
  void name;
  void base;
  void mutant;
};

// ---------------------------------------------------------------- R4-B1
describe('R4-B1: applicability is a report-class property (M3)', () => {
  // reviewer's B1 case: R-ioc[sinkhole-infra] E0, T1 reached, zero executed behaviours -> clean
  const fxIoc = sut({ tier1_status: 'no_environment_hits', behaviours: behNone });

  it('fx fixture is complete (no_behaviors_found leaves no gap)', () => {
    expect(fxIoc.completeness).toBe('complete');
  });

  it('R4-B1 T2 required on R-ioc (sinkhole-infra E0, T1 reached, 0 exec): BASE=clean, MUTANT=incomplete', () => {
    const base = m3Verdict('R-ioc', fxIoc).verdict;
    const mutant = m3Verdict('R-ioc', fxIoc, {
      t2Applicable: { ...T2_APPLICABLE, 'R-ioc': true },
    }).verdict;
    proof('R4-B1 R-ioc', base, mutant);
    expect(base).toBe('clean');
    expect(mutant).toBe('incomplete');
    expect(base).not.toBe(mutant); // FLIP
  });

  it('R4-B1 T2 required on R-decoy(a) (T1 reached, 0 exec): BASE=clean, MUTANT=incomplete', () => {
    const base = m3Verdict('R-decoy(a)', fxIoc).verdict;
    const mutant = m3Verdict('R-decoy(a)', fxIoc, {
      t2Applicable: { ...T2_APPLICABLE, 'R-decoy(a)': true },
    }).verdict;
    expect(base).toBe('clean');
    expect(mutant).toBe('incomplete');
    expect(base).not.toBe(mutant);
  });

  it('T2 optional does not hide a T2 hit', () => {
    const fxIocT2Hit = sut({ tier1_status: 'no_environment_hits', behaviours: behExecHit });
    expect(m3Verdict('R-ioc', fxIocT2Hit).verdict).toBe('false-hit');
  });

  it('R-ioc with T1 not reached is still incomplete (T1 applicable)', () => {
    expect(
      m3Verdict('R-ioc', sut({ tier1_status: 'no_searchable_terms', behaviours: behExecNoHit }))
        .verdict
    ).toBe('incomplete');
  });

  it('R-beh still needs T2', () => {
    expect(
      m3Verdict('R-beh-A', sut({ tier1_status: 'no_searchable_terms', behaviours: behNone }))
        .verdict
    ).toBe('incomplete');
  });
});

// ---------------------------------------------------------------- R5-B1 table
describe('R5-B1: SUT gaps on T2-optional classes', () => {
  it.each([['R-ioc'], ['R-decoy(a)']] as [ReportClass][])(
    'every Tier 2 failure shape -> incomplete_retryable at the SUT, M3=incomplete (%s)',
    (cls) => {
      for (const [, part] of Object.entries(T2_FAILURES)) {
        const run = sut({ tier1_status: 'no_environment_hits', ...part });
        expect(run.completeness).toBe('incomplete_retryable');
        expect(m3Verdict(cls, run).verdict).toBe('incomplete');
      }
    }
  );

  it('the R4-B1 case (nothing to hunt) stays clean', () => {
    const fxIoc = sut({ tier1_status: 'no_environment_hits', behaviours: behNone });
    expect(m3Verdict('R-ioc', fxIoc).verdict).toBe('clean');
    expect(m3Verdict('R-decoy(a)', fxIoc).verdict).toBe('clean');
  });

  it('a partially grounded R-beh run is NOT moved by R5-B1 (Q-S6 for the owner)', () => {
    const fxBehPartial = sut({
      tier1_status: 'no_searchable_terms',
      behaviours: [
        { executed: true, hit: false },
        { executed: false, hit: false, reason: 'execute_failed' },
      ],
    });
    expect(fxBehPartial.completeness).toBe('incomplete_retryable');
    expect(m3Verdict('R-beh-A', fxBehPartial).verdict).toBe('clean');
  });

  it('R5-B1 T2-optional ignores SUT gaps (sinkhole-infra E0, tier2_failed): BASE=incomplete, MUTANT=clean', () => {
    const fxT2Fail = sut({
      tier1_status: 'no_environment_hits',
      ...T2_FAILURES['tier2_failed'],
    });
    const base = m3Verdict('R-ioc', fxT2Fail).verdict;
    const mutant = m3Verdict('R-ioc', fxT2Fail, { ignoreCompleteness: true }).verdict;
    expect(base).toBe('incomplete');
    expect(mutant).toBe('clean');
    expect(base).not.toBe(mutant);
  });

  it('R5-B1 both guards off: T1 status-only + no completeness (R-ioc, index_unavailable): BASE=incomplete, MUTANT=clean', () => {
    const fxT1Unavail = sut({
      tier1_status: 'no_environment_hits',
      tier1_incomplete: ['index_unavailable'],
      behaviours: behNone,
    });
    const base = m3Verdict('R-ioc', fxT1Unavail).verdict;
    const mutant = m3Verdict('R-ioc', fxT1Unavail, {
      t1ReachedStatusOnly: true,
      ignoreCompleteness: true,
    }).verdict;
    expect(base).toBe('incomplete');
    expect(mutant).toBe('clean');
    expect(base).not.toBe(mutant);
  });

  it('overlap: on a T2-optional class the completeness clause ALSO catches index_unavailable', () => {
    const fxT1Unavail = sut({
      tier1_status: 'no_environment_hits',
      tier1_incomplete: ['index_unavailable'],
      behaviours: behNone,
    });
    expect(m3Verdict('R-ioc', fxT1Unavail, { t1ReachedStatusOnly: true }).verdict).toBe(
      'incomplete'
    ); // completeness clause still catches it
  });

  it('R5-B1 T1-reached from status only (R-beh Arm B, search_partial, T2 exec): BASE=incomplete, MUTANT=clean', () => {
    const fxT1Partial = sut({
      tier1_status: 'no_environment_hits',
      tier1_incomplete: ['search_partial'],
      behaviours: behExecNoHit,
    });
    const base = m3Verdict('R-beh-B', fxT1Partial).verdict;
    const mutant = m3Verdict('R-beh-B', fxT1Partial, { t1ReachedStatusOnly: true }).verdict;
    expect(base).toBe('incomplete');
    expect(mutant).toBe('clean');
    expect(base).not.toBe(mutant);
  });
});

// ---------------------------------------------------------------- R3-B1
describe('R3-B1: applicability must not come from SUT output', () => {
  it('R3-B1#1 require both tiers (Arm A R-beh E0, T2 exec no hit, T1 nst): BASE=clean, MUTANT=incomplete', () => {
    const fxBehA = sut({ tier1_status: 'no_searchable_terms', behaviours: behExecNoHit });
    const base = m3Verdict('R-beh-A', fxBehA).verdict;
    const mutant = m3Verdict('R-beh-A', fxBehA, {
      t1Applicable: Object.fromEntries(Object.keys(T1_APPLICABLE).map((k) => [k, true])) as Record<
        ReportClass,
        boolean
      >,
      t2Applicable: Object.fromEntries(Object.keys(T2_APPLICABLE).map((k) => [k, true])) as Record<
        ReportClass,
        boolean
      >,
    }).verdict;
    expect(base).toBe('clean');
    expect(mutant).toBe('incomplete');
    expect(base).not.toBe(mutant);
  });

  it('R3-B1#2 applicability from tier1.status (Arm B, T1 nst, T2 exec no hit): BASE=incomplete, MUTANT=clean', () => {
    const fxBehB = sut({ tier1_status: 'no_searchable_terms', behaviours: behExecNoHit });
    const base = m3Verdict('R-beh-B', fxBehB).verdict;
    const mutant = m3Verdict('R-beh-B', fxBehB, { applicabilityFromSut: true }).verdict;
    expect(base).toBe('incomplete');
    expect(mutant).toBe('clean');
    expect(base).not.toBe(mutant);
  });
});

// ---------------------------------------------------------------- Rev 7 N1-N3
describe('Rev 7 N1-N3 (reviewer verdict t_6b85e943)', () => {
  it('N1: T1 nst, one grounded+executed, one query_ungrounded -> incomplete_retryable (not final)', () => {
    const fxPartialGround = sut({
      tier1_status: 'no_searchable_terms',
      behaviours: [
        { executed: true, hit: false },
        { executed: false, hit: false, reason: 'query_ungrounded' },
      ],
    });
    expect(fxPartialGround.completeness).toBe('incomplete_retryable');
    // nothing grounded -> treatAsFinal applies -> final
    const fxNothingGround = sut({
      tier1_status: 'no_searchable_terms',
      behaviours: [{ executed: false, hit: false, reason: 'query_ungrounded' }],
    });
    expect(fxNothingGround.completeness).toBe('incomplete_final');
  });

  it('N2 T1-reached from status only (R-beh Arm B, index_unavailable, T2 exec): BASE=incomplete, MUTANT=clean', () => {
    const fx = sut({
      tier1_status: 'no_environment_hits',
      tier1_incomplete: ['index_unavailable'],
      behaviours: behExecNoHit,
    });
    const base = m3Verdict('R-beh-B', fx).verdict;
    const mutant = m3Verdict('R-beh-B', fx, { t1ReachedStatusOnly: true }).verdict;
    expect(base).toBe('incomplete');
    expect(mutant).toBe('clean');
    expect(base).not.toBe(mutant);
  });

  it('N3 missing completeness is INVALID, never defaulted (R-ioc, no field): BASE=INVALID, MUTANT=clean', () => {
    const m3Cell = (opts?: Parameters<typeof m3Verdict>[2]): string => {
      try {
        return m3Verdict(
          'R-ioc',
          { tier1_status: 'no_environment_hits', behaviours: behNone },
          opts
        ).verdict;
      } catch (e) {
        if (e instanceof InvalidCell) return `INVALID:${e.cause.split(':')[0]}`;
        throw e;
      }
    };
    const base = m3Cell();
    const mutant = m3Cell({ defaultMissing: true });
    expect(base).toBe('INVALID:missing_completeness');
    expect(mutant).toBe('clean');
    expect(base).not.toBe(mutant);
  });

  it('N3 note: a hit is decided before the completeness clause, so it scores without the field', () => {
    expect(
      m3Verdict('R-ioc', {
        tier1_status: 'environment_hits_found',
        behaviours: behNone,
      }).verdict
    ).toBe('false-hit');
  });
});

// ---------------------------------------------------------------- B2: per-phase ids
describe('B2: per-phase ES-minted report ids', () => {
  const REPORTS = ['R-ioc[bits-mshta]', 'R-ioc[sinkhole-infra]', 'R-beh[wmi-lateral]'];

  it('ingest once per rep, reuse across phases: BASE=distinct-ok, MUTANT=ASSERT-FAIL', () => {
    const base = distinctIdsOk(harnessIds('m', 1, REPORTS)) ? 'distinct-ok' : 'ASSERT-FAIL';
    const mutant = distinctIdsOk(harnessIds('m', 1, REPORTS, { reuseAcrossPhases: true }))
      ? 'distinct-ok'
      : 'ASSERT-FAIL';
    expect(base).toBe('distinct-ok');
    expect(mutant).toBe('ASSERT-FAIL');
    expect(base).not.toBe(mutant);
  });
});

// ---------------------------------------------------------------- NB-d batching
describe('NB-d: manual-trigger batching (report_ids max 10)', () => {
  const allIds = Object.values(
    harnessIds(
      'm',
      1,
      Array.from({ length: 15 }, (_, i) => `R-x${i}`)
    ).ids
  );
  const cover = (batchList: string[][]): string =>
    batchList.flat().length === allIds.length && new Set(batchList.flat()).size === allIds.length
      ? 'covered'
      : 'TRUNCATED';

  it(`15 reports x 3 phases = 45 ids, all batches <= ${REPORT_IDS_CAP}`, () => {
    expect(allIds).toHaveLength(45);
    const bs = batches(allIds);
    for (const b of bs) expect(b.length).toBeLessThanOrEqual(REPORT_IDS_CAP);
    expect(bs.reduce((n, b) => n + b.length, 0)).toBe(allIds.length);
  });

  it('send one call, truncate to 10 (no batching): BASE=covered, MUTANT=TRUNCATED', () => {
    const bs = batches(allIds);
    const base = cover(bs);
    const mutant = cover([allIds.slice(0, REPORT_IDS_CAP)]);
    expect(base).toBe('covered');
    expect(mutant).toBe('TRUNCATED');
    expect(base).not.toBe(mutant);
  });
});

// ---------------------------------------------------------------- R5-NB-1
describe('R5-NB-1: refresh, then a per-batch route assertion', () => {
  const allIds = Object.values(
    harnessIds(
      'm',
      1,
      Array.from({ length: 15 }, (_, i) => `R-x${i}`)
    ).ids
  );

  it('trigger before refresh: one id not_found (per-batch assertion): BASE=ok, MUTANT=INVALID(per-batch)', () => {
    const visible = new Set(allIds);
    const unrefreshed = new Set(allIds.slice(0, allIds.length - 1)); // last id written but not refreshed
    const base = harnessTrigger(allIds, { visible });
    const mutant = harnessTrigger(allIds, { visible: unrefreshed });
    expect(base.ok).toBe(true);
    expect(mutant.ok).toBe(false);
    expect(base).not.toEqual(mutant);
    if (!mutant.ok) {
      expect(mutant.response.skipped[0]?.reason).toBe('not_found');
    }
  });

  it('without the per-batch assertion the denominator silently shrinks (observed, not assumed)', () => {
    const unrefreshed = new Set(allIds.slice(0, allIds.length - 1));
    expect(harnessTrigger(allIds, { visible: unrefreshed, assertPerBatch: false })).toMatchObject({
      ok: true,
      reached: allIds.length - 1,
    });
  });
});

// ---------------------------------------------------------------- R5-NB-2
describe('R5-NB-2: foreign-hit matching rule', () => {
  const SEEDED_STREAMS = labels.seededStreams;
  const FIXTURE_STREAMS = labels.fixtureStreams;
  const seededHit = '.ds-logs-endpoint.events.process-default-2026.10.09-000001';
  const fixtureHit = '.ds-logs-ti_abusech.url-default-2026.10.09-000001';

  it('fixture stream membership matches the oracle expectations', () => {
    expect(SEEDED_STREAMS).toContain('logs-endpoint.events.process-default');
    expect(FIXTURE_STREAMS).toContain('logs-ti_abusech.url-default');
    expect(SEEDED_STREAMS).not.toContain('logs-ti_abusech.url-default');
  });

  it('fixture hit is foreign on E0, seeded on E+; agent index is foreign on E+', () => {
    expect(isForeignHitIndex(fixtureHit, 'E0', SEEDED_STREAMS, FIXTURE_STREAMS)).toBe(true);
    expect(isForeignHitIndex(fixtureHit, 'E+', SEEDED_STREAMS, FIXTURE_STREAMS)).toBe(false);
    expect(
      isForeignHitIndex(
        '.ds-logs-elastic_agent-default-2026.10.09-000001',
        'E+',
        SEEDED_STREAMS,
        FIXTURE_STREAMS
      )
    ).toBe(true);
    expect(isForeignHitIndex(seededHit, 'E0', SEEDED_STREAMS, FIXTURE_STREAMS)).toBe(false);
  });

  it('exclusion semantics honoured (same as the SUT broad scope)', () => {
    // buildMatches(['logs-*', '-logs-elastic_agent*']) must reject the agent index
    const { compileMatches } = jest.requireActual(
      '../harness/trigger'
    ) as typeof import('../harness/trigger');
    expect(
      compileMatches(['logs-*', '-logs-elastic_agent*'])(
        '.ds-logs-elastic_agent-default-2026.10.09-000001'
      )
    ).toBe(false);
  });

  it('matcher without the .ds- strip -> seeded hit called foreign: BASE=seeded, MUTANT=foreign', () => {
    const base = isForeignHitIndex(seededHit, 'E+', SEEDED_STREAMS, FIXTURE_STREAMS)
      ? 'foreign'
      : 'seeded';
    const mutant = isForeignHitIndex(seededHit, 'E+', SEEDED_STREAMS, FIXTURE_STREAMS, {
      stripDs: false,
    })
      ? 'foreign'
      : 'seeded';
    expect(base).toBe('seeded');
    expect(mutant).toBe('foreign');
    expect(base).not.toBe(mutant);
  });
});

// ---------------------------------------------------------------- NB-a / R3-B2 / R4-NB-a
describe('NB-a: M2 classification totality + 5-key breakdown', () => {
  const chainOf = labels.chainOf;
  const techOf = labels.techOf;
  const planted = (prefix: string): Set<string> => {
    const fileName = Object.keys(samples).find((f) => f.startsWith(prefix));
    const sample = fileName ? samples[fileName] : undefined;
    return new Set((sample?.positive?.docs ?? []).map((_, i) => `${prefix}#${i}#positive`));
  };

  it('f3475224 and f59668de are both wmi-lateral and both T1047-matched', () => {
    expect(chainOf['f3475224']).toBe('wmi-lateral');
    expect(chainOf['f59668de']).toBe('wmi-lateral');
    expect(techOf['f3475224']).toContain('T1047');
  });

  it('R3-B2 restrict true ids to other chains (same-chain matched id): BASE=total, MUTANT=INVALID', () => {
    const hits = new Set(['f3475224#1#positive', 'f59668de#0#positive']);
    const totality = (crossChainOnly: boolean): string => {
      try {
        const classified = classifyHitIds({
          hitIds: [...hits],
          technique: 'T1047',
          target: 'f3475224',
          chainOf,
          techOf,
          planted,
          buckets: {},
          crossChainOnly,
        });
        return Object.values(classified).every((v) => v !== undefined) ? 'total' : 'INVALID';
      } catch {
        return 'INVALID';
      }
    };
    const base = totality(false);
    const mutant = totality(true);
    expect(base).toBe('total');
    expect(mutant).toBe('INVALID');
    expect(base).not.toBe(mutant);
  });

  it('fixture-bucket hit is classified (false), not unclassified', () => {
    const fx = 'logs-ti_abusech.url#0#fixture';
    const classified = classifyHitIds({
      hitIds: [fx],
      technique: 'T1047',
      target: 'f3475224',
      chainOf,
      techOf,
      planted,
      buckets: { fixture: new Set([fx]) },
    });
    expect(classified[fx]).toBe('false');
  });

  it('R4-NB-a fixture hit left unclassified (Rev 4 status quo): BASE=total, MUTANT=INVALID', () => {
    const fx = 'logs-ti_abusech.url#0#fixture';
    const totality = (withFixtureBucket: boolean): string => {
      try {
        const classified = classifyHitIds({
          hitIds: [fx],
          technique: 'T1047',
          target: 'f3475224',
          chainOf,
          techOf,
          planted,
          buckets: withFixtureBucket ? { fixture: new Set([fx]) } : {},
        });
        return Object.values(classified).every((v) => v !== undefined) ? 'total' : 'INVALID';
      } catch {
        return 'INVALID';
      }
    };
    const base = totality(true);
    const mutant = totality(false);
    expect(base).toBe('total');
    expect(mutant).toBe('INVALID');
    expect(base).not.toBe(mutant);
  });

  it('R3-B2 key chains on sample .chain instead of manifest chain key: BASE=five-keys, MUTANT=ASSERT-FAIL', () => {
    const keysFrom = (fn: (prefix: string) => string): string => {
      const keys = new Set(Object.keys(chainOf).map(fn));
      return keys.size === labels.manifestChains.length &&
        [...keys].every((k) => labels.manifestChains.includes(k))
        ? 'five-keys'
        : `ASSERT-FAIL(${keys.size} keys)`;
    };
    const base = keysFrom((p) => chainOf[p]); // manifest chain key
    const mutant = keysFrom((p) => {
      // sample .chain field
      const fileName = Object.keys(samples).find((f) => f.startsWith(p));
      return fileName ? samples[fileName].chain : '';
    });
    expect(base).toBe('five-keys');
    expect(mutant).not.toBe('five-keys');
    expect(base).not.toBe(mutant);
  });
});

// ---------------------------------------------------------------- NB-b / R4-NB-b / R5-NB-3
describe('NB-b: sinkhole-infra excluded from the chain breakdown', () => {
  const BLOBS: Record<string, string> = Object.fromEntries(
    Object.entries(samples).map(([name, s]) => [name, JSON.stringify(s)])
  );
  const R_IOC_ZONE: Record<string, string> = {
    'R-ioc[sinkhole-infra]': 'stage2.example.org',
  };
  const deriveRIocChain = (blobs: Record<string, string>): Record<string, string | null> => {
    const out: Record<string, string | null> = {};
    for (const [reportKey, zone] of Object.entries(R_IOC_ZONE)) {
      const chains = new Set<string>();
      for (const [name, blob] of Object.entries(blobs)) {
        if (blob.includes(zone)) chains.add(samples[name].chain);
      }
      if (chains.size > 1) throw new Error(`${reportKey}: zone in several chains`);
      out[reportKey] = chains.size === 1 ? [...chains][0] : null;
    }
    return out;
  };

  it('R4-NB-b put sinkhole-infra into the 5-key chain breakdown: BASE=five-keys, MUTANT=ASSERT-FAIL', () => {
    const chainRows = (rIocChain: Record<string, string | null>, includeInfra: boolean): string => {
      const rows = new Set(labels.manifestChains);
      for (const c of Object.values(rIocChain)) {
        if (c) rows.add(c);
        else if (includeInfra) rows.add('infra');
      }
      return [...rows].every((k) => labels.manifestChains.includes(k)) &&
        [...rows].sort().join() === [...labels.manifestChains].sort().join()
        ? 'five-keys'
        : `ASSERT-FAIL(${rows.size} keys)`;
    };
    const rIocChain = deriveRIocChain(BLOBS);
    expect(rIocChain['R-ioc[sinkhole-infra]']).toBeNull(); // sinkhole-infra is chainless
    const base = chainRows(rIocChain, false);
    const mutant = chainRows(rIocChain, true);
    expect(base).toBe('five-keys');
    expect(mutant).not.toBe('five-keys');
    expect(base).not.toBe(mutant);
  });

  it('R5-NB-3 corpus change: stage2.example.org appears in a chain sample: BASE=chainless, MUTANT=HAS-CHAIN', () => {
    const mutBlobs: Record<string, string> = Object.fromEntries(
      Object.entries(BLOBS).map(([name, blob]) => [
        name,
        name.startsWith('f59668de') ? `${blob} stage2.example.org` : blob,
      ])
    );
    const infraChainless = (blobs: Record<string, string>): string =>
      deriveRIocChain(blobs)['R-ioc[sinkhole-infra]'] === null ? 'chainless' : 'HAS-CHAIN';
    const base = infraChainless(BLOBS);
    const mutant = infraChainless(mutBlobs);
    expect(base).toBe('chainless');
    expect(mutant).toBe('HAS-CHAIN');
    expect(base).not.toBe(mutant);
  });
});

// ---------------------------------------------------------------- labels invariants
describe('labels invariants over the vendored corpus', () => {
  it('sample->chain mapping is total and injective over 32 samples', () => {
    expect(Object.keys(samples)).toHaveLength(32);
    expect(Object.keys(labels.chainOf)).toHaveLength(32);
    expect(new Set(Object.values(labels.chainOf)).size).toBe(5);
  });

  it('manifest chains are the 5 expected keys', () => {
    expect(labels.manifestChains).toEqual([
      'bits-mshta',
      'cloud-identity',
      'linux-curl',
      'encoded-powershell',
      'wmi-lateral',
    ]);
  });

  it('planted IoC denominator (v0) is the sample-carried domain: malicious-c2.example.com', () => {
    // design: only malicious-c2.example.com appears in seeded docs, so the v0
    // Tier 1 denominator is the sample-carried member of the candidate set.
    const seeded = labels.plantedIocs.map((i) => i.value);
    expect(seeded).toContain('malicious-c2.example.com');
    expect(seeded).not.toContain('stage2.example.org'); // absent_from_corpus
    expect(seeded).not.toContain('drops.example.io'); // unsearchable_by_design
  });

  it('sinkhole zone -> chain derivation is single-valued and infra is chainless', () => {
    const derived = deriveRIocZoneChains(samples, manifest.sinkhole_zones);
    expect(derived['stage2.example.org']).toBeNull();
    expect(derived['malicious-c2.example.com']).not.toBeNull();
  });

  it('techniqueRelated accepts parent/sub-technique equality both ways', () => {
    expect(techniqueRelated('T1047', 'T1047.001')).toBe(true);
    expect(techniqueRelated('T1047.001', 'T1047')).toBe(true);
    expect(techniqueRelated('T1047', 'T1059')).toBe(false);
  });

  it('sampleBase takes the first 8 chars', () => {
    expect(sampleBase('f3475224-wmi-incoming.json')).toBe('f3475224');
  });
});
