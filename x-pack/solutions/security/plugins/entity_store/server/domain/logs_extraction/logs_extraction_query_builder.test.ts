/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildLogsExtractionEsqlQuery,
  buildCcsLogsExtractionEsqlQuery,
  buildRemainingLogsCountQuery,
} from './logs_extraction_query_builder';
import { getEntityDefinition } from '../../../common/domain/definitions/registry';
import { EntityType } from '../../../common/domain/definitions/entity_schema';

describe('buildLogsExtractionEsqlQuery', () => {
  Object.values(EntityType.Values).forEach((type) => {
    it(`generates the expected query for ${type} entity description`, () => {
      const query = buildLogsExtractionEsqlQuery({
        indexPatterns: ['test-index-*'],
        latestIndex: 'latest-index',
        entityDefinition: getEntityDefinition(type, 'default'),
        docsLimit: 10000,
        fromDateISO: '2022-01-01T00:00:00.000Z',
        toDateISO: '2022-01-01T23:59:59.999Z',
      });
      expect(query).toMatchSnapshot();
    });
  });

  it(`generates the expected query for host with pagination`, () => {
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
  });

  it(`generates the expected query for host with recoveryId`, () => {
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
  });
});

describe('buildCcsLogsExtractionEsqlQuery', () => {
  it('generates query without LOOKUP JOIN', () => {
    const query = buildCcsLogsExtractionEsqlQuery({
      indexPatterns: ['remote_cluster:logs-*'],
      entityDefinition: getEntityDefinition('host', 'default'),
      fromDateISO: '2022-01-01T00:00:00.000Z',
      toDateISO: '2022-01-01T23:59:59.999Z',
      docsLimit: 10000,
    });
    expect(query).not.toContain('LOOKUP JOIN');
    expect(query).toMatchSnapshot();
  });

  it('generates expected query for host entity type', () => {
    const query = buildCcsLogsExtractionEsqlQuery({
      indexPatterns: ['remote:metrics-*'],
      entityDefinition: getEntityDefinition('host', 'default'),
      fromDateISO: '2022-01-01T00:00:00.000Z',
      toDateISO: '2022-01-01T23:59:59.999Z',
      docsLimit: 5000,
    });
    expect(query).toMatchSnapshot();
  });

  it('generates expected query with pagination', () => {
    const query = buildCcsLogsExtractionEsqlQuery({
      indexPatterns: ['remote:logs-*'],
      entityDefinition: getEntityDefinition('user', 'default'),
      fromDateISO: '2022-01-01T00:00:00.000Z',
      toDateISO: '2022-01-01T23:59:59.999Z',
      docsLimit: 10000,
      pagination: {
        timestampCursor: '2022-01-01T12:00:00.000Z',
        idCursor: 'cursor-id',
      },
    });
    expect(query).toContain('FirstSeenLogInPage > TO_DATETIME("2022-01-01T12:00:00.000Z")');
    expect(query).toMatchSnapshot();
  });
});

describe('buildRemainingLogsCountQuery', () => {
  Object.values(EntityType.Values).forEach((type) => {
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
