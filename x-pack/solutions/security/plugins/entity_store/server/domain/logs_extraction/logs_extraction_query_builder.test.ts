/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildLogsExtractionEsqlQuery,
  buildRemainingLogsCountQuery,
} from './logs_extraction_query_builder';
import { getEntityDefinition } from '../../../common/domain/definitions/registry';
import { ALL_ENTITY_TYPES, EntityType } from '../../../common/domain/definitions/entity_schema';
import { buildDefinitionFromEntityKIs } from '../definitions/ki_definition_builder';
import type { Feature } from '@kbn/streams-schema';
import { validateQuery } from '@kbn/esql-language';

describe('buildLogsExtractionEsqlQuery', () => {
  Object.values(EntityType.enum).forEach((type) => {
    it(`generates the expected query for ${type} entity description`, async () => {
      const query = buildLogsExtractionEsqlQuery({
        indexPatterns: ['test-index-*'],
        latestIndex: 'latest-index',
        entityDefinition: getEntityDefinition(type, 'default'),
        docsLimit: 10000,
        fromDateISO: '2022-01-01T00:00:00.000Z',
        toDateISO: '2022-01-01T23:59:59.999Z',
      });
      expect(query).toMatchSnapshot();
      await expect(validateQuery(query)).resolves.toHaveProperty('errors', []);
    });
  });

  it(`generates the expected query for host with pagination`, async () => {
    const query = buildLogsExtractionEsqlQuery({
      indexPatterns: ['test-index-*'],
      latestIndex: 'latest-index',
      entityDefinition: getEntityDefinition('host', 'default'),
      docsLimit: 10000,
      fromDateISO: '2022-01-01T00:00:00.000Z',
      toDateISO: '2022-01-01T23:59:59.999Z',
      pagination: {
        timestampCursor: '2022-01-01T00:00:00.000Z',
        idCursor: '123',
      },
    });
    expect(query).toMatchSnapshot();
    await expect(validateQuery(query)).resolves.toHaveProperty('errors', []);
  });

  it(`generates the expected query for host with recoveryId`, async () => {
    const query = buildLogsExtractionEsqlQuery({
      indexPatterns: ['test-index-*'],
      latestIndex: 'latest-index',
      entityDefinition: getEntityDefinition('host', 'default'),
      docsLimit: 10000,
      fromDateISO: '2022-01-01T00:00:00.000Z',
      toDateISO: '2022-01-01T23:59:59.999Z',
      recoveryId: 'recover',
      pagination: {
        timestampCursor: '2022-01-01T00:00:00.000Z',
        idCursor: 'TO BE IGNORED',
      },
    });
    expect(query).toMatchSnapshot();
    await expect(validateQuery(query)).resolves.toHaveProperty('errors', []);
  });

  it('inserts whenConditionTrueSetFieldsAfterStats EVAL after LOOKUP and before merge EVAL', () => {
    const base = getEntityDefinition('host', 'default');
    const query = buildLogsExtractionEsqlQuery({
      indexPatterns: ['test-index-*'],
      latestIndex: 'latest-index',
      entityDefinition: {
        ...base,
        whenConditionTrueSetFieldsAfterStats: [
          {
            condition: { field: 'host.name', eq: 'server1' },
            fields: { 'host.name': { source: 'host.id' } },
          },
        ],
      },
      docsLimit: 100,
      fromDateISO: '2022-01-01T00:00:00.000Z',
      toDateISO: '2022-01-01T23:59:59.999Z',
    });
    const statsIdx = query.indexOf('| STATS');
    const lookupIdx = query.indexOf('LOOKUP JOIN');
    const afterStatsEvalIdx = query.indexOf('recent.host.name = CASE(');
    const mergeCoalesceIdx = query.indexOf('entity.name = COALESCE(');
    expect(statsIdx).toBeGreaterThan(-1);
    expect(lookupIdx).toBeGreaterThan(statsIdx);
    expect(afterStatsEvalIdx).toBeGreaterThan(lookupIdx);
    expect(mergeCoalesceIdx).toBeGreaterThan(afterStatsEvalIdx);
  });

  // Promotion durability contract: the KI promotion maintainer mutates `entity.id`
  // and `entity.EngineMetadata.Type` on a generic doc (e.g. `service:foo`, `service`)
  // and marks it with `entity.confidence = "low"`. The next extraction pass must NOT
  // clobber those values, otherwise the maintainer's work is silently reverted on
  // every cycle. We enforce this with three properties of the extraction query:
  //   1. LOOKUP JOIN keys on `EngineMetadata.UntypedId`, the source-engine identity
  //      that is stable across promotion (the maintainer mutates `entity.id` only).
  //   2. `entity.id` is rewritten via a `CASE(entity.confidence == "low", ...)`
  //      EVAL instead of an unconditional `RENAME recent.entity.id AS entity.id`,
  //      so a promoted doc's typed id is preserved post-JOIN.
  //   3. `entity.EngineMetadata.Type` carries the same `CASE` guard so the engine
  //      label tracks the id.
  // The doc `_id` itself (HASH of `recent.entity.id`) stays unconditional so the
  // upsert keeps writing to the same physical doc — promotion only changes the
  // doc's logical identity, not its storage key.
  it('preserves promoted entity.id and EngineMetadata.Type across re-extraction (KI promotion durability)', async () => {
    const query = buildLogsExtractionEsqlQuery({
      indexPatterns: ['test-index-*'],
      latestIndex: 'latest-index',
      entityDefinition: getEntityDefinition('generic', 'default'),
      docsLimit: 10000,
      fromDateISO: '2022-01-01T00:00:00.000Z',
      toDateISO: '2022-01-01T23:59:59.999Z',
    });

    expect(query).toContain(
      'LOOKUP JOIN latest-index\n      ON recent.entity.EngineMetadata.UntypedId == entity.EngineMetadata.UntypedId'
    );
    expect(query).not.toContain('ON recent.entity.id == entity.id');

    expect(query).toContain(
      'EVAL entity.id = CASE(entity.confidence == "low", entity.id, recent.entity.id)'
    );
    expect(query).not.toMatch(/RENAME\s+recent\.entity\.id AS entity\.id/);

    expect(query).toContain(
      'entity.EngineMetadata.Type = CASE(entity.confidence == "low", entity.EngineMetadata.Type, "generic")'
    );
    expect(query).not.toContain('entity.EngineMetadata.Type = "generic",');

    expect(query).toContain('entity.hashedId = HASH("sha256", recent.entity.id)');

    await expect(validateQuery(query)).resolves.toHaveProperty('errors', []);
  });
});

