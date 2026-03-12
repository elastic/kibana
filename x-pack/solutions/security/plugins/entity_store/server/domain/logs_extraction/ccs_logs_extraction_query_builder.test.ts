/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildCcsLogsExtractionEsqlQuery } from './ccs_logs_extraction_query_builder';
import { getEntityDefinition } from '../../../common/domain/definitions/registry';

describe('buildCcsLogsExtractionEsqlQuery', () => {
  it('generates query for generic entity type', () => {
    const query = buildCcsLogsExtractionEsqlQuery({
      indexPatterns: ['remote_cluster:logs-*'],
      entityDefinition: getEntityDefinition('generic', 'default'),
      fromDateISO: '2022-01-01T00:00:00.000Z',
      toDateISO: '2022-01-01T23:59:59.999Z',
      docsLimit: 10000,
    });
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
