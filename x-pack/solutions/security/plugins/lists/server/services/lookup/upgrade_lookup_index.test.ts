/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';

import { STAMP_PROPERTIES } from './build_lookup_mappings';
import { ensureLookupIndexCurrent, resetLookupIndexUpgrades } from './upgrade_lookup_index';

const INDEX = '.items-default-ranges';

const mappingWith = (properties: Record<string, unknown>): Record<string, unknown> => ({
  '.value-list-v2-default-ranges': { mappings: { properties } },
});

describe('ensureLookupIndexCurrent', () => {
  beforeEach(() => resetLookupIndexUpgrades());

  it('adds src_range, the run tag, and the stamps, and fills src_range from the stored bounds, when missing', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.indices.getMapping.mockResponse(
      mappingWith({ kind: { type: 'keyword' }, src_end: { type: 'ip' }, src_start: { type: 'ip' } })
    );

    await ensureLookupIndexCurrent({ esClient, index: INDEX, type: 'ip_range' });

    expect(esClient.indices.putMapping).toHaveBeenCalledWith({
      index: INDEX,
      properties: {
        ...STAMP_PROPERTIES,
        built_by: { type: 'keyword' },
        src_range: { type: 'ip_range' },
      },
    });
    expect(esClient.updateByQuery).toHaveBeenCalledTimes(1);
    const [[request]] = esClient.updateByQuery.mock.calls;
    expect(request).toMatchObject({
      conflicts: 'proceed',
      index: INDEX,
      query: {
        bool: {
          filter: [{ term: { kind: 'source' } }],
          must_not: [{ exists: { field: 'src_range' } }],
        },
      },
      refresh: true,
    });
    expect(request.script).toMatchObject({ lang: 'painless' });
  });

  it('adds only the stamps to an equality index that lacks them, with no backfill', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.indices.getMapping.mockResponse(mappingWith({ value: { type: 'ip' } }));

    await ensureLookupIndexCurrent({ esClient, index: INDEX, type: 'ip' });

    expect(esClient.indices.putMapping).toHaveBeenCalledWith({
      index: INDEX,
      properties: STAMP_PROPERTIES,
    });
    expect(esClient.updateByQuery).not.toHaveBeenCalled();
  });

  it('changes nothing when every field is present, and checks an index once per process', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.indices.getMapping.mockResponse(
      mappingWith({
        ...STAMP_PROPERTIES,
        built_by: { type: 'keyword' },
        src_range: { type: 'ip_range' },
      })
    );

    await ensureLookupIndexCurrent({ esClient, index: INDEX, type: 'ip_range' });
    await ensureLookupIndexCurrent({ esClient, index: INDEX, type: 'ip_range' });

    expect(esClient.indices.getMapping).toHaveBeenCalledTimes(1);
    expect(esClient.indices.putMapping).not.toHaveBeenCalled();
    expect(esClient.updateByQuery).not.toHaveBeenCalled();
  });
});
