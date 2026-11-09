/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { fetchGroupMemberIds, fetchGroupMembers } from './fetch_group_member_ids';

const RESOLVED_TO_FIELD = 'entity.relationships.resolution.resolved_to';

const buildClient = (members: ReadonlyArray<[memberId: string, headId: string]>) => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  esClient.search.mockResolvedValue({
    took: 1,
    timed_out: false,
    _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
    hits: {
      hits: members.map(([memberId, headId]) => ({
        _index: 'entities',
        _id: memberId,
        fields: { 'entity.id': [memberId], [RESOLVED_TO_FIELD]: [headId] },
      })),
    },
  });
  return esClient;
};

describe('fetchGroupMemberIds', () => {
  it('lists the entities resolved to each entity, by its id', async () => {
    const esClient = buildClient([
      ['host:a1', 'host:a'],
      ['host:a2', 'host:a'],
      ['host:b1', 'host:b'],
    ]);

    expect(await fetchGroupMemberIds(esClient, 'default', ['host:a', 'host:b', 'host:c'])).toEqual({
      'host:a': ['host:a1', 'host:a2'],
      'host:b': ['host:b1'],
    });
  });

  it('reads the members of the entities, in the entities of the space', async () => {
    const esClient = buildClient([]);

    await fetchGroupMemberIds(esClient, 'security', ['host:a', 'host:b']);

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: expect.stringContaining('security'),
        query: { terms: { [RESOLVED_TO_FIELD]: ['host:a', 'host:b'] } },
      })
    );
  });

  it('asks for no more hits than a search returns', async () => {
    const esClient = buildClient([]);

    await fetchGroupMemberIds(esClient, 'default', ['host:a']);

    expect(esClient.search).toHaveBeenCalledWith(expect.objectContaining({ size: 10_000 }));
  });

  it('reads nothing without entity ids', async () => {
    const esClient = buildClient([]);

    expect(await fetchGroupMemberIds(esClient, 'default', [])).toEqual({});
    expect(esClient.search).not.toHaveBeenCalled();
  });

  it('fails when the groups have more members than one request reads', async () => {
    const esClient = buildClient(Array.from({ length: 10_000 }, (_, i) => [`host:${i}`, 'host:a']));

    await expect(fetchGroupMemberIds(esClient, 'default', ['host:a'])).rejects.toThrow(
      'too many members'
    );
  });
});

describe('fetchGroupMembers', () => {
  it("returns each member's id with the asked-for fields of its record, nested", async () => {
    const esClient = buildClient([['host:a1', 'host:a']]);
    esClient.search.mockResolvedValueOnce({
      took: 1,
      timed_out: false,
      _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      hits: {
        hits: [
          {
            _index: 'entities',
            _id: 'host:a1',
            fields: { 'entity.id': ['host:a1'], [RESOLVED_TO_FIELD]: ['host:a'] },
            _source: { 'asset.criticality': 'high_impact' },
          },
        ],
      },
    });

    expect(await fetchGroupMembers(esClient, 'default', ['host:a'], ['asset.criticality'])).toEqual(
      {
        'host:a': [{ id: 'host:a1', record: { asset: { criticality: 'high_impact' } } }],
      }
    );
    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({ _source: ['asset.criticality'] })
    );
  });
});
