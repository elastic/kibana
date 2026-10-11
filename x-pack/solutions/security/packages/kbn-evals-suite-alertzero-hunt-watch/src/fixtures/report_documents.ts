/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Ad2Manifest, CorpusSample } from './load_corpus';
import { sampleBase } from '../datasets/labels';

/**
 * Builds the ingest documents for the report plan (design v1 §1 Reports,
 * v5 §1.3 arms). R-beh texts are derived from the manifest step
 * descriptions: chain hosts/users, sinkhole zones, payload hashes and rule
 * names never appear (the leak audit in phases.ts enforces it). R-ioc
 * carries the chain's zones and payload hashes with no techniques; R-decoy
 * classes carry only what their class definition allows. Arm B pre-populates
 * `extracted.ttps.techniques` from the manifest step (design v5 §1.3).
 */

export type ReportArm = 'A' | 'B';

export interface ReportSpec {
  /** Stable run key, e.g. R-beh[bits-mshta]. */
  runKey: string;
  reportClass: 'R-ioc' | 'R-beh-A' | 'R-beh-B' | 'R-decoy(a)' | 'R-decoy(bcd)-A';
  chain?: string;
  /** sample base this report's tier-2 label derives from (R-beh/R-decoy(bcd)). */
  sampleBase?: string;
  document: Record<string, unknown>;
}

const PAYLOAD_HASHES = {
  md5: 'd41d8cd98f00b204e9800998ecf8427e',
  sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
};

const titleCase = (s: string): string =>
  s
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

/**
 * The R-beh narrative: the chain's step descriptions joined into prose.
 * Technique ATT&CK names are not restated (Tier 2 must extract them), and no
 * E+ token (host, user, zone, hash, rule name) appears: the vendored step
 * texts mention the chains' users and hosts, so every token that also occurs
 * in the seeded samples is redacted here (same leaf flattening and token
 * family as the C2 audit in harness/phases.ts; duplicated because fixtures
 * cannot import the harness — the harness imports the fixtures).
 */
const redactSeededTokens = (text: string, seededTexts: string[]): string => {
  const tokens = new Set<string>();
  for (const seeded of seededTexts) {
    for (const m of seeded.matchAll(/(?:^|\.)((?:user|host)\.name): ([A-Za-z0-9._\\-]+)\s*$/gm)) {
      tokens.add(m[2].split('@')[0]);
      tokens.add(m[2]);
    }
  }
  let out = text;
  for (const t of tokens) {
    if (t.length > 3) out = out.split(t).join('[redacted]');
  }
  return out;
};

/** `user.name: value` / `host.name: value` lines for every leaf of a nested doc. */
const flattenLeaves = (doc: unknown, prefix = ''): string => {
  if (Array.isArray(doc)) return doc.map((x) => flattenLeaves(x, prefix)).join('\n');
  if (typeof doc === 'object' && doc !== null) {
    return Object.entries(doc)
      .map(([k, v]) => flattenLeaves(v, prefix ? `${prefix}.${k}` : k))
      .join('\n');
  }
  return `${prefix}: ${String(doc)}`;
};

const behaviourNarrative = (
  chainSteps: ReadonlyArray<Record<string, unknown>>,
  seededTexts: string[]
): string =>
  `${redactSeededTokens(
    chainSteps
      .map((s) => String(s.step ?? ''))
      .filter((s) => s.length > 0)
      .map((s) => s.replace(/\(.*?\)/g, '').trim())
      .filter((s) => s.length > 0)
      .join('. '),
    seededTexts
  )}. Observations are consistent with a multi-stage intrusion; the report describes execution flow only.`;

const DECOY_NARRATIVES: Record<string, string> = {
  // (b): a technique narrative with no planted counterpart.
  'R-decoy(b)':
    'Adversary encrypts data for impact: ransomware-style volume shadow copies are deleted and symmetric encryption is applied to user documents before a ransom note is staged. Impact is the goal; no exfiltration indicator is present.',
  // (c): a cloud narrative against an endpoint-only slice.
  'R-decoy(c)':
    'An identity provider grants a suspicious OAuth consent scope to a third-party application, followed by mailbox access from an unfamiliar autonomous system. Cloud identity abuse with no endpoint telemetry involved.',
  // (d): a KEV-style vendor/product report for a product absent from the universe.
  'R-decoy(d)':
    'Remote code execution affects an industrial HMI visualization suite; the vendor advisory recommends patching the historian component. Exploitation is observed in the wild against unpatched deployments.',
};

