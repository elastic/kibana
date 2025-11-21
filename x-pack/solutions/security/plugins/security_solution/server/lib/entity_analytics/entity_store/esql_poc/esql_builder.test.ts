/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildESQLQuery } from './esql_builder';
import type { DataViewsService } from '@kbn/data-views-plugin/common';
import type { AppClient } from '../../../../client';
import * as utils from '../utils';
import moment from 'moment';

const cleanEsql = (esql: string) => esql.replace(/ +/g, ' ').replace(/ \\n/g, '\n').trim();

// Mock the utils module at the module level
jest.mock('../utils', () => ({
  ...jest.requireActual('../utils'),
  buildIndexPatternsByEngine: jest.fn(),
}));

describe('buildEsql', () => {
  let mockAppClient: jest.Mocked<AppClient>;
  let mockDataViewsService: jest.Mocked<DataViewsService>;

  beforeEach(() => {
    const arbitraryIndexPatterns = ['index-a-*', 'index-b-*'];
    (utils.buildIndexPatternsByEngine as jest.Mock).mockResolvedValue(arbitraryIndexPatterns);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('should use the index patterns returned by buildIndexPatternsByEngine', async () => {
    const from = moment().utc().subtract(1, 'minute').toISOString();
    const to = moment().utc().toISOString();

    const esql = await buildESQLQuery(
      'default-namespace',
      'host',
      mockAppClient,
      mockDataViewsService,
      from,
      to
    );

    expect(utils.buildIndexPatternsByEngine).toHaveBeenCalled();

    expect(cleanEsql(esql)).toEqual(
      cleanEsql(`
      FROM index-a-*, index-b-*
      | WHERE host.name IS NOT NULL
          AND host.name != ""
          AND @timestamp >= TO_DATETIME("${from}")
          AND @timestamp <= TO_DATETIME("${to}")
      | STATS
          host.domain = TOP(host.domain, 10),
          host.hostname = TOP(host.hostname, 10),
          host.id = TOP(host.id, 10),
          host.os.name = TOP(host.os.name, 10),
          host.os.type = TOP(host.os.type, 10),
          host.ip = TOP(host.ip, 10),
          host.mac = TOP(host.mac, 10),
          host.type = TOP(host.type, 10),
          host.architecture = TOP(host.architecture, 10),
          asset.id = LAST(asset.id, @timestamp),
          asset.name = LAST(asset.name, @timestamp),
          asset.owner = LAST(asset.owner, @timestamp),
          asset.serial_number = LAST(asset.serial_number, @timestamp),
          asset.model = LAST(asset.model, @timestamp),
          asset.vendor = LAST(asset.vendor, @timestamp),
          asset.environment = LAST(asset.environment, @timestamp),
          asset.criticality = LAST(asset.criticality, @timestamp),
          asset.business_unit = LAST(asset.business_unit, @timestamp),
          host.risk.calculated_level = LAST(host.risk.calculated_level, @timestamp),
          host.risk.calculated_score = LAST(host.risk.calculated_score, @timestamp),
          host.risk.calculated_score_norm = LAST(host.risk.calculated_score_norm, @timestamp),
          entity.name = LAST(host.entity.name, @timestamp),
          entity.source = LAST(host.entity.source, @timestamp),
          entity.type = LAST(host.entity.type, @timestamp),
          entity.sub_type = LAST(host.entity.sub_type, @timestamp),
          entity.url = LAST(host.entity.url, @timestamp),
          entity.risk.calculated_level = LAST(host.entity.risk.calculated_level, @timestamp),
          entity.risk.calculated_score = LAST(host.entity.risk.calculated_score, @timestamp),
          entity.risk.calculated_score_norm = LAST(host.entity.risk.calculated_score_norm, @timestamp),
          entity.relationships.Communicates_with = TOP(host.entity.relationships.Communicates_with, 10),
          entity.relationships.Depends_on = TOP(host.entity.relationships.Depends_on, 10),
          entity.relationships.Dependent_of = TOP(host.entity.relationships.Dependent_of, 10),
          entity.relationships.Owned_by = TOP(host.entity.relationships.Owned_by, 10),
          entity.relationships.Accessed_frequently_by = TOP(host.entity.relationships.Accessed_frequently_by, 10)
        BY host.name
      `)
    );
  });
});
