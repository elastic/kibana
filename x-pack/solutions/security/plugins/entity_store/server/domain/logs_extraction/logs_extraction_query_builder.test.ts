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
});

describe('buildLogsExtractionEsqlQuery with KI identity classification', () => {
  const userDefinition = getEntityDefinition('user', 'default');
  const classification = [
    { indexPatterns: ['logs-okta.system-default'], namespace: 'okta', tier: 'high' },
    { indexPatterns: ['logs-endpoint.events.process-default'], namespace: 'local', tier: 'medium' },
  ];

  it('generates a valid user query with the classification prelude', async () => {
    const query = buildLogsExtractionEsqlQuery({
      indexPatterns: ['logs-okta.system-default', 'logs-endpoint.events.process-default'],
      latestIndex: 'latest-index',
      entityDefinition: userDefinition,
      docsLimit: 10000,
      fromDateISO: '2022-01-01T00:00:00.000Z',
      toDateISO: '2022-01-01T23:59:59.999Z',
      identityClassification: classification,
    });
    expect(query).toMatchSnapshot();
    await expect(validateQuery(query)).resolves.toHaveProperty('errors', []);
  });

  it('requests _index metadata and stamps namespace/confidence per source', () => {
    const query = buildLogsExtractionEsqlQuery({
      indexPatterns: ['logs-okta.system-default', 'logs-endpoint.events.process-default'],
      latestIndex: 'latest-index',
      entityDefinition: userDefinition,
      docsLimit: 10000,
      fromDateISO: '2022-01-01T00:00:00.000Z',
      toDateISO: '2022-01-01T23:59:59.999Z',
      identityClassification: classification,
    });
    expect(query).toContain('METADATA _index');
    expect(query).toContain('entity.namespace = CASE(');
    expect(query).toContain('_index LIKE "*logs-okta.system-default*"');
    expect(query).toContain('"okta"');
    expect(query).toContain('entity.confidence = CASE(');
    expect(query).toContain('"high"');
    expect(query).toContain('"medium"');
  });

  it('drops the rule-based idpGate / namespace allowlist / confidence rules', () => {
    const ruleBased = buildLogsExtractionEsqlQuery({
      indexPatterns: ['test-index-*'],
      latestIndex: 'latest-index',
      entityDefinition: userDefinition,
      docsLimit: 10000,
      fromDateISO: '2022-01-01T00:00:00.000Z',
      toDateISO: '2022-01-01T23:59:59.999Z',
    });
    // The rule-based query maps source modules (okta/azure/...) to a namespace via sourceMatchesAny,
    // and stamps confidence post-STATS from the namespace.
    expect(ruleBased).toContain('entityanalytics_okta');
    expect(ruleBased).toContain('recent.entity.confidence = CASE(');

    const classified = buildLogsExtractionEsqlQuery({
      indexPatterns: ['logs-okta.system-default'],
      latestIndex: 'latest-index',
      entityDefinition: userDefinition,
      docsLimit: 10000,
      fromDateISO: '2022-01-01T00:00:00.000Z',
      toDateISO: '2022-01-01T23:59:59.999Z',
      identityClassification: [classification[0]],
    });
    // The hardcoded allowlist token and the namespace-derived confidence rule must be gone.
    expect(classified).not.toContain('entityanalytics_okta');
    expect(classified).not.toContain('recent.entity.confidence = CASE(');
  });

  it('defaults to unknown/null (preserving the updates stream) when the classification list is empty', async () => {
    const query = buildLogsExtractionEsqlQuery({
      indexPatterns: ['test-index-*'],
      latestIndex: 'latest-index',
      entityDefinition: userDefinition,
      docsLimit: 10000,
      fromDateISO: '2022-01-01T00:00:00.000Z',
      toDateISO: '2022-01-01T23:59:59.999Z',
      identityClassification: [],
    });
    // even with nothing classified, re-extracted entities (updates stream) keep
    // their stored values and every other source falls to the unclassified default
    expect(query).toContain('entity.namespace = CASE(');
    expect(query).toContain('_index LIKE "*.entities.v2.updates*", entity.namespace');
    expect(query).toContain(', "unknown")');
    expect(query).toContain('_index LIKE "*.entities.v2.updates*", entity.confidence');
    expect(query).toContain(', NULL)');
    await expect(validateQuery(query)).resolves.toHaveProperty('errors', []);
  });

  it('drops unclassified rows but retains already-stored entities in the creation gate', () => {
    const query = buildLogsExtractionEsqlQuery({
      indexPatterns: ['logs-okta.system-default'],
      latestIndex: 'latest-index',
      entityDefinition: userDefinition,
      docsLimit: 10000,
      fromDateISO: '2022-01-01T00:00:00.000Z',
      toDateISO: '2022-01-01T23:59:59.999Z',
      identityClassification: [classification[0]],
    });
    // post-agg gate excludes the unclassified default namespace yet keeps stored entities
    expect(query).toContain('TO_STRING(recent.entity.namespace) != "unknown"');
    expect(query).toContain('TO_STRING(entity.id) IS NOT NULL');
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
