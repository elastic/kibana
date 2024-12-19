/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { getIndexAliasPerSpace } from './get_index_alias_per_space';

describe('getIndexAliasPerSpace', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
  });

  it('returns object with index alias and space', async () => {
    esClient.indices.getAlias.mockResponseOnce({
      '.siem-signals-default-old-one': {
        aliases: {
          '.siem-signals-default': {
            is_write_index: false,
          },
        },
      },
      '.siem-signals-another-1-legacy': {
        aliases: {
          '.siem-signals-another-1': {
            is_write_index: false,
          },
        },
      },
    });

    const result = await getIndexAliasPerSpace({
      esClient,
      signalsIndex: '.siem-signals',
      signalsAliasAllSpaces: '.siem-signals-*',
    });

    expect(result).toEqual({
      '.siem-signals-another-1-legacy': {
        alias: '.siem-signals-another-1',
        indexName: '.siem-signals-another-1-legacy',
        space: 'another-1',
      },
      '.siem-signals-default-old-one': {
        alias: '.siem-signals-default',
        indexName: '.siem-signals-default-old-one',
        space: 'default',
      },
    });
  });

  it('filters out .internal.alert indices', async () => {
    esClient.indices.getAlias.mockResponseOnce({
      '.siem-signals-default-old-one': {
        aliases: {
          '.siem-signals-default': {
            is_write_index: false,
          },
        },
      },
      '.internal.alerts-security.alerts-another-2-000001': {
        aliases: {
          '.siem-signals-another-2': {
            is_write_index: false,
          },
        },
      },
    });

    const result = await getIndexAliasPerSpace({
      esClient,
      signalsIndex: '.siem-signals',
      signalsAliasAllSpaces: '.siem-signals-*',
    });

    expect(result).toEqual({
      '.siem-signals-default-old-one': {
        alias: '.siem-signals-default',
        indexName: '.siem-signals-default-old-one',
        space: 'default',
      },
    });
  });
});
