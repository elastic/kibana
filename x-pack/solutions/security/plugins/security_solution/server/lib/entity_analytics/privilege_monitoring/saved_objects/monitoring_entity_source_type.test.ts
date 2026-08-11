/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObjectModelTransformationContext,
  SavedObjectsModelVersion,
} from '@kbn/core-saved-objects-server';
import type { Matcher } from '../../../../../common/api/entity_analytics';
import {
  MANAGED_SOURCES_VERSION,
  monitoringEntitySourceType,
  monitoringEntitySourceTypeName,
} from './monitoring_entity_source_type';
import { getDefaultMatchersForSource } from '../data_sources/matchers';

const getBackfillFn = () => {
  const version2 = (
    monitoringEntitySourceType.modelVersions as Record<string, SavedObjectsModelVersion>
  )?.['2'];
  const backfillChange = version2?.changes.find((change) => change.type === 'data_backfill');
  if (backfillChange?.type !== 'data_backfill') {
    throw new Error('Expected data_backfill change in model version 2');
  }
  return backfillChange.backfillFn;
};

const createBaseDocument = ({
  matchers,
  integrationName,
  type,
  managed = true,
}: {
  matchers: Matcher[] | undefined;
  integrationName?: string;
  type: 'index' | 'entity_analytics_integration';
  managed?: boolean;
}) => ({
  id: 'test-id',
  type: monitoringEntitySourceTypeName,
  attributes: {
    type,
    name: 'test-source',
    managed,
    enabled: true,
    integrationName,
    matchers,
  },
  references: [],
  migrationVersion: {},
  coreMigrationVersion: '8.0.0',
  typeMigrationVersion: '8.0.0',
  updated_at: '2023-01-01T00:00:00.000Z',
  version: '1',
  namespaces: ['default'],
});

describe('monitoringEntitySourceType backfill', () => {
  it.each([
    {
      description: 'index',
      type: 'index' as const,
      matchers: [] as Matcher[],
    },
    {
      description: 'integration',
      type: 'entity_analytics_integration' as const,
      integrationName: 'entityanalytics_okta',
      matchers: getDefaultMatchersForSource('entity_analytics_integration', 'entityanalytics_okta'),
    },
  ])(
    'should set matchersModifiedByUser to false when matchers equal defaults for $description sources',
    ({ type, integrationName, matchers }) => {
      const backfillFn = getBackfillFn();

      const mockDocument = createBaseDocument({
        type,
        integrationName,
        matchers,
      });

      const result = backfillFn(mockDocument, {} as SavedObjectModelTransformationContext);

      expect(result).toEqual({
        attributes: {
          ...mockDocument.attributes,
          matchersModifiedByUser: false,
          managedVersion: MANAGED_SOURCES_VERSION,
        },
      });
    }
  );

  it.each([
    {
      description: 'index',
      type: 'index' as const,
    },
    {
      description: 'integration',
      type: 'entity_analytics_integration' as const,
      integrationName: 'entityanalytics_okta',
    },
  ])(
    'should set matchersModifiedByUser to true when matchers differ from defaults for $description sources',
    ({ type, integrationName }) => {
      const backfillFn = getBackfillFn();

      const mockDocument = createBaseDocument({
        type,
        integrationName,
        matchers: [{ fields: ['custom.index.field'], values: ['custom.value.1'] }],
      });

      const result = backfillFn(mockDocument, {} as SavedObjectModelTransformationContext);

      expect(result).toEqual({
        attributes: {
          ...mockDocument.attributes,
          matchersModifiedByUser: true,
          managedVersion: MANAGED_SOURCES_VERSION,
        },
      });
    }
  );

  it.each([
    {
      description: 'index',
      type: 'index' as const,
    },
    {
      description: 'integration',
      type: 'entity_analytics_integration' as const,
      integrationName: 'entityanalytics_okta',
    },
  ])(
    'should set matchersModifiedByUser to false when source is not managed for $description sources',
    ({ type, integrationName }) => {
      const backfillFn = getBackfillFn();

      const mockDocument = createBaseDocument({
        type,
        integrationName,
        managed: false,
        matchers: [{ fields: ['user.roles'], values: ['admin'] }],
      });

      const result = backfillFn(mockDocument, {} as SavedObjectModelTransformationContext);

      expect(result).toEqual({
        attributes: {
          ...mockDocument.attributes,
          matchersModifiedByUser: false,
          managedVersion: MANAGED_SOURCES_VERSION,
        },
      });
    }
  );
});
