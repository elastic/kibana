/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import type { FieldMap } from '@kbn/alerts-as-data-utils';
import { mappingFromFieldMap } from '@kbn/alerting-plugin/common';
import { defineMigration } from '@kbn/es-index-migration';
import { assetCriticalityFieldMap } from '../constants';
import { getAssetCriticalityIndex } from '../../../../../common/entity_analytics/asset_criticality';

/**
 * Proof of concept: the Asset Criticality mappings migration, declared rather than
 * hand-written.
 *
 * Runs alongside `AssetCriticalityMigrationClient` rather than replacing it, so the two
 * can be invoked separately and their results compared. Nothing here is wired into
 * startup.
 */

/**
 * Fields the live field map has gained since the index was first shipped, from the
 * commits that bumped `ASSET_CRITICALITY_MAPPINGS_VERSIONS`:
 *
 *   -> 2  service.name, service.asset.criticality
 *   -> 3  event.ingested
 *   -> 4  entity.id, entity.asset.criticality
 *
 * They collapse into a single step here, because that is what the hand-written client
 * does: `isMappingsMigrationRequired` compares one number and `migrateMappings` applies
 * the current mappings wholesale. It never walks the intermediate shapes, so declaring
 * them would model a sequence the code being replaced does not have.
 *
 * Safe to collapse only because every one of those changes is additive: applying them in
 * sequence and applying them at once land in the same place.
 */
const ADDED_SINCE_V1 = [
  'service.name',
  'service.asset.criticality',
  'event.ingested',
  'entity.id',
  'entity.asset.criticality',
] as const;

/**
 * Derived by subtraction from the live field map rather than copied out of git, so it
 * cannot drift: a field added to the live map without being listed above changes v2 and
 * the declaration stops matching, which is the point.
 */
const V1_FIELDS = omit(assetCriticalityFieldMap, ADDED_SINCE_V1) as FieldMap;
const V2_FIELDS = assetCriticalityFieldMap;

/**
 * Converted with the same helper the data client uses, so the declaration produces
 * byte-identical mappings to the path it is being compared against - otherwise the
 * comparison would be testing this conversion rather than the library.
 */
const mappingsOf = (fieldMap: FieldMap) => mappingFromFieldMap(fieldMap, 'strict');

export const ASSET_CRITICALITY_MIGRATION_ID = 'poc-asset-criticality';

export const assetCriticalityMigration = defineMigration({
  id: ASSET_CRITICALITY_MIGRATION_ID,

  resource: {
    kind: 'index',
    // One index per space, which is also what keeps this POC away from live data: run it
    // in a dedicated space and it touches only that space's index.
    name: (namespace: string) => getAssetCriticalityIndex(namespace),
  },

  /**
   * What an index carrying no stamp of ours is assumed to be.
   *
   * Harmless to get wrong here: every step is additive, so an index already at the
   * current shape has the mappings re-applied as a no-op rather than being damaged.
   */
  baseline: 1,

  // Invoked by an internal route for the POC. Nothing runs it unattended.
  execution: 'manual',

  /**
   * v1 is declared rather than left implicit so the gate has a predecessor to check v2
   * against - otherwise the first step would be accepted on trust.
   */
  versions: {
    1: { change: 'additive', mappings: mappingsOf(V1_FIELDS) },
    2: { change: 'additive', mappings: mappingsOf(V2_FIELDS) },
  },
});
