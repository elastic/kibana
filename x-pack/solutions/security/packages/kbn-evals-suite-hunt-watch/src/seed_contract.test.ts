/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import Path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { canaryDataset } from '../datasets/canary';
import { goldenDataset } from '../datasets/golden';
import { hardCases } from '../datasets/hard_cases';
import { holdoutDataset } from '../datasets/holdout';
import {
  AWS_IAM_REPORT_SLUGS,
  GENERATED_AWS_IAM_REPORT_IDS,
  HISTORIC_REPORTS_PER_SCENARIO,
  HOLDOUT_REPORT_IDS,
  HUNT_BLOCKED_SPACE_ID,
  HUNT_REPORT_IDS,
  HUNT_REPORT_IOC_BOUND,
  IOC_DUMP_IOC_COUNT,
  SPACE_COPY_SOURCES,
  SPACE_REPORT_IDS,
  TI_REPORT_MISSING_ID,
} from './constants';
import {
  ALL_SEEDED_REPORT_IDS,
  buildCanaryReportDoc,
  buildIocDumpReportDoc,
  HUNT_INVESTIGATION_ID_NAMESPACE,
  HUNT_INVESTIGATION_UUID_NAMESPACE,
} from './seed_hunt_data';

const readRepoFile = (...segments: string[]): string =>
  readFileSync(Path.join(REPO_ROOT, ...segments), 'utf8');

const generatorSource = readRepoFile(
  'x-pack/solutions/security/plugins/security_solution/scripts/data/lib/threat_intel_fixtures.ts'
);
const alertzeroRoot = 'x-pack/solutions/security/plugins/alertzero';

/** The generator source text for one aws-iam scenario, from its `reportIdSlug` to the next scenario. */
const scenarioSource = (slug: string): string => {
  const start = generatorSource.indexOf(`reportIdSlug: '${slug}',`);
  if (start === -1) return '';
  const next = generatorSource.indexOf('packId:', start);
  return generatorSource.slice(start, next === -1 ? undefined : next);
};

const allDatasetRows = [...goldenDataset, ...hardCases, ...canaryDataset, ...holdoutDataset];
const knownReportIds = new Set<string>([
  ...ALL_SEEDED_REPORT_IDS,
  ...HOLDOUT_REPORT_IDS,
  TI_REPORT_MISSING_ID,
]);

