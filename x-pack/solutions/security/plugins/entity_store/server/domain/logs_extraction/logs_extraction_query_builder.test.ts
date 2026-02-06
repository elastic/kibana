/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildLogsExtractionEsqlQuery } from './logs_extraction_query_builder';
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
});