describe('buildRemainingLogsCountQuery', () => {
  ALL_ENTITY_TYPES.forEach((type) => {
    it(`generates the expected query for ${type} entity type`, () => {
      const query = buildRemainingLogsCountQuery({
        indexPatterns: ['test-index-*'],
        type,
        fromDateISO: '2022-01-01T00:00:00.000Z',
        toDateISO: '2022-01-01T23:59:59.999Z',
      });
      expect(query).toMatchSnapshot();
    });
  });
});

// Stream-derived (KI) definitions ride `type: 'generic'` but use a custom grouping
// field for identity. The query must respect the definition's own identityField and
// must NOT fall back to the registry's generic identity (single field `entity.id`),
// which would emit `entity.id IS NOT NULL AND entity.id != ""` in the probe WHERE
// clause and fail with `Unknown column [entity.id]` against arbitrary stream indices.
describe('buildLogsExtractionEsqlQuery with KI (stream-derived generic) definition', () => {
  const kiFeature = (overrides: Partial<Feature> = {}): Feature =>
    ({
      uuid: 'feature-uuid',
      id: 'feat-id',
      stream_name: 'logs-elastic_agent.status_change-default',
      type: 'entity',
      subtype: 'service',
      title: 'order-service',
      description: 'Identified service order-service',
      properties: { name: 'order-service' },
      confidence: 90,
      status: 'active',
      last_seen: '2024-01-01T00:00:00.000Z',
      filter: { field: 'service.name', eq: 'order-service' },
      ...overrides,
    } as Feature);

  it('uses the definition-provided grouping field (service.name) instead of the registry generic identity (entity.id)', async () => {
    const definition = buildDefinitionFromEntityKIs({
      streamName: 'logs-elastic_agent.status_change-default',
      subtype: 'service',
      features: [kiFeature()],
      indexPatterns: ['logs-elastic_agent.status_change-default'],
      namespace: 'default',
    });

    const query = buildLogsExtractionEsqlQuery({
      indexPatterns: ['logs-elastic_agent.status_change-default'],
      latestIndex: 'latest-index',
      entityDefinition: definition,
      docsLimit: 10000,
      fromDateISO: '2022-01-01T00:00:00.000Z',
      toDateISO: '2022-01-01T23:59:59.999Z',
    });

    // The probe WHERE clause must filter on the grouping field (service.name),
    // not the registry's generic singleField (entity.id).
    expect(query).toContain('NOT(`service.name` IS NULL)');
    expect(query).not.toContain('entity.id IS NOT NULL AND entity.id != ""');

    // The untyped id EVAL uses the definition's euidRanking composition, so
    // service.name is the primary identity component.
    expect(query).toContain('service.name');

    await expect(validateQuery(query)).resolves.toHaveProperty('errors', []);
  });

  it('respects an explicit meta.entity_store.grouping_field override (kubernetes.pod.name)', async () => {
    const definition = buildDefinitionFromEntityKIs({
      streamName: 'logs.k8s.pods',
      subtype: 'pod',
      features: [
        kiFeature({
          stream_name: 'logs.k8s.pods',
          subtype: 'pod',
          meta: { entity_store: { grouping_field: 'kubernetes.pod.name' } },
        }),
      ],
      indexPatterns: ['logs.k8s.pods'],
      namespace: 'default',
    });

    const query = buildLogsExtractionEsqlQuery({
      indexPatterns: ['logs.k8s.pods'],
      latestIndex: 'latest-index',
      entityDefinition: definition,
      docsLimit: 10000,
      fromDateISO: '2022-01-01T00:00:00.000Z',
      toDateISO: '2022-01-01T23:59:59.999Z',
    });

    expect(query).toContain('NOT(`kubernetes.pod.name` IS NULL)');
    expect(query).not.toContain('entity.id IS NOT NULL AND entity.id != ""');

    await expect(validateQuery(query)).resolves.toHaveProperty('errors', []);
  });

  // KI definitions reference entity.* / event.* / asset.* / entity.relationships.*
  // sources that don't exist in arbitrary stream indices (e.g. logs-elastic_agent.status_change-*).
  // Without `SET unmapped_fields="nullify";` ESQL aborts the whole extraction with
  // `verification_exception: Unknown column [...]` for every missing field, dropping
  // entire KI groups instead of letting them surface NULLs.
  it('emits SET unmapped_fields="nullify"; as the first statement so KI extraction tolerates streams that do not map every source field', async () => {
    const definition = buildDefinitionFromEntityKIs({
      streamName: 'logs-elastic_agent.status_change-default',
      subtype: 'service',
      features: [kiFeature()],
      indexPatterns: ['logs-elastic_agent.status_change-default'],
      namespace: 'default',
    });

    const query = buildLogsExtractionEsqlQuery({
      indexPatterns: ['logs-elastic_agent.status_change-default'],
      latestIndex: 'latest-index',
      entityDefinition: definition,
      docsLimit: 10000,
      fromDateISO: '2022-01-01T00:00:00.000Z',
      toDateISO: '2022-01-01T23:59:59.999Z',
    });

    expect(query.startsWith('SET unmapped_fields="nullify";')).toBe(true);
  });
});
