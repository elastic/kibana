/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getMockStixBundle } from './stix_entities.mock';
import { buildMitreArtifact, mapBundleToMitreEntities } from './build_artifact';
import { fetchStixBundle } from './fetch_stix_bundle';

jest.mock('./fetch_stix_bundle');

const fetchStixBundleMock = fetchStixBundle as jest.MockedFunction<typeof fetchStixBundle>;

const bundle = getMockStixBundle();

describe('mapBundleToMitreEntities', () => {
  it('stamps every entity with the supplied framework and framework_version', () => {
    // Uses '18.0' as a random version example
    const entities = mapBundleToMitreEntities(bundle, 'enterprise', '18.0');
    for (const entity of entities) {
      expect(entity.framework).toBe('enterprise');
      expect(entity.framework_version).toBe('18.0');
    }
  });
});

describe('buildMitreArtifact', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    fetchStixBundleMock.mockResolvedValue(bundle);
  });

  it('derives the framework version from the content tag', async () => {
    const entities = await buildMitreArtifact(['ATT&CK-v19.1']);

    expect(fetchStixBundleMock).toHaveBeenCalledWith('ATT&CK-v19.1');
    expect(entities.every((entity) => entity.framework_version === '19.1')).toBe(true);
  });

  it('fetches every pinned version and combines them into one entity set', async () => {
    const entities = await buildMitreArtifact(['ATT&CK-v19.1', 'ATT&CK-v18.0']);

    expect(fetchStixBundleMock).toHaveBeenCalledTimes(2);

    const singleVersionCount = mapBundleToMitreEntities(bundle, 'enterprise', '19.1').length;
    expect(entities).toHaveLength(singleVersionCount * 2);
  });

  it('keeps entities of the same ID distinct per version', async () => {
    const entities = await buildMitreArtifact(['ATT&CK-v19.1', 'ATT&CK-v18.0']);

    const versionsForTactic = entities
      .filter((entity) => entity.id === 'TA0006')
      .map((entity) => entity.framework_version)
      .sort();

    expect(versionsForTactic).toEqual(['18.0', '19.1']);
  });
});
