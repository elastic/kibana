/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SAVED_QUERY_ID_REF_NAME, SAVED_QUERY_TYPE } from '../../constants';
import type { SavedQueryId } from './timelines';
import { migrateSavedQueryIdToReferences } from './timelines';

describe('timeline migrations', () => {
  describe('7.16.0 savedQueryId', () => {
    it('removes the savedQueryId from the migrated document', () => {
      const migratedDoc = migrateSavedQueryIdToReferences({
        id: '1',
        type: 'awesome',
        attributes: { savedQueryId: '123' },
      });

      expect(migratedDoc.attributes).toEqual({});
      expect(migratedDoc.references).toEqual([
        { id: '123', name: SAVED_QUERY_ID_REF_NAME, type: SAVED_QUERY_TYPE },
      ]);
    });

    it('preserves additional fields when migrating saved query id', () => {
      const migratedDoc = migrateSavedQueryIdToReferences({
        id: '1',
        type: 'awesome',
        attributes: { awesome: 'yes', savedQueryId: '123' } as unknown as SavedQueryId,
      });

      expect(migratedDoc.attributes).toEqual({ awesome: 'yes' });
      expect(migratedDoc.references).toEqual([
        { id: '123', name: SAVED_QUERY_ID_REF_NAME, type: SAVED_QUERY_TYPE },
      ]);
    });
  });
});
