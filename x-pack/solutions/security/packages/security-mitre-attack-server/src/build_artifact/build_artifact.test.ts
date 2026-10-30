/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MITRE_FRAMEWORKS } from '@kbn/security-mitre-attack-common';
import { getMockAtlasStixBundle, getMockStixBundle } from './stix_entities.mock';
import {
  MITRE_FRAMEWORK_DEFINITIONS,
  buildMitreArtifact,
  mapBundleToMitreEntities,
  normalizeAtlasVersion,
} from './build_artifact';
import type { FrameworkDefinition } from './build_artifact';
import { fetchStixBundle } from './fetch_stix_bundle';

jest.mock('./fetch_stix_bundle');

const fetchStixBundleMock = fetchStixBundle as jest.MockedFunction<typeof fetchStixBundle>;

const enterpriseBundle = getMockStixBundle();
const atlasBundle = getMockAtlasStixBundle();

const ENTERPRISE_URL_PREFIX = 'https://raw.githubusercontent.com/mitre/cti/';
const ATLAS_URL_PREFIX = 'https://github.com/mitre-atlas/atlas-data/releases/download/';

/** Returns the pinned definition for a framework, with its versions replaced by `versions`. */
const getDefinition = (
  framework: FrameworkDefinition['framework'],
  versions: readonly string[]
): FrameworkDefinition => {
  const definition = MITRE_FRAMEWORK_DEFINITIONS.find((def) => def.framework === framework);
  if (definition === undefined) {
    throw new Error(`No framework definition for '${framework}'`);
  }
  return { ...definition, versions };
};

describe('MITRE_FRAMEWORK_DEFINITIONS', () => {
  it('defines exactly one entry per supported framework', () => {
    expect(MITRE_FRAMEWORK_DEFINITIONS.map((def) => def.framework).sort()).toEqual(
      [...MITRE_FRAMEWORKS].sort()
    );
  });

  it('pins at least one version per framework', () => {
    for (const definition of MITRE_FRAMEWORK_DEFINITIONS) {
      expect(definition.versions.length).toBeGreaterThan(0);
    }
  });

  it('builds the enterprise bundle URL from the mitre/cti tag', () => {
    const enterprise = getDefinition('enterprise', []);
    expect(enterprise.sourceName).toBe('mitre-attack');
    expect(enterprise.bundleUrl('ATT&CK-v19.2')).toBe(
      `${ENTERPRISE_URL_PREFIX}ATT&CK-v19.2/enterprise-attack/enterprise-attack.json`
    );
    expect(enterprise.toFrameworkVersion('ATT&CK-v19.2')).toBe('19.2');
  });

  it('builds the atlas bundle URL from the atlas-data release tag', () => {
    const atlas = getDefinition('atlas', []);
    expect(atlas.sourceName).toBe('mitre-atlas');
    expect(atlas.bundleUrl('v2026.08')).toBe(`${ATLAS_URL_PREFIX}v2026.08/stix-atlas.json`);
    expect(atlas.toFrameworkVersion('v2026.08')).toBe('2026.8');
  });
});

describe('normalizeAtlasVersion', () => {
  it.each([
    ['v2026.08', '2026.8'],
    ['v2026.10', '2026.10'],
    ['v5.1.0', '5.1.0'],
    ['v4.9.0', '4.9.0'],
    ['2026.08', '2026.8'],
    ['v2026.00', '2026.0'],
  ])('normalizes %s to %s', (tag, expected) => {
    expect(normalizeAtlasVersion(tag)).toBe(expected);
  });

  it('leaves non-numeric segments untouched', () => {
    expect(normalizeAtlasVersion('v2026.08-rc1')).toBe('2026.08-rc1');
  });
});

describe('mapBundleToMitreEntities', () => {
  it('stamps every entity with the supplied framework and framework_version', () => {
    // Uses '18.0' as a random version example
    const entities = mapBundleToMitreEntities(
      enterpriseBundle,
      'enterprise',
      '18.0',
      'mitre-attack'
    );
    expect(entities.length).toBeGreaterThan(0);
    for (const entity of entities) {
      expect(entity.framework).toBe('enterprise');
      expect(entity.framework_version).toBe('18.0');
    }
  });

  it('maps an ATLAS bundle through the mitre-atlas source name', () => {
    const entities = mapBundleToMitreEntities(atlasBundle, 'atlas', '2026.8', 'mitre-atlas');
    expect(entities.map((entity) => entity.id).sort()).toEqual([
      'AML.T0024',
      'AML.T0024.002',
      'AML.TA0010',
    ]);
    for (const entity of entities) {
      expect(entity.framework).toBe('atlas');
      expect(entity.framework_version).toBe('2026.8');
    }
  });
});

