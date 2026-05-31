/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObjectModelDataBackfillFn,
  SavedObjectsModelVersion,
  SavedObjectsModelVersionMap,
} from '@kbn/core-saved-objects-server';
import type { StoredSLODefinition } from '../domain/models';
import { slo } from './slo';

function getDataBackfillFn(modelVersion: SavedObjectsModelVersion): SavedObjectModelDataBackfillFn {
  const change = modelVersion.changes.find((c) => c.type === 'data_backfill');
  if (!change || change.type !== 'data_backfill') {
    throw new Error('Expected a data_backfill change');
  }
  return change.backfillFn;
}

function buildDoc(attributes: Partial<StoredSLODefinition>) {
  return { id: 'slo-1', type: 'slo', attributes: attributes as StoredSLODefinition };
}

describe('slo saved object', () => {
  it('maps labels as a flattened field', () => {
    expect(slo.mappings.properties?.labels).toEqual({ type: 'flattened', ignore_above: 1024 });
  });

  describe('model version 2 (labels)', () => {
    const modelVersion = (
      slo.modelVersions as SavedObjectsModelVersionMap
    )[2] as SavedObjectsModelVersion;

    it('adds the labels flattened mapping', () => {
      const mappingsAddition = modelVersion.changes.find(
        (change) => change.type === 'mappings_addition'
      );
      expect(mappingsAddition).toEqual({
        type: 'mappings_addition',
        addedMappings: { labels: { type: 'flattened', ignore_above: 1024 } },
      });
    });

    it('backfills an empty labels record when absent', () => {
      const backfillFn = getDataBackfillFn(modelVersion);

      expect(backfillFn(buildDoc({}), {} as any)).toEqual({ attributes: { labels: {} } });
    });

    it('preserves existing labels when present', () => {
      const backfillFn = getDataBackfillFn(modelVersion);

      expect(backfillFn(buildDoc({ labels: { team: 'platform' } }), {} as any)).toEqual({
        attributes: { labels: { team: 'platform' } },
      });
    });
  });
});
