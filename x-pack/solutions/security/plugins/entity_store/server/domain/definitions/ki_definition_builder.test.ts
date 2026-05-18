/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Feature } from '@kbn/streams-schema';
import { getFieldEvaluationsEsqlFromDefinition } from '../../../common/domain/euid/esql';
import {
  buildDefinitionFromEntityKIs,
  buildKiDefinitionId,
  deriveGroupingField,
  ECS_IDENTITY_PREFERENCE,
  GROUPING_FIELD_LAST_RESORT,
} from './ki_definition_builder';

const baseFeature = (overrides: Partial<Feature> = {}): Feature =>
  ({
    uuid: 'feature-uuid',
    id: 'feat-id',
    stream_name: 'logs.k8s.pods',
    type: 'entity',
    subtype: 'service',
    title: 'order-service',
    description: 'Identified service order-service',
    properties: { name: 'order-service', technology: 'java' },
    confidence: 90,
    status: 'active',
    last_seen: '2024-01-01T00:00:00.000Z',
    ...overrides,
  } as Feature);

describe('deriveGroupingField', () => {
  it('returns the explicit meta.entity_store.grouping_field hint when present on any feature', () => {
    const features = [
      baseFeature({
        filter: { field: 'service.name', eq: 'a' },
        meta: { entity_store: { grouping_field: 'service.id' } },
      }),
      baseFeature({ filter: { field: 'service.name', eq: 'b' } }),
    ];
    expect(deriveGroupingField(features)).toBe('service.id');
  });

  it('ignores an empty-string meta hint and falls through to filter ranking', () => {
    const features = [
      baseFeature({
        filter: { field: 'host.name', eq: 'h1' },
        meta: { entity_store: { grouping_field: '' } },
      }),
    ];
    expect(deriveGroupingField(features)).toBe('host.name');
  });

  it('ignores a non-string meta hint and falls through to filter ranking', () => {
    const features = [
      baseFeature({
        filter: { field: 'host.name', eq: 'h1' },
        meta: { entity_store: { grouping_field: 42 as unknown as string } },
      }),
    ];
    expect(deriveGroupingField(features)).toBe('host.name');
  });

  it('picks the highest-priority ECS field across the filter set when no hint is given', () => {
    // service.name beats host.name beats event.dataset per ECS_IDENTITY_PREFERENCE.
    const features = [
      baseFeature({ filter: { field: 'event.dataset', eq: 'k8s.pod' } }),
      baseFeature({ filter: { field: 'host.name', eq: 'h1' } }),
      baseFeature({ filter: { field: 'service.name', eq: 'svc-a' } }),
    ];
    expect(deriveGroupingField(features)).toBe('service.name');
  });

  it('walks AND / OR / NOT filter trees to collect candidate fields', () => {
    const features = [
      baseFeature({
        filter: {
          and: [
            { field: 'event.dataset', eq: 'k8s.pod' },
            {
              or: [
                { field: 'kubernetes.pod.name', eq: 'p1' },
                { not: { field: 'process.name', exists: false } },
              ],
            },
          ],
        },
      }),
    ];
    // kubernetes.pod.name is higher priority than process.name and event.dataset.
    expect(deriveGroupingField(features)).toBe('kubernetes.pod.name');
  });

  it('falls back to the first observed filter field name when no ECS-known field appears', () => {
    const features = [
      baseFeature({ filter: { field: 'org.team', eq: 'platform' } }),
      baseFeature({ filter: { field: 'org.unit', eq: 'core' } }),
    ];
    expect(deriveGroupingField(features)).toBe('org.team');
  });

  it('falls back to entity.id when no filters and no meta hints are available', () => {
    const features = [baseFeature({ filter: undefined })];
    expect(deriveGroupingField(features)).toBe(GROUPING_FIELD_LAST_RESORT);
  });

  it('respects the documented ECS_IDENTITY_PREFERENCE order', () => {
    expect(ECS_IDENTITY_PREFERENCE[0]).toBe('service.name');
    expect(ECS_IDENTITY_PREFERENCE[1]).toBe('kubernetes.pod.name');
    expect(ECS_IDENTITY_PREFERENCE.at(-1)).toBe('event.dataset');
  });
});

describe('buildKiDefinitionId', () => {
  it('produces a stable id from stream, subtype, and namespace', () => {
    expect(buildKiDefinitionId('logs.k8s.pods', 'service', 'default')).toBe(
      'ki_logs_k8s_pods_service_default'
    );
  });

  it('sanitizes stream and subtype segments to safe id characters', () => {
    expect(buildKiDefinitionId('logs/with-slashes', 'sub:type@v1', 'default')).toBe(
      'ki_logs_with_slashes_sub_type_v1_default'
    );
  });

  it('does not collide for two streams that share a subtype within the same namespace', () => {
    const a = buildKiDefinitionId('logs.k8s.pods', 'service', 'default');
    const b = buildKiDefinitionId('logs.ecs.nginx', 'service', 'default');
    expect(a).not.toBe(b);
  });
});

