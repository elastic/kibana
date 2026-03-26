/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import {
  GRAPH_ACTOR_ENTITY_FIELDS,
  GRAPH_TARGET_ENTITY_FIELDS,
} from '@kbn/cloud-security-posture-common/constants';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { SECURITY_ALERTS_PARTIAL_IDENTIFIER } from '../../../common/constants';
import { fetchEntities } from './fetch';

describe('fetchEntities', () => {
  const esClient = elasticsearchServiceMock.createScopedClusterClient();
  let logger: Logger;

  beforeEach(() => {
    logger = {
      trace: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
    } as unknown as Logger;

    const toRecordsMock = jest.fn().mockResolvedValue([{ entityId: 'entity-1' }]);
    esClient.asCurrentUser.helpers.esql.mockReturnValue({
      toRecords: toRecordsMock,
      toArrowTable: jest.fn(),
      toArrowReader: jest.fn(),
    });

    (esClient.asInternalUser.indices as jest.Mocked<any>).getSettings = jest
      .fn()
      .mockRejectedValue({ statusCode: 404 });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('uses the default index patterns and entity-id params when indexPatterns are not provided', async () => {
    await fetchEntities({
      esClient,
      logger,
      entityIds: ['entity-1', 'entity-2'],
      start: 'now-1d',
      end: 'now',
      spaceId: 'default',
    });

    const esqlCallArgs = esClient.asCurrentUser.helpers.esql.mock.calls[0][0];
    expect(esqlCallArgs.query).toContain(
      `FROM ${SECURITY_ALERTS_PARTIAL_IDENTIFIER}default,logs-* METADATA _index`
    );
    expect(esqlCallArgs.params).toEqual([{ entity_id0: 'entity-1' }, { entity_id1: 'entity-2' }]);
  });

  it('builds the DSL filter across actor and target entity fields', async () => {
    await fetchEntities({
      esClient,
      logger,
      entityIds: ['entity-1'],
      start: 'now-1d',
      end: 'now',
      spaceId: 'default',
      indexPatterns: ['logs-*'],
    });

    const esqlCallArgs = esClient.asCurrentUser.helpers.esql.mock.calls[0][0];
    const filter = esqlCallArgs.filter as {
      bool?: {
        filter?: QueryDslQueryContainer[];
      };
    };
    const targetFilterClause = Array.isArray(filter.bool?.filter)
      ? (filter.bool.filter[1] as { bool?: { should?: QueryDslQueryContainer[] } })
      : undefined;
    const shouldClauses = targetFilterClause?.bool?.should ?? [];

    GRAPH_ACTOR_ENTITY_FIELDS.forEach((field) => {
      expect(shouldClauses).toContainEqual({ terms: { [field]: ['entity-1'] } });
    });
    GRAPH_TARGET_ENTITY_FIELDS.forEach((field) => {
      expect(shouldClauses).toContainEqual({ terms: { [field]: ['entity-1'] } });
    });
  });

  it('uses lookup join when the entities index is in lookup mode', async () => {
    (esClient.asInternalUser.indices as jest.Mocked<any>).getSettings = jest
      .fn()
      .mockResolvedValueOnce({
        '.entities.v2.latest.security_default': {
          settings: {
            index: {
              mode: 'lookup',
            },
          },
        },
      });

    await fetchEntities({
      esClient,
      logger,
      entityIds: ['entity-1'],
      start: 'now-1d',
      end: 'now',
      spaceId: 'default',
      indexPatterns: ['logs-*'],
    });

    const esqlCallArgs = esClient.asCurrentUser.helpers.esql.mock.calls[0][0];
    expect(esqlCallArgs.query).toContain(
      '| LOOKUP JOIN .entities.v2.latest.security_default ON entity.id'
    );
    expect(esqlCallArgs.query).not.toContain('ENRICH');
  });

  it('falls back to null enrichment fields when lookup mode is unavailable', async () => {
    await fetchEntities({
      esClient,
      logger,
      entityIds: ['entity-1'],
      start: 'now-1d',
      end: 'now',
      spaceId: 'default',
      indexPatterns: ['logs-*'],
    });

    const esqlCallArgs = esClient.asCurrentUser.helpers.esql.mock.calls[0][0];
    expect(esqlCallArgs.query).toContain('| EVAL entityName = TO_STRING(null)');
    expect(esqlCallArgs.query).toContain('| EVAL availableInEntityStore = false');
    expect(esqlCallArgs.query).not.toContain('ENRICH');
    expect((esClient.asInternalUser.enrich as jest.Mocked<any>).getPolicy).not.toHaveBeenCalled();
  });
});
