/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityStoreEuid } from '@kbn/entity-store/public';

import type { EntityStoreRecord } from '../../../../flyout/entity_details/shared/hooks/use_entity_from_store';
import type { Anomaly } from '../types';
import {
  anomalyMatchesMlEntityField,
  anomalyRowMatchesIdentityIdentifiers,
  buildAnomaliesTableInfluencersFilterQuery,
  buildBroadMlIdentityFieldsExistFilter,
  buildEuidSampleDocumentForAnomaliesTable,
  getCriteriaFieldsForAnomaliesTable,
} from './anomaly_table_euid';

describe('anomaly_table_euid', () => {
  describe('buildEuidSampleDocumentForAnomaliesTable', () => {
    test('merges trimmed identity fields and falls back to user.name', () => {
      expect(
        buildEuidSampleDocumentForAnomaliesTable('user', { 'user.id': '  u1  ' }, 'alice')
      ).toEqual({
        'user.id': 'u1',
      });
      expect(buildEuidSampleDocumentForAnomaliesTable('user', {}, 'alice')).toEqual({
        'user.name': 'alice',
      });
    });
  });

  describe('buildBroadMlIdentityFieldsExistFilter', () => {
    test('OR exists across identity source fields from EUID definitions', () => {
      const euid = {
        getEuidSourceFields: () => ({
          requiresOneOf: ['user.email', 'user.name'],
          identitySourceFields: ['user.email', 'user.name'],
        }),
      } as unknown as EntityStoreEuid;

      expect(buildBroadMlIdentityFieldsExistFilter(euid, 'user')).toEqual({
        bool: {
          should: [{ exists: { field: 'user.email' } }, { exists: { field: 'user.name' } }],
          minimum_should_match: 1,
        },
      });
    });
  });

  describe('buildAnomaliesTableInfluencersFilterQuery', () => {
    test('uses legacy single-field exists when EUID API is unavailable', () => {
      expect(
        buildAnomaliesTableInfluencersFilterQuery({
          euid: undefined,
          entityType: 'user',
          isScopedToEntity: false,
        })
      ).toEqual({ exists: { field: 'user.name' } });
    });

    test('scoped path prefers dsl.getEuidFilterBasedOnDocument when it returns a query', () => {
      const scopedDsl = { bool: { filter: [{ term: { 'user.email': 'a@b.c' } }] } };
      const euid = {
        dsl: {
          getEuidFilterBasedOnDocument: jest.fn().mockReturnValue(scopedDsl),
        },
        getEuidSourceFields: () => ({
          requiresOneOf: ['user.name'],
          identitySourceFields: ['user.name'],
        }),
      } as unknown as EntityStoreEuid;

      const q = buildAnomaliesTableInfluencersFilterQuery({
        euid,
        entityType: 'user',
        isScopedToEntity: true,
        identityFields: { 'user.email': 'a@b.c' },
        fallbackDisplayName: 'alice',
      });
      expect(q).toEqual(scopedDsl);
    });

    test('scoped path passes entityRecord directly when provided', () => {
      const scopedDsl = { bool: { filter: [{ term: { 'user.name': 'alice' } }] } };
      const getEuidFilterBasedOnDocument = jest.fn().mockReturnValue(scopedDsl);
      const euid = {
        dsl: { getEuidFilterBasedOnDocument },
        getEuidSourceFields: () => ({
          requiresOneOf: ['user.name'],
          identitySourceFields: ['user.name'],
        }),
      } as unknown as EntityStoreEuid;
      const entityRecord = { 'user.name': 'alice' } as unknown as EntityStoreRecord;

      const q = buildAnomaliesTableInfluencersFilterQuery({
        euid,
        entityType: 'user',
        entityRecord,
        isScopedToEntity: true,
      });
      expect(getEuidFilterBasedOnDocument).toHaveBeenCalledWith('user', entityRecord);
      expect(q).toEqual(scopedDsl);
    });
  });

  describe('getCriteriaFieldsForAnomaliesTable', () => {
    test('returns empty criteria when scoped DSL is produced (terms live in influencers filter)', () => {
      const euid = {
        dsl: {
          getEuidFilterBasedOnDocument: jest.fn().mockReturnValue({ bool: { filter: [] } }),
        },
        getEntityIdentifiersFromDocument: jest.fn(),
      } as unknown as EntityStoreEuid;

      expect(
        getCriteriaFieldsForAnomaliesTable({
          euid,
          entityType: 'user',
          isScopedToEntity: true,
          identityFields: { 'user.name': 'bob' },
          fallbackDisplayName: 'bob',
        })
      ).toEqual([]);
    });

    test('falls back to identifier map terms when DSL is not available', () => {
      const euid = {
        dsl: {
          getEuidFilterBasedOnDocument: jest.fn().mockReturnValue(undefined),
        },
        getEntityIdentifiersFromDocument: jest
          .fn()
          .mockReturnValue({ 'user.id': 'uid-9', 'user.name': 'bob' }),
      } as unknown as EntityStoreEuid;

      expect(
        getCriteriaFieldsForAnomaliesTable({
          euid,
          entityType: 'user',
          isScopedToEntity: true,
          fallbackDisplayName: 'bob',
        })
      ).toEqual([
        { fieldName: 'user.id', fieldValue: 'uid-9' },
        { fieldName: 'user.name', fieldValue: 'bob' },
      ]);
    });

    test('passes entityRecord directly when provided', () => {
      const getEuidFilterBasedOnDocument = jest.fn().mockReturnValue(undefined);
      const getEntityIdentifiersFromDocument = jest.fn().mockReturnValue({ 'user.name': 'carol' });
      const euid = {
        dsl: { getEuidFilterBasedOnDocument },
        getEntityIdentifiersFromDocument,
      } as unknown as EntityStoreEuid;
      const entityRecord = { 'user.name': 'carol' } as unknown as EntityStoreRecord;

      const result = getCriteriaFieldsForAnomaliesTable({
        euid,
        entityType: 'user',
        entityRecord,
        isScopedToEntity: true,
        fallbackDisplayName: 'carol',
      });
      expect(getEuidFilterBasedOnDocument).toHaveBeenCalledWith('user', entityRecord);
      expect(getEntityIdentifiersFromDocument).toHaveBeenCalledWith('user', entityRecord);
      expect(result).toEqual([{ fieldName: 'user.name', fieldValue: 'carol' }]);
    });
  });

  describe('anomalyRowMatchesIdentityIdentifiers', () => {
    test('matches partition entity or influencer key', () => {
      const identifiers = { 'user.name': 'root' };
      expect(
        anomalyRowMatchesIdentityIdentifiers(
          { entityName: 'user.name', entityValue: 'root', influencers: [] } as unknown as Anomaly,
          identifiers
        )
      ).toEqual(true);
      expect(
        anomalyRowMatchesIdentityIdentifiers(
          {
            entityName: 'host.name',
            entityValue: 'x',
            influencers: [{ 'user.name': 'root' }],
          } as unknown as Anomaly,
          identifiers
        )
      ).toEqual(true);
    });
  });

  describe('anomalyMatchesMlEntityField', () => {
    test('legacy single-field behavior', () => {
      expect(
        anomalyMatchesMlEntityField(
          { entityName: 'user.name', entityValue: 'u' } as Anomaly,
          'user.name',
          'u'
        )
      ).toEqual(true);
    });
  });
});