export const buildReportSpecs = (
  manifest: Ad2Manifest,
  samples: Record<string, CorpusSample>,
  arm: ReportArm = 'A'
): ReportSpec[] => {
  const specs: ReportSpec[] = [];
  const zones = manifest.sinkhole_zones;
  const stepTechniques = (chainKey: string, index: number): string[] => {
    const chain = manifest.chains.find((c) => c.key === chainKey);
    const step = chain?.steps?.[index];
    return (step?.techniques ?? []) as string[];
  };

  for (const chain of manifest.chains) {
    const steps = (chain.steps ?? []).filter((s) => s.sample);
    const firstSample = steps[0]?.sample;
    const firstBase = firstSample
      ? sampleBase(String(firstSample).split('/').pop() ?? '')
      : undefined;

    // R-ioc[c]: the chain's sinkhole zones plus payload hashes, no techniques.
    const chainZones = zones.filter((zone) => {
      const sampleList = Object.values(samples);
      return sampleList.some((s) => s.chain === chain.key && JSON.stringify(s).includes(zone));
    });
    specs.push({
      runKey: `R-ioc[${chain.key}]`,
      reportClass: 'R-ioc',
      chain: chain.key,
      document: {
        'content.title': `Threat report: ${titleCase(chain.key)} infrastructure activity`,
        'content.body_text': `Indicator package for observed ${chain.key} activity. Domains and file hashes below are confirmed malicious by the reporting source. Short text; no behavioural analysis is included.`,
        'source.name': 'g5-ad2-seeded-recall',
        'severity.level': 'high',
        'extracted.iocs': [
          ...chainZones.map((zone) => ({ type: 'domain', value: zone })),
          { type: 'hash_md5', value: PAYLOAD_HASHES.md5 },
          { type: 'hash_sha256', value: PAYLOAD_HASHES.sha256 },
        ],
      },
    });

    // R-beh[c]: the behaviour narrative, techniques stripped (Arm A) or
    // pre-populated from the first step (Arm B, design v5 §1.3).
    const behClass = arm === 'A' ? 'R-beh-A' : 'R-beh-B';
    specs.push({
      runKey: `R-beh[${chain.key}]`,
      reportClass: behClass,
      chain: chain.key,
      sampleBase: firstBase,
      document: {
        'content.title': `Behaviour report: ${titleCase(chain.key)} campaign`,
        'content.body_text': behaviourNarrative(
          chain.steps ?? [],
          Object.values(samples).map((s) => flattenLeaves(s))
        ),
        'source.name': 'g5-ad2-seeded-recall',
        'severity.level': 'high',
        ...(arm === 'B' && firstBase
          ? { 'extracted.ttps.techniques': stepTechniques(chain.key, 0) }
          : {}),
      },
    });
  }

  // R-decoy(a): lookalike IoCs absent from every environment.
  specs.push({
    runKey: 'R-decoy(a)',
    reportClass: 'R-decoy(a)',
    document: {
      'content.title': 'Threat report: lookalike infrastructure',
      'content.body_text':
        'Indicator package for a campaign using registry-key persistence and an unsigned driver load. Values below are confirmed malicious by the reporting source.',
      'source.name': 'g5-ad2-seeded-recall',
      'severity.level': 'medium',
      'extracted.iocs': [
        { type: 'domain', value: 'malicious-c2.example.co' },
        { type: 'hash_sha256', value: `f${'0'.repeat(63)}` },
        { type: 'hash_md5', value: `a${'0'.repeat(31)}` },
      ],
    },
  });

  // R-decoy (b), (c), (d): technique/narrative decoys, no IoCs, no techniques.
  for (const [cls, narrative] of Object.entries(DECOY_NARRATIVES)) {
    specs.push({
      runKey: cls,
      reportClass: 'R-decoy(bcd)-A',
      document: {
        'content.title': `Threat report: ${cls} narrative`,
        'content.body_text': narrative,
        'source.name': 'g5-ad2-seeded-recall',
        'severity.level': 'medium',
      },
    });
  }

  return specs;
};
