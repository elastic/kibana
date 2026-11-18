/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mappingFromFieldMap } from '@kbn/alerting-plugin/common';
import { verifyAdditive } from '@kbn/es-index-migration';
import type { AdditiveVersion } from '@kbn/es-index-migration';
import { assetCriticalityFieldMap, ASSET_CRITICALITY_MAPPINGS_VERSIONS } from '../constants';
import { assetCriticalityMigration } from './asset_criticality_migration';

const mappingsAt = (version: number) =>
  (assetCriticalityMigration.versions[version] as AdditiveVersion).mappings;

/**
 * Leaf paths in dotted form.
 *
 * `mappingFromFieldMap` nests dotted keys into objects, so `entity.id` in the field map
 * becomes `entity: { properties: { id } }` in the mappings. Flattening back is what lets
 * the two be compared.
 */
const leafPaths = (node: { properties?: Record<string, unknown> }, prefix = ''): string[] =>
  Object.entries(node.properties ?? {}).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    const child = value as { properties?: Record<string, unknown> };
    return child.properties ? leafPaths(child, path) : [path];
  });

const fieldsAt = (version: number) => leafPaths(mappingsAt(version)).sort();

describe('declared Asset Criticality migration', () => {
  it('declares a single step, matching what the hand-written client does', () => {
    // `isMappingsMigrationRequired` compares one number and `migrateMappings` applies the
    // current mappings wholesale - it never walks intermediate shapes, so declaring them
    // would model a sequence the code being replaced does not have.
    expect(Object.keys(assetCriticalityMigration.versions).map(Number)).toEqual([1, 2]);
  });

  it('produces mappings identical to the hand-written path at the current version', () => {
    // The whole comparison rests on this: the declaration must build its mappings the
    // same way the data client does, or the POC would be testing a conversion rather
    // than the library.
    expect(mappingsAt(2)).toEqual(mappingFromFieldMap(assetCriticalityFieldMap, 'strict'));
  });

  it('keeps every field the live field map has', () => {
    expect(fieldsAt(2)).toEqual(Object.keys(assetCriticalityFieldMap).sort());
  });

  it('adds exactly the fields the version bumps added, and nothing else', () => {
    const before = fieldsAt(1);
    const after = fieldsAt(2);

    expect(after.filter((field) => !before.includes(field)).sort()).toEqual(
      [
        'service.name',
        'service.asset.criticality',
        'event.ingested',
        'entity.id',
        'entity.asset.criticality',
      ].sort()
    );
  });

  it('removes nothing', () => {
    expect(fieldsAt(2)).toEqual(expect.arrayContaining(fieldsAt(1)));
  });

  it('passes the gate as genuinely additive', () => {
    // defineMigration already throws on a violation, so this asserts the reason it does
    // not: collapsing the history into one step is only safe because every change in it
    // was an addition.
    const result = verifyAdditive(mappingsAt(1), mappingsAt(2));

    expect(result.violations).toEqual([]);
    expect(result.drift).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it('still reflects the live version constant', () => {
    // Collapsing the steps does not mean ignoring the constant: a bump means the live
    // field map changed, and the test above will catch it if this declaration has not.
    expect(ASSET_CRITICALITY_MAPPINGS_VERSIONS).toBe(4);
  });

  it('resolves a separate index per space, which is what isolates the POC', () => {
    const name = assetCriticalityMigration.resource.name as (namespace: string) => string;

    expect(name('migpoc-library')).not.toBe(name('migpoc-legacy'));
    expect(name('migpoc-library')).toContain('migpoc-library');
  });

  it('is triggered only, so nothing runs it unattended', () => {
    expect(assetCriticalityMigration.execution).toBe('triggered');
  });
});
