/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import { EntityType } from '../../../../../../common/entity_analytics/types';
import type { RiskEngineConfiguration } from '../../../types';
import type { ScopedLogger } from '../utils/with_log_context';
import {
  buildUnifiedAlertSourceEsql,
  buildV1AlertWhere,
  buildV2AlertWhere,
  getEuidSourceFields,
  resolveUnifiedAlertSources,
  RULE_EVENTS_DATA_STREAM,
} from './alert_sources';

const buildLogger = (): ScopedLogger =>
  ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as ScopedLogger);

const buildConfiguration = (
  overrides: Partial<RiskEngineConfiguration> = {}
): RiskEngineConfiguration => ({
  dataViewId: '.alerts-security.alerts-default',
  enabled: true,
  filter: {},
  identifierType: undefined,
  interval: '1h',
  pageSize: 1000,
  range: { start: '2026-01-01T00:00:00.000Z', end: '2026-01-31T00:00:00.000Z' },
  enableResetToZero: true,
  excludeAlertStatuses: ['closed'],
  _meta: { mappingsVersion: 8 },
  ...overrides,
});

describe('alert_sources', () => {
  describe('buildV1AlertWhere', () => {
    it('requires a risk score and bounds the time range', () => {
      const where = buildV1AlertWhere({
        configuration: buildConfiguration(),
        entityType: EntityType.host,
      });

      expect(where).toContain('kibana.alert.risk_score IS NOT NULL');
      expect(where).toContain(
        '@timestamp >= "2026-01-01T00:00:00.000Z" AND @timestamp < "2026-01-31T00:00:00.000Z"'
      );
    });

    it('excludes statuses and tags through KQL so alerts without the field are kept', () => {
      const where = buildV1AlertWhere({
        configuration: buildConfiguration({
          excludeAlertStatuses: ['closed', 'acknowledged'],
          excludeAlertTags: ['noise', 'false positive'],
        }),
        entityType: EntityType.host,
      });

      expect(where).toContain(
        'KQL("NOT kibana.alert.workflow_status:(\\"closed\\" or \\"acknowledged\\")")'
      );
      expect(where).toContain(
        'KQL("NOT kibana.alert.workflow_tags:(\\"noise\\" or \\"false positive\\")")'
      );
    });

    it('applies only the custom KQL filters of the entity type being scored', () => {
      const where = buildV1AlertWhere({
        configuration: buildConfiguration({
          filters: [
            { entity_types: ['host'], filter: 'host.name: "web-01"' },
            { entity_types: ['user'], filter: 'user.name: "svc"' },
          ],
        }),
        entityType: EntityType.host,
      });

      expect(where).toContain('KQL("host.name: \\"web-01\\"")');
      expect(where.join(' ')).not.toContain('user.name');
    });

    it('skips an invalid custom KQL filter with a warning instead of failing the run', () => {
      const logger = buildLogger();
      const where = buildV1AlertWhere({
        configuration: buildConfiguration({
          filters: [{ entity_types: ['host'], filter: 'host.name: (' }],
        }),
        entityType: EntityType.host,
        logger,
      });

      expect(where.some((clause) => clause.includes('host.name'))).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Skipping invalid KQL custom filter for host')
      );
    });

    it('warns that a raw query DSL filter cannot be applied', () => {
      const logger = buildLogger();
      buildV1AlertWhere({
        configuration: buildConfiguration({ filter: { term: { 'host.name': 'x' } } }),
        entityType: EntityType.host,
        logger,
      });

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('raw query DSL `filter`'));
    });
  });

  describe('buildV2AlertWhere', () => {
    it('selects alert-kind events of the space in the time range', () => {
      const { where } = buildV2AlertWhere({
        configuration: buildConfiguration(),
        entityType: EntityType.host,
        spaceId: 'default',
      });

      expect(where).toEqual([
        'type == "alert"',
        'space_id == "default"',
        '@timestamp >= "2026-01-01T00:00:00.000Z" AND @timestamp < "2026-01-31T00:00:00.000Z"',
      ]);
    });

    it('maps the closed exclusion onto inactive episodes', () => {
      expect(
        buildV2AlertWhere({
          configuration: buildConfiguration({ excludeAlertStatuses: ['closed'] }),
          entityType: EntityType.host,
          spaceId: 'default',
        }).excludeInactive
      ).toBe(true);
      expect(
        buildV2AlertWhere({
          configuration: buildConfiguration({ excludeAlertStatuses: [] }),
          entityType: EntityType.host,
          spaceId: 'default',
        }).excludeInactive
      ).toBe(false);
    });

    it('warns about exclusions and filters it cannot apply to v2 alerts yet', () => {
      const logger = buildLogger();
      buildV2AlertWhere({
        configuration: buildConfiguration({
          excludeAlertStatuses: ['closed', 'acknowledged'],
          excludeAlertTags: ['noise'],
          filters: [{ entity_types: ['host'], filter: 'host.name: "web-01"' }],
        }),
        entityType: EntityType.host,
        spaceId: 'default',
        logger,
      });

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Excluding alert statuses [acknowledged]')
      );
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Excluding alert tags is not supported on v2 alerts')
      );
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('1 custom KQL filter(s) for host are not applied to v2 alerts')
      );
    });
  });

  describe('getEuidSourceFields', () => {
    it('lists the raw fields the host EUID derivation reads', () => {
      expect(getEuidSourceFields(EntityType.host)).toEqual([
        'data_stream.dataset',
        'event.dataset',
        'event.module',
        'host.hostname',
        'host.id',
        'host.name',
      ]);
    });

    it('excludes computed columns from the user derivation', () => {
      const fields = getEuidSourceFields(EntityType.user);

      expect(fields).toEqual(expect.arrayContaining(['user.name', 'host.id', 'cloud.provider']));
      expect(fields).not.toContain('entity.namespace');
      expect(fields.some((field) => field.startsWith('_'))).toBe(false);
    });
  });

  describe('buildUnifiedAlertSourceEsql', () => {
    const sources = {
      v1: {
        kind: 'v1' as const,
        index: '.alerts-security.alerts-default',
        where: ['kibana.alert.risk_score IS NOT NULL'],
      },
      v2: {
        kind: 'v2' as const,
        index: RULE_EVENTS_DATA_STREAM,
        where: ['type == "alert"', 'space_id == "default"'],
        excludeInactive: true,
      },
    };

    it('unions one arm per store, each projecting the same row', () => {
      const esql = buildUnifiedAlertSourceEsql(sources, EntityType.host);

      expect(esql.startsWith('FROM (')).toBe(true);
      expect(esql).toContain('FROM .alerts-security.alerts-default METADATA _index');
      expect(esql).toContain('FROM .rule-events METADATA _index');
      expect(esql).toContain('| WHERE kibana.alert.risk_score IS NOT NULL');
      expect(esql).toContain('| WHERE type == "alert" AND space_id == "default"');

      const keeps = esql.match(/\| KEEP .*/g) ?? [];
      expect(keeps).toHaveLength(2);
      expect(keeps[0]).toBe(keeps[1]);
      expect(keeps[0]).toContain('stamped_entity_id, source_kind, _index, `data_stream.dataset`');
    });

    it('folds v2 events to one row per episode and drops inactive ones', () => {
      const esql = buildUnifiedAlertSourceEsql(sources, EntityType.host);

      expect(esql).toContain('| INLINE STATS last_timestamp = MAX(@timestamp) BY alert.id');
      expect(esql).toContain('| WHERE @timestamp == last_timestamp AND alert.status != "inactive"');
      expect(esql).toContain('| LIMIT 1 BY alert.id');
      expect(esql).toContain('risk_score = FIELD_EXTRACT(data, "kibana.alert.risk_score")::double');
      expect(esql).toContain('`host.name` = FIELD_EXTRACT(data, "host.name")::keyword');
      expect(esql).toContain('| WHERE risk_score IS NOT NULL');
    });

    it('keeps inactive v2 episodes when closed alerts are not excluded', () => {
      const esql = buildUnifiedAlertSourceEsql(
        { v2: { ...sources.v2, excludeInactive: false } },
        EntityType.host
      );

      expect(esql).toContain('| WHERE @timestamp == last_timestamp\n');
      expect(esql).not.toContain('alert.status != "inactive"');
      expect(esql).not.toContain('.alerts-security');
    });

    it('casts v1 identity fields so both arms agree on types', () => {
      const esql = buildUnifiedAlertSourceEsql({ v1: sources.v1 }, EntityType.host);

      expect(esql).toContain('`host.name` = `host.name`::keyword');
      expect(esql).toContain('stamped_entity_id = kibana.alert.entity.id::keyword');
      expect(esql).toContain('source_kind = "v1"');
    });

    it('throws without any store', () => {
      expect(() => buildUnifiedAlertSourceEsql({}, EntityType.host)).toThrow(
        'at least one alert store'
      );
    });
  });

  describe('resolveUnifiedAlertSources', () => {
    let esClient: ElasticsearchClient;
    const params = {
      configuration: buildConfiguration(),
      alertsIndex: '.alerts-security.alerts-default',
      entityType: EntityType.host,
      spaceId: 'default',
    };

    beforeEach(() => {
      esClient = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;
    });

    it('builds an arm for each store that exists', async () => {
      (esClient.indices.exists as jest.Mock)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true);

      const sources = await resolveUnifiedAlertSources({
        esClient,
        logger: buildLogger(),
        ...params,
      });

      expect(sources?.v1?.index).toBe('.alerts-security.alerts-default');
      expect(sources?.v2?.index).toBe(RULE_EVENTS_DATA_STREAM);
      expect(sources?.v2?.where).toContain('space_id == "default"');
      expect(esClient.indices.exists).toHaveBeenNthCalledWith(1, {
        index: '.alerts-security.alerts-default',
      });
      expect(esClient.indices.exists).toHaveBeenNthCalledWith(2, {
        index: RULE_EVENTS_DATA_STREAM,
      });
    });

    it('leaves out a store that does not exist yet', async () => {
      (esClient.indices.exists as jest.Mock)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);

      const sources = await resolveUnifiedAlertSources({
        esClient,
        logger: buildLogger(),
        ...params,
      });

      expect(sources?.v1).toBeUndefined();
      expect(sources?.v2).toBeDefined();
    });

    it('returns nothing when neither store exists', async () => {
      (esClient.indices.exists as jest.Mock)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false);

      await expect(
        resolveUnifiedAlertSources({ esClient, logger: buildLogger(), ...params })
      ).resolves.toBeUndefined();
    });
  });
});