describe('buildMitreArtifact', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    fetchStixBundleMock.mockImplementation(async (url) => {
      if (url.startsWith(ENTERPRISE_URL_PREFIX)) return enterpriseBundle;
      if (url.startsWith(ATLAS_URL_PREFIX)) return atlasBundle;
      throw new Error(`Unexpected bundle URL in test: ${url}`);
    });
  });

  it('derives the framework version from the content tag', async () => {
    const entities = await buildMitreArtifact([getDefinition('enterprise', ['ATT&CK-v19.1'])]);

    expect(fetchStixBundleMock).toHaveBeenCalledWith(
      `${ENTERPRISE_URL_PREFIX}ATT&CK-v19.1/enterprise-attack/enterprise-attack.json`
    );
    expect(entities.every((entity) => entity.framework_version === '19.1')).toBe(true);
  });

  it('fetches every pinned version and combines them into one entity set', async () => {
    const entities = await buildMitreArtifact([
      getDefinition('enterprise', ['ATT&CK-v19.1', 'ATT&CK-v18.0']),
    ]);

    expect(fetchStixBundleMock).toHaveBeenCalledTimes(2);

    const singleVersionCount = mapBundleToMitreEntities(
      enterpriseBundle,
      'enterprise',
      '19.1',
      'mitre-attack'
    ).length;
    expect(entities).toHaveLength(singleVersionCount * 2);
  });

  it('keeps entities of the same ID distinct per version', async () => {
    const entities = await buildMitreArtifact([
      getDefinition('enterprise', ['ATT&CK-v19.1', 'ATT&CK-v18.0']),
    ]);

    const versionsForTactic = entities
      .filter((entity) => entity.id === 'TA0006')
      .map((entity) => entity.framework_version)
      .sort();

    expect(versionsForTactic).toEqual(['18.0', '19.1']);
  });

  describe('with enterprise and atlas definitions', () => {
    const definitions = [
      getDefinition('enterprise', ['ATT&CK-v19.2']),
      getDefinition('atlas', ['v2026.08']),
    ];

    it('fetches one bundle per framework version from the framework-specific URL', async () => {
      await buildMitreArtifact(definitions);

      expect(fetchStixBundleMock).toHaveBeenCalledTimes(2);
      expect(fetchStixBundleMock).toHaveBeenCalledWith(
        `${ENTERPRISE_URL_PREFIX}ATT&CK-v19.2/enterprise-attack/enterprise-attack.json`
      );
      expect(fetchStixBundleMock).toHaveBeenCalledWith(
        `${ATLAS_URL_PREFIX}v2026.08/stix-atlas.json`
      );
    });

    it('stamps each entity with the framework of the bundle it came from', async () => {
      const entities = await buildMitreArtifact(definitions);

      const enterpriseIds = entities.filter((e) => e.framework === 'enterprise').map((e) => e.id);
      const atlasIds = entities.filter((e) => e.framework === 'atlas').map((e) => e.id);

      expect(enterpriseIds.sort()).toEqual(['T1003', 'T1003.001', 'TA0006']);
      expect(atlasIds.sort()).toEqual(['AML.T0024', 'AML.T0024.002', 'AML.TA0010']);
    });

    it('normalizes the atlas version and strips the ATT&CK prefix', async () => {
      const entities = await buildMitreArtifact(definitions);

      const versionsByFramework = new Map<string, Set<string>>();
      for (const entity of entities) {
        const versions = versionsByFramework.get(entity.framework) ?? new Set<string>();
        versions.add(entity.framework_version);
        versionsByFramework.set(entity.framework, versions);
      }

      expect([...(versionsByFramework.get('enterprise') ?? [])]).toEqual(['19.2']);
      expect([...(versionsByFramework.get('atlas') ?? [])]).toEqual(['2026.8']);
    });

    it('resolves tactic_ids within the owning framework only', async () => {
      const entities = await buildMitreArtifact(definitions);

      const nonTactics = entities.filter(
        (entity) => entity.type === 'technique' || entity.type === 'subtechnique'
      );
      expect(nonTactics.length).toBeGreaterThan(0);
      for (const entity of nonTactics) {
        const tacticIdsInFramework = new Set(
          entities
            .filter((e) => e.type === 'tactic' && e.framework === entity.framework)
            .map((e) => e.id)
        );
        expect(entity.tactic_ids.length).toBeGreaterThan(0);
        for (const tacticId of entity.tactic_ids) {
          expect(tacticIdsInFramework).toContain(tacticId);
        }
      }

      const atlasTechnique = entities.find((e) => e.id === 'AML.T0024');
      expect(atlasTechnique?.type === 'technique' && atlasTechnique.tactic_ids).toEqual([
        'AML.TA0010',
      ]);
    });

    it('derives the atlas subtechnique technique_id from its parent, keeping the AML prefix', async () => {
      const entities = await buildMitreArtifact(definitions);

      const atlasSubtechnique = entities.find((e) => e.id === 'AML.T0024.002');
      expect(atlasSubtechnique?.type).toBe('subtechnique');
      expect(atlasSubtechnique?.type === 'subtechnique' && atlasSubtechnique.technique_id).toBe(
        'AML.T0024'
      );
    });

    it("ignores an atlas technique's secondary mitre-attack external reference", async () => {
      const entities = await buildMitreArtifact(definitions);

      // The mock ATLAS technique also references ATT&CK T1567. Neither the id nor the
      // attack.mitre.org URL may leak into the atlas entity.
      const atlasTechnique = entities.find((e) => e.framework === 'atlas' && e.id === 'AML.T0024');
      expect(atlasTechnique).toBeDefined();
      expect(atlasTechnique?.reference).toBe('https://atlas.mitre.org/techniques/AML.T0024/');
      expect(entities.some((e) => e.id === 'T1567')).toBe(false);
    });
  });
});