describe('generator id drift', () => {
  it.each(AWS_IAM_REPORT_SLUGS)('returns the generator source declaring slug %s', (slug) => {
    expect(scenarioSource(slug)).not.toBe('');
  });

  it('returns exactly the aws-iam scenarios the suite binds to', () => {
    const awsIamBlock = generatorSource.slice(
      generatorSource.indexOf("'aws-iam': ["),
      generatorSource.indexOf('kubernetes: [')
    );
    expect(awsIamBlock.match(/reportIdSlug: '/g)).toHaveLength(AWS_IAM_REPORT_SLUGS.length);
  });

  it('returns the historic id scheme the suite constants use', () => {
    expect(generatorSource).toContain('`ti-report-${scenario.reportIdSlug}-${item.itemKey}`');
  });

  it('returns the zero-padded historic item key format', () => {
    expect(generatorSource).toContain("`historic-${String(slot).padStart(2, '0')}`");
  });

  it('returns one seeded id per scenario and historic slot', () => {
    expect(GENERATED_AWS_IAM_REPORT_IDS).toHaveLength(
      AWS_IAM_REPORT_SLUGS.length * HISTORIC_REPORTS_PER_SCENARIO
    );
  });
});

describe('Investigation id binding', () => {
  it('returns the namespace string the alertzero plugin hashes', () => {
    expect(readRepoFile(alertzeroRoot, 'common/constants.ts')).toContain(
      `HUNT_INVESTIGATION_ID_NAMESPACE = '${HUNT_INVESTIGATION_ID_NAMESPACE}'`
    );
  });

  it('returns the hash material the alertzero plugin derives the id from', () => {
    expect(
      readRepoFile(alertzeroRoot, 'server/services/watches/hunt/common/hunt_investigation_id.ts')
    ).toContain('`${HUNT_INVESTIGATION_ID_NAMESPACE}${spaceId}|${reportId}`');
  });

  it('returns the frozen uuid namespace the alertzero plugin hashes with', () => {
    expect(
      readRepoFile(alertzeroRoot, 'server/services/watches/hunt/common/hunt_investigation_id.ts')
    ).toContain(`HUNT_INVESTIGATION_UUID_NAMESPACE = '${HUNT_INVESTIGATION_UUID_NAMESPACE}'`);
  });
});

describe('scenario fixtures match what dataset rows claim', () => {
  // Each row: the scenario the dataset binds to, tokens its generator source must contain, and
  // tokens it must not.
  const cases: Array<{ name: string; slug: string; contains: string[]; omits: string[] }> = [
    {
      name: 'golden hit (behavior-only): article-only TEST-NET-2 decoys, AssumeRole technique',
      slug: 'aws-iam-behavior-only',
      contains: ['joinIocsArticleOnly: true', '198.51.100.40', '198.51.100.41', 'T1078.004'],
      omits: ['192.0.2.30'],
    },
    {
      name: 'golden clean: article-only TEST-NET-3 decoys, T1110.003 only',
      slug: 'aws-iam-clean',
      contains: ['joinIocsArticleOnly: true', '203.0.113.60', '203.0.113.61', 'T1110.003'],
      omits: ['192.0.2.30', '198.51.100.40', 'T1078.004'],
    },
    {
      name: 'difficult hit (ioc-only): telemetry IOCs, no technique ids',
      slug: 'aws-iam-ioc-only',
      contains: ['192.0.2.30', 'dev-user@corp.example', 'mitre: []'],
      omits: ['joinIocsArticleOnly: true'],
    },
    {
      name: 'multi-candidate (aws-iam): telemetry IOCs and two Tier 2 techniques',
      slug: 'aws-iam',
      contains: ['192.0.2.30', 'T1078.004', 'T1562.008'],
      omits: ['joinIocsArticleOnly: true'],
    },
    {
      name: 'multi-candidate (assume-role): telemetry IOCs and endpoint technique',
      slug: 'aws-iam-assume-role',
      contains: ['192.0.2.30', 'T1078.004', 'T1059.001'],
      omits: ['joinIocsArticleOnly: true'],
    },
  ];

  const containsRows = cases.flatMap(({ name, slug, contains }) =>
    contains.map((token) => [name, slug, token] as const)
  );
  const omitsRows = cases.flatMap(({ name, slug, omits }) =>
    omits.map((token) => [name, slug, token] as const)
  );

  it.each(containsRows)('%s [%s]: returns a source containing %s', (_name, slug, token) => {
    expect(scenarioSource(slug)).toContain(token);
  });

  it.each(omitsRows)('%s [%s]: returns a source omitting %s', (_name, slug, token) => {
    expect(scenarioSource(slug)).not.toContain(token);
  });
});

describe('canary report', () => {
  const doc = buildCanaryReportDoc('2026-01-01T00:00:00.000Z');
  const serialized = JSON.stringify(doc);

  it('returns no IPv4 addresses', () => {
    expect(serialized).not.toMatch(
      /\b\d{1,3}(\.|\[\.\])\d{1,3}(\.|\[\.\])\d{1,3}(\.|\[\.\])\d{1,3}\b/
    );
  });

  it('returns no ATT&CK technique ids', () => {
    expect(serialized).not.toMatch(/\bT\d{4}(\.\d{3})?\b/);
  });

  it('returns no email addresses', () => {
    expect(doc.content.body_text).not.toMatch(/\S+@\S+/);
  });

  it('returns an empty extracted IOC list', () => {
    expect(doc.extracted.iocs).toEqual([]);
  });

  it('returns an empty extracted technique list', () => {
    expect(doc.extracted.ttps.techniques).toEqual([]);
  });

  it('returns no seeded evidence', () => {
    expect(doc).not.toHaveProperty('evidence');
  });

  it('stamps content.published_at to match generator historic reports', () => {
    expect(doc.content.published_at).toBe('2026-01-01T00:00:00.000Z');
  });
});

describe('IOC dump report', () => {
  const doc = buildIocDumpReportDoc('2026-01-01T00:00:00.000Z');

  it('stamps content.published_at to match generator historic reports', () => {
    expect(doc.content.published_at).toBe('2026-01-01T00:00:00.000Z');
  });

  it('returns the per-hunt IOC bound the coordinator enforces', () => {
    const source = readRepoFile(
      alertzeroRoot,
      'server/services/watches/hunt/common/load_report_context.ts'
    );
    expect(source).toContain(`export const MAX_HUNT_REPORT_IOCS = ${HUNT_REPORT_IOC_BOUND};`);
  });

  it('returns one IOC more than a hunt accepts', () => {
    expect(doc.extracted.iocs).toHaveLength(HUNT_REPORT_IOC_BOUND + 1);
  });

  it('returns only distinct TEST-NET-3 addresses, which no seeded telemetry uses', () => {
    const values = doc.extracted.iocs.map((ioc) => ioc.value);
    expect(new Set(values).size).toBe(IOC_DUMP_IOC_COUNT);
    expect(values.every((value) => /^203\.0\.113\.\d{1,3}$/.test(value))).toBe(true);
  });

  it('returns ip IOCs only, so every one counts toward the Tier 1 bound', () => {
    expect(doc.extracted.iocs.every((ioc) => ioc.type === 'ip')).toBe(true);
  });

  it('returns no ATT&CK technique ids for Tier 2 to anchor on', () => {
    expect(JSON.stringify(doc)).not.toMatch(/\bT\d{4}(\.\d{3})?\b/);
  });

  it('returns no seeded evidence', () => {
    expect(doc).not.toHaveProperty('evidence');
  });
});

describe('locked Investigation report', () => {
  it('returns a default-space copy id derived from the clean report', () => {
    expect(HUNT_REPORT_IDS.lockedInvestigation).toBe(`${HUNT_REPORT_IDS.clean}-locked`);
  });

  it('returns an id distinct from every generator and space-copy id', () => {
    expect([
      ...GENERATED_AWS_IAM_REPORT_IDS,
      ...SPACE_COPY_SOURCES.map((c) => c.copyReportId),
    ]).not.toContain(HUNT_REPORT_IDS.lockedInvestigation);
  });
});

describe('space isolation fixtures', () => {
  it.each(SPACE_COPY_SOURCES)(
    'returns a copy id of <source>-<space> for $spaceId',
    ({ sourceReportId, spaceId, copyReportId }) => {
      expect(copyReportId).toBe(`${sourceReportId}-${spaceId}`);
    }
  );

  it.each(SPACE_COPY_SOURCES)(
    'returns a generator-seeded source report for $spaceId',
    ({ sourceReportId }) => {
      expect(GENERATED_AWS_IAM_REPORT_IDS).toContain(sourceReportId);
    }
  );

  it('returns distinct copy ids for hunt-a and hunt-b so each space has its own Investigation', () => {
    expect(SPACE_REPORT_IDS.spaceA).not.toBe(SPACE_REPORT_IDS.spaceB);
  });

  it('returns the blocked copy bound to the hunt-blocked space', () => {
    expect(SPACE_COPY_SOURCES.find((c) => c.spaceId === HUNT_BLOCKED_SPACE_ID)?.copyReportId).toBe(
      SPACE_REPORT_IDS.blocked
    );
  });
});

describe('dataset bindings', () => {
  it('returns unique example ids', () => {
    const ids = allDatasetRows.map((row) => row.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(allDatasetRows.map((row) => [row.id, row] as const))(
    'returns only known report ids for %s',
    (_id, row) => {
      const ids = [...row.input.reportIds, ...row.output.expected.reports.map((r) => r.reportId)];
      expect(ids.filter((id) => !knownReportIds.has(id))).toEqual([]);
    }
  );

  it.each(allDatasetRows.map((row) => [row.id, row] as const))(
    'returns expectations only for reports %s triggers',
    (_id, row) => {
      const triggered = new Set(row.input.reportIds);
      expect(row.output.expected.reports.filter((r) => !triggered.has(r.reportId))).toEqual([]);
    }
  );

  it('returns the three golden rows the README documents', () => {
    expect(goldenDataset.map((row) => row.id)).toEqual([
      'golden-hit-aws-iam-behavior-only',
      'golden-clean-aws-iam-clean',
      'golden-blocked-empty-index-scope',
    ]);
  });

  it('returns the six hard rows the README documents', () => {
    expect(hardCases.map((row) => row.id)).toEqual([
      'hard-multi-candidate',
      'hard-clean-repeat',
      'hard-no-candidates-missing-report',
      'hard-difficult-hit-ioc-only',
      'hard-partial-ioc-dump',
      'hard-failed-locked-investigation',
    ]);
  });

  it('returns the locked row as the only one staging a fault', () => {
    expect(allDatasetRows.filter((row) => row.input.fault).map((row) => row.id)).toEqual([
      'hard-failed-locked-investigation',
    ]);
  });

  it('returns a single canary row', () => {
    expect(canaryDataset).toHaveLength(1);
  });

  it('returns three named reports for multi-candidate', () => {
    expect(HUNT_REPORT_IDS.multiCandidate).toHaveLength(3);
  });

  it('returns holdout ids within the seeded historic slots', () => {
    const maxSlot = Math.max(...HOLDOUT_REPORT_IDS.map((id) => Number(id.slice(-2))));
    expect(maxSlot).toBeLessThanOrEqual(HISTORIC_REPORTS_PER_SCENARIO);
  });
});
