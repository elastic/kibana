/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CorpusSample, ManifestChain } from '../fixtures/load_corpus';

/**
 * Labels are derived mechanically from the ad2-v1 manifest and its samples,
 * never written by hand (design v1 §1). The unit of truth per item:
 * - planted IoC -> (value, set of seeded doc ids carrying it in E+)
 * - planted behaviour -> (chain, step, technique ids, seeded doc ids, hosts, users)
 * - twin-removed link -> (chain, step, technique ids, twin doc ids that must NOT match)
 */

export type SeededDocId = string; // `${sampleFile}#${docIndex}#${side}`

export interface PlantedIoc {
  value: string;
  type: string;
  docIds: SeededDocId[];
}

export interface PlantedBehaviour {
  chain: string;
  step: string;
  techniques: string[];
  positiveDocIds: SeededDocId[];
}

export interface CorpusLabels {
  /** manifest chains[].key in manifest order */
  manifestChains: string[];
  /** sample file base (8 hex chars) -> manifest chain key; total and injective by construction */
  chainOf: Record<string, string>;
  /** sample file base -> techniques of the step whose sample is that file */
  techOf: Record<string, string[]>;
  plantedIocs: PlantedIoc[];
  plantedBehaviours: PlantedBehaviour[];
  seededStreams: string[];
  fixtureStreams: string[];
  /** R-ioc zone -> chain(s) whose samples carry that zone in any doc text */
  rIocZoneChains: Record<string, string | null>;
}

export const sampleBase = (fileName: string): string => fileName.slice(0, 8);

const collectSeededStreams = (
  samples: Record<string, CorpusSample>
): { seeded: string[]; fixtures: string[] } => {
  const seeded = new Set<string>();
  const fixtures = new Set<string>();
  for (const sample of Object.values(samples)) {
    for (const part of ['positive', 'negative'] as const) {
      for (const d of sample[part]?.docs ?? []) seeded.add(`${d.stream}-default`);
    }
    for (const d of sample.fixtures ?? []) fixtures.add(`${d.stream}-default`);
  }
  return { seeded: [...seeded].sort(), fixtures: [...fixtures].sort() };
};

/** See rev7_check.py zone_chains: which chains mention each sinkhole zone in doc text. */
export const deriveRIocZoneChains = (
  samples: Record<string, CorpusSample>,
  sinkholeZones: string[]
): Record<string, string | null> => {
  const zoneChains: Record<string, Set<string>> = {};
  for (const [name, sample] of Object.entries(samples)) {
    const text = JSON.stringify(sample);
    for (const zone of sinkholeZones) {
      if (text.includes(zone)) {
        zoneChains[zone] ??= new Set();
        zoneChains[zone].add(sample.chain);
      }
    }
    void name;
  }
  const out: Record<string, string | null> = {};
  for (const zone of sinkholeZones) {
    const chains = zoneChains[zone] ?? new Set<string>();
    if (chains.size > 1) {
      throw new Error(`zone ${zone} appears in several chains: ${[...chains].join(', ')}`);
    }
    out[zone] = chains.size === 1 ? [...chains][0] : null;
  }
  return out;
};

/**
 * ECS fields Tier 1 searches for a domain IoC (IOC_FIELDS_BY_TYPE.domain in
 * tier1/attribute_hits.ts at the pin). A planted IoC must occur in one of
 * these fields of a seeded positive doc; prose or a command line does not
 * plant it.
 */
const DOMAIN_IOC_FIELDS = [
  'dns.question.name',
  'destination.domain',
  'url.domain',
  'source.domain',
];

const getIn = (doc: Record<string, unknown>, path: string): unknown => {
  let cur: unknown = doc;
  for (const part of path.split('.')) {
    if (cur === null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
};

const domainIocValuesIn = (doc: Record<string, unknown>): Set<string> => {
  const out = new Set<string>();
  for (const field of DOMAIN_IOC_FIELDS) {
    const v = getIn(doc, field);
    if (typeof v === 'string' && v.length > 0) out.add(v.toLowerCase());
    else if (Array.isArray(v))
      for (const x of v) if (typeof x === 'string') out.add(x.toLowerCase());
  }
  return out;
};

export const buildLabels = ({
  manifest,
  samples,
}: {
  manifest: { chains: ManifestChain[]; sinkhole_zones: string[] };
  samples: Record<string, CorpusSample>;
}): CorpusLabels => {
  const manifestChains = manifest.chains.map((c) => c.key);

  const chainOf: Record<string, string> = {};
  const techOf: Record<string, string[]> = {};
  const docId = (base: string, i: number, side: 'positive' | 'negative'): SeededDocId =>
    `${base}#${i}#${side}`;
  const plantedBehaviours: PlantedBehaviour[] = [];
  const plantedIocValues = new Map<string, PlantedIoc>();

  for (const chain of manifest.chains) {
    for (const step of chain.steps) {
      if (step.sample) {
        const fileName = step.sample.split('/').pop() ?? step.sample;
        const base = sampleBase(fileName);
        const prior = chainOf[base];
        if (prior !== undefined && prior !== chain.key) {
          throw new Error(`sample ${base} claimed by chains ${prior} and ${chain.key}`);
        }
        chainOf[base] = chain.key;
        techOf[base] = step.techniques ?? [];
        const sample = samples[fileName];
        if (sample) {
          plantedBehaviours.push({
            chain: chain.key,
            step: String(step.step),
            techniques: techOf[base],
            positiveDocIds: (sample.positive?.docs ?? []).map((_, i) => docId(base, i, 'positive')),
          });
          for (const d of sample.positive?.docs ?? []) {
            const values = domainIocValuesIn(d.doc);
            for (const zone of manifest.sinkhole_zones) {
              if (values.has(zone.toLowerCase())) {
                const entry = plantedIocValues.get(zone) ?? {
                  value: zone,
                  type: 'domain',
                  docIds: [],
                };
                entry.docIds.push(
                  docId(base, (sample.positive?.docs ?? []).indexOf(d), 'positive')
                );
                plantedIocValues.set(zone, entry);
              }
            }
          }
        }
      }
    }
  }

  // Totality and injectivity of the sample->chain mapping (design v3 §1.2 [R2-B4c]).
  const sampleBases = Object.keys(samples).map(sampleBase);
  const mapped = Object.keys(chainOf);
  if (mapped.length !== sampleBases.length || !sampleBases.every((b) => chainOf[b])) {
    throw new Error(`sample->chain mapping is not total: ${mapped.length}/${sampleBases.length}`);
  }

  const { seeded, fixtures } = collectSeededStreams(samples);

  return {
    manifestChains,
    chainOf,
    techOf,
    plantedIocs: [...plantedIocValues.values()],
    plantedBehaviours,
    seededStreams: seeded,
    fixtureStreams: fixtures,
    rIocZoneChains: deriveRIocZoneChains(samples, manifest.sinkhole_zones),
  };
};

/**
 * Techniques related by dot-floor equality (rev7_check.py `rel`): T1047.001
 * matches T1047 in either direction. Design v1 Q3 accepts parent/sub-technique.
 */
export const techniqueRelated = (a: string, b: string): boolean => {
  const x = a.toUpperCase();
  const y = b.toUpperCase();
  return x === y || x.split('.')[0] === y || y.split('.')[0] === x;
};
