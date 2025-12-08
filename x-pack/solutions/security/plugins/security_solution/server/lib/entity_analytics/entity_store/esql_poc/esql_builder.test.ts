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
  beforeEach(() => {
    const arbitraryIndexPatterns = ['logs-*', '.entities.v1.updates.security_host_default'];
    (utils.buildIndexPatternsByEngine as jest.Mock).mockResolvedValue(arbitraryIndexPatterns);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('should use the index patterns returned by buildIndexPatternsByEngine', async () => {
    const from = moment().utc().subtract(1, 'minute').toISOString();
    const to = moment().utc().toISOString();

    const esql = await buildESQLQuery(
      'default',
      'host',
      {} as AppClient,
      {} as DataViewsService,
      from,
      to,
      {
        maxPageSearchSize: 10,
      }
    );

    expect(utils.buildIndexPatternsByEngine).toHaveBeenCalled();
    // console.log(esql);

    expect(cleanEsql(esql)).toEqual(
      cleanEsql(`
         FROM logs-*, .entities.v1.updates.security_host_default
      | WHERE (
                  (host.entity.id IS NOT NULL AND host.entity.id != "")
                OR (host.id IS NOT NULL AND host.id != "")
                OR (host.mac IS NOT NULL AND host.mac != "")
                OR (host.name IS NOT NULL AND host.name != "")
                OR (host.hostname IS NOT NULL AND host.hostname != "")
              )
          AND @timestamp > TO_DATETIME("${from}")
          AND @timestamp <= TO_DATETIME("${to}")
      | EVAL host.entity.id = COALESCE(
                    host.entity.id,
                    host.id,
                    CASE(host.domain IS NOT NULL AND host.domain != "",
                      CASE(
                        host.name IS NOT NULL AND host.name != "", CONCAT(host.name, ".", TO_STRING(host.domain)),
                        host.hostname IS NOT NULL AND host.hostname != "", CONCAT(host.hostname, ".", TO_STRING(host.domain)),
                        NULL
                      ),
                      NULL
                    ),
                    CASE(host.mac IS NOT NULL AND host.mac != "",
                      CASE(
                        host.name IS NOT NULL AND host.name != "", CONCAT(host.name, "|", TO_STRING(host.mac)),
                        host.hostname IS NOT NULL AND host.hostname != "", CONCAT(host.hostname, "|", TO_STRING(host.mac)),
                        NULL
                      ),
                      NULL
                    ),
                    host.name,
                    host.hostname
                  )
      | RENAME
        host.entity.id AS recent.host.entity.id
      | STATS
        recent.timestamp = MAX(@timestamp),
        recent.host.name = LAST(host.name, @timestamp),
        recent.host.domain = MV_DEDUPE(TOP(host.domain, 10)),
        recent.host.hostname = MV_DEDUPE(TOP(host.hostname, 10)),
        recent.host.id = MV_DEDUPE(TOP(host.id, 10)),
        recent.host.os.name = MV_DEDUPE(TOP(host.os.name, 10)),
        recent.host.os.type = MV_DEDUPE(TOP(host.os.type, 10)),
        recent.host.ip = MV_DEDUPE(TOP(host.ip, 10)),
        recent.host.mac = MV_DEDUPE(TOP(host.mac, 10)),
        recent.host.type = MV_DEDUPE(TOP(host.type, 10)),
        recent.host.architecture = MV_DEDUPE(TOP(host.architecture, 10)),
        recent.asset.id = LAST(asset.id, @timestamp),
        recent.asset.name = LAST(asset.name, @timestamp),
        recent.asset.owner = LAST(asset.owner, @timestamp),
        recent.asset.serial_number = LAST(asset.serial_number, @timestamp),
        recent.asset.model = LAST(asset.model, @timestamp),
        recent.asset.vendor = LAST(asset.vendor, @timestamp),
        recent.asset.environment = LAST(asset.environment, @timestamp),
        recent.asset.criticality = LAST(asset.criticality, @timestamp),
        recent.asset.business_unit = LAST(asset.business_unit, @timestamp),
        recent.host.risk.calculated_level = LAST(host.risk.calculated_level, @timestamp),
        recent.host.risk.calculated_score = LAST(host.risk.calculated_score, @timestamp),
        recent.host.risk.calculated_score_norm = LAST(host.risk.calculated_score_norm, @timestamp),
        recent.entity.name = LAST(host.entity.name, @timestamp),
        recent.entity.source = LAST(host.entity.source, @timestamp),
        recent.entity.type = LAST(host.entity.type, @timestamp),
        recent.entity.sub_type = LAST(host.entity.sub_type, @timestamp),
        recent.entity.url = LAST(host.entity.url, @timestamp),
        recent.entity.risk.calculated_level = LAST(host.entity.risk.calculated_level, @timestamp),
        recent.entity.risk.calculated_score = LAST(host.entity.risk.calculated_score, @timestamp),
        recent.entity.risk.calculated_score_norm = LAST(host.entity.risk.calculated_score_norm, @timestamp),
        recent.entity.relationships.Communicates_with = MV_DEDUPE(TOP(host.entity.relationships.Communicates_with, 10)),
        recent.entity.relationships.Depends_on = MV_DEDUPE(TOP(host.entity.relationships.Depends_on, 10)),
        recent.entity.relationships.Dependent_of = MV_DEDUPE(TOP(host.entity.relationships.Dependent_of, 10)),
        recent.entity.relationships.Owned_by = MV_DEDUPE(TOP(host.entity.relationships.Owned_by, 10)),
        recent.entity.relationships.Accessed_frequently_by = MV_DEDUPE(TOP(host.entity.relationships.Accessed_frequently_by, 10))
        BY recent.host.entity.id
      | LOOKUP JOIN .entities.v1.latest.security_host_default
          ON recent.host.entity.id == host.entity.id
      | RENAME
        recent.host.entity.id AS host.entity.id
      | EVAL
        host.name = COALESCE(recent.host.name, host.name),
        host.domain = MV_DEDUPE(COALESCE(MV_APPEND(recent.host.domain, host.domain), recent.host.domain)),
        host.hostname = MV_DEDUPE(COALESCE(MV_APPEND(recent.host.hostname, host.hostname), recent.host.hostname)),
        host.id = MV_DEDUPE(COALESCE(MV_APPEND(recent.host.id, host.id), recent.host.id)),
        host.os.name = MV_DEDUPE(COALESCE(MV_APPEND(recent.host.os.name, host.os.name), recent.host.os.name)),
        host.os.type = MV_DEDUPE(COALESCE(MV_APPEND(recent.host.os.type, host.os.type), recent.host.os.type)),
        host.ip = MV_DEDUPE(COALESCE(MV_APPEND(recent.host.ip, host.ip), recent.host.ip)),
        host.mac = MV_DEDUPE(COALESCE(MV_APPEND(recent.host.mac, host.mac), recent.host.mac)),
        host.type = MV_DEDUPE(COALESCE(MV_APPEND(recent.host.type, host.type), recent.host.type)),
        host.architecture = MV_DEDUPE(COALESCE(MV_APPEND(recent.host.architecture, host.architecture), recent.host.architecture)),
        asset.id = COALESCE(recent.asset.id, asset.id),
        asset.name = COALESCE(recent.asset.name, asset.name),
        asset.owner = COALESCE(recent.asset.owner, asset.owner),
        asset.serial_number = COALESCE(recent.asset.serial_number, asset.serial_number),
        asset.model = COALESCE(recent.asset.model, asset.model),
        asset.vendor = COALESCE(recent.asset.vendor, asset.vendor),
        asset.environment = COALESCE(recent.asset.environment, asset.environment),
        asset.criticality = COALESCE(recent.asset.criticality, asset.criticality),
        asset.business_unit = COALESCE(recent.asset.business_unit, asset.business_unit),
        host.risk.calculated_level = COALESCE(recent.host.risk.calculated_level, host.risk.calculated_level),
        host.risk.calculated_score = COALESCE(recent.host.risk.calculated_score, host.risk.calculated_score),
        host.risk.calculated_score_norm = COALESCE(recent.host.risk.calculated_score_norm, host.risk.calculated_score_norm),
        entity.name = COALESCE(recent.entity.name, entity.name),
        entity.source = COALESCE(recent.entity.source, entity.source),
        entity.type = COALESCE(recent.entity.type, entity.type),
        entity.sub_type = COALESCE(recent.entity.sub_type, entity.sub_type),
        entity.url = COALESCE(recent.entity.url, entity.url),
        entity.risk.calculated_level = COALESCE(recent.entity.risk.calculated_level, entity.risk.calculated_level),
        entity.risk.calculated_score = COALESCE(recent.entity.risk.calculated_score, entity.risk.calculated_score),
        entity.risk.calculated_score_norm = COALESCE(recent.entity.risk.calculated_score_norm, entity.risk.calculated_score_norm),
        entity.relationships.Communicates_with = MV_DEDUPE(COALESCE(MV_APPEND(recent.entity.relationships.Communicates_with, entity.relationships.Communicates_with), recent.entity.relationships.Communicates_with)),
        entity.relationships.Depends_on = MV_DEDUPE(COALESCE(MV_APPEND(recent.entity.relationships.Depends_on, entity.relationships.Depends_on), recent.entity.relationships.Depends_on)),
        entity.relationships.Dependent_of = MV_DEDUPE(COALESCE(MV_APPEND(recent.entity.relationships.Dependent_of, entity.relationships.Dependent_of), recent.entity.relationships.Dependent_of)),
        entity.relationships.Owned_by = MV_DEDUPE(COALESCE(MV_APPEND(recent.entity.relationships.Owned_by, entity.relationships.Owned_by), recent.entity.relationships.Owned_by)),
        entity.relationships.Accessed_frequently_by = MV_DEDUPE(COALESCE(MV_APPEND(recent.entity.relationships.Accessed_frequently_by, entity.relationships.Accessed_frequently_by), recent.entity.relationships.Accessed_frequently_by)),
        entity.id = host.entity.id,
        @timestamp = recent.timestamp,
        entity.name = COALESCE(entity.name, host.name, entity.id),
        entity.Metadata.EngineType = "host"
      | KEEP
        host.name,
        host.domain,
        host.hostname,
        host.id,
        host.os.name,
        host.os.type,
        host.ip,
        host.mac,
        host.type,
        host.architecture,
        asset.id,
        asset.name,
        asset.owner,
        asset.serial_number,
        asset.model,
        asset.vendor,
        asset.environment,
        asset.criticality,
        asset.business_unit,
        host.risk.calculated_level,
        host.risk.calculated_score,
        host.risk.calculated_score_norm,
        entity.name,
        entity.source,
        entity.type,
        entity.sub_type,
        entity.url,
        entity.risk.calculated_level,
        entity.risk.calculated_score,
        entity.risk.calculated_score_norm,
        entity.relationships.Communicates_with,
        entity.relationships.Depends_on,
        entity.relationships.Dependent_of,
        entity.relationships.Owned_by,
        entity.relationships.Accessed_frequently_by,
        @timestamp,
        entity.id,
        host.entity.id,
        entity.Metadata.EngineType
      | LIMIT 10
      `)
    );
  });
});