describe('buildDefinitionFromEntityKIs', () => {
  const args = (overrides: Partial<Parameters<typeof buildDefinitionFromEntityKIs>[0]> = {}) => ({
    streamName: 'logs.k8s.pods',
    subtype: 'service',
    features: [baseFeature({ filter: { field: 'service.name', eq: 'order-service' } })],
    indexPatterns: ['logs.k8s.pods'],
    namespace: 'default',
    ...overrides,
  });

  it('builds a generic-typed definition with the resolved grouping field driving identity', () => {
    const def = buildDefinitionFromEntityKIs(args());

    expect(def.type).toBe('generic');
    expect(def.id).toBe('ki_logs_k8s_pods_service_default');
    expect(def.indexPatterns).toEqual(['logs.k8s.pods']);

    expect('singleField' in def.identityField).toBe(false);
    if ('singleField' in def.identityField) {
      throw new Error('expected calculated identity');
    }
    expect(def.identityField.skipTypePrepend).toBe(true);
    expect(def.identityField.documentsFilter).toEqual({
      field: 'service.name',
      exists: true,
    });
  });

  it('composes the EUID as <groupingField> @ entity.source so cross-stream entities stay distinct', () => {
    const def = buildDefinitionFromEntityKIs(args());
    if ('singleField' in def.identityField) {
      throw new Error('expected calculated identity');
    }
    const branches = def.identityField.euidRanking.branches;
    expect(branches).toHaveLength(1);
    expect(branches[0].ranking[0]).toEqual([
      { field: 'service.name' },
      { sep: '@' },
      { field: 'entity.source' },
    ]);
    // Fallback ranking when entity.source is absent: grouping field alone.
    expect(branches[0].ranking[1]).toEqual([{ field: 'service.name' }]);
  });

  it('encodes subtype lineage in entity.source via a literal-source identity-level field evaluation', () => {
    const def = buildDefinitionFromEntityKIs(args({ subtype: 'database' }));
    if ('singleField' in def.identityField) {
      throw new Error('expected calculated identity');
    }
    expect(def.identityField.fieldEvaluations).toEqual([
      {
        destination: 'entity.source',
        sources: [{ literal: 'stream:logs.k8s.pods:database' }],
        fallbackValue: null,
        whenClauses: [],
      },
    ]);
  });

  it('aggregates multiple per-instance KIs of the same subtype into one definition keyed by ECS-preferred grouping field', () => {
    const def = buildDefinitionFromEntityKIs(
      args({
        features: [
          baseFeature({ filter: { field: 'service.name', eq: 'order' } }),
          baseFeature({ filter: { field: 'service.name', eq: 'cart' } }),
          baseFeature({ filter: { field: 'service.name', eq: 'inventory' } }),
        ],
      })
    );
    if ('singleField' in def.identityField) {
      throw new Error('expected calculated identity');
    }
    expect(def.identityField.documentsFilter).toEqual({
      field: 'service.name',
      exists: true,
    });
  });

  it('uses entity.id as the grouping field when filters carry no candidate fields and no meta hint exists', () => {
    const def = buildDefinitionFromEntityKIs(
      args({
        features: [baseFeature({ filter: undefined })],
      })
    );
    if ('singleField' in def.identityField) {
      throw new Error('expected calculated identity');
    }
    expect(def.identityField.documentsFilter).toEqual({
      field: GROUPING_FIELD_LAST_RESORT,
      exists: true,
    });
  });

  it('honors an explicit meta.entity_store.grouping_field hint over filter-derived fields', () => {
    const def = buildDefinitionFromEntityKIs(
      args({
        features: [
          baseFeature({
            filter: { field: 'service.name', eq: 'order' },
            meta: { entity_store: { grouping_field: 'service.uid' } },
          }),
        ],
      })
    );
    if ('singleField' in def.identityField) {
      throw new Error('expected calculated identity');
    }
    expect(def.identityField.documentsFilter).toEqual({
      field: 'service.uid',
      exists: true,
    });
    expect(def.identityField.euidRanking.branches[0].ranking[0]).toEqual([
      { field: 'service.uid' },
      { sep: '@' },
      { field: 'entity.source' },
    ]);
  });

  it('includes the grouping field in the extracted entity fields exactly once', () => {
    const def = buildDefinitionFromEntityKIs(args());
    const sources = def.fields.map((f) => f.source);
    expect(sources.filter((s) => s === 'service.name')).toHaveLength(1);
  });

  // End-to-end check that the produced definition feeds correctly through the
  // existing ESQL field-evaluations builder. Confirms the literal-source
  // wiring chosen by the KI builder is syntactically valid for the pipeline
  // that will consume it (PR-B's literal source variant in action).
  it('renders the entity.source lineage as a quoted ESQL literal in the EVAL fragment', () => {
    const def = buildDefinitionFromEntityKIs(args({ subtype: 'database' }));
    const evalFragment = getFieldEvaluationsEsqlFromDefinition(def);

    expect(evalFragment).toBeDefined();
    expect(evalFragment).toContain('_src_entity_source = "stream:logs.k8s.pods:database"');
    expect(evalFragment).toContain('entity.source = CASE(');
  });
});
