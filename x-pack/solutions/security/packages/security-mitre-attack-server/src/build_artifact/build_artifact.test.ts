/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getMockStixBundle } from './stix_entities.mock';
import {
  buildMitreArtifact,
  mapBundleToMitreEntities,
  MITRE_CONTENT_VERSIONS,
  ATLAS_CONTENT_VERSIONS,
} from './build_artifact';
import { fetchStixBundle } from './fetch_stix_bundle';

jest.mock('./fetch_stix_bundle');

const fetchStixBundleMock = fetchStixBundle as jest.MockedFunction<typeof fetchStixBundle>;

const bundle = getMockStixBundle();

describe('mapBundleToMitreEntities', () => {
  it('stamps every entity with the supplied framework and framework_version', () => {
    const entities = mapBundleToMitreEntities(bundle, 'enterprise', '18.0');
    for (const entity of entities) {
      expect(entity.framework).toBe('enterprise');
      expect(entity.framework_version).toBe('18.0');
    }
  });

  it('stamps atlas entities with atlas framework', () => {
    const entities = mapBundleToMitreEntities(bundle, 'atlas', '2026.08', 'mitre-atlas');
    for (const entity of entities) {
      expect(entity.framework).toBe('atlas');
      expect(entity.framework_version).toBe('2026.08');
    }
  });
});

describe('buildMitreArtifact', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    fetchStixBundleMock.mockResolvedValue(bundle);
  });

  it('fetches enterprise and atlas bundles via their respective URLs', async () => {
    await buildMitreArtifact();

    const calls = fetchStixBundleMock.mock.calls.map(([url]) => url);
    const enterpriseTag = MITRE_CONTENT_VERSIONS[0];
    const atlasTag = ATLAS_CONTENT_VERSIONS[0];

    expect(calls.some((url) => url.includes(enterpriseTag))).toBe(true);
    expect(calls.some((url) => url.includes(atlasTag))).toBe(true);
  });

  it('fetches one bundle per framework version (enterprise + atlas)', async () => {
    await buildMitreArtifact();

    // One call per framework version: 1 enterprise + 1 atlas
    expect(fetchStixBundleMock).toHaveBeenCalledTimes(
      MITRE_CONTENT_VERSIONS.length + ATLAS_CONTENT_VERSIONS.length
    );
  });

  it('derives enterprise framework version from ATT&CK-v tag', async () => {
    const entities = await buildMitreArtifact();
    const enterpriseEntities = entities.filter((e) => e.framework === 'enterprise');
    const expectedVersion = MITRE_CONTENT_VERSIONS[0].replace(/^ATT&CK-v/, '');
    expect(enterpriseEntities.every((e) => e.framework_version === expectedVersion)).toBe(true);
  });
});
