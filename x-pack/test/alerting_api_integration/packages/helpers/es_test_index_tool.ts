/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Client } from '@elastic/elasticsearch';
import { DeleteByQueryRequest } from '@elastic/elasticsearch/lib/api/types';

export const ES_TEST_INDEX_NAME = '.kibana-alerting-test-data';

export class ESTestIndexTool {
  constructor(
    private readonly es: Client,
    private readonly retry: any,
    private readonly index: string = ES_TEST_INDEX_NAME
  ) {}

  async setup() {
    return await this.es.indices.create(
      {
        index: this.index,
        body: {
          mappings: {
            properties: {
              source: {
                type: 'keyword',
              },
              reference: {
                type: 'keyword',
              },
              params: {
                enabled: false,
                type: 'object',
              },
              config: {
                enabled: false,
                type: 'object',
              },
              state: {
                enabled: false,
                type: 'object',
              },
              date: {
                type: 'date',
                format: 'strict_date_time',
              },
              date_epoch_millis: {
                type: 'date',
                format: 'epoch_millis',
              },
              testedValue: {
                type: 'long',
              },
              testedValueFloat: {
                type: 'float',
              },
              testedValueUnsigned: {
                type: 'unsigned_long',
              },
              group: {
                type: 'keyword',
              },
              host: {
                properties: {
                  hostname: {
                    type: 'text',
                    fields: {
                      keyword: {
                        type: 'keyword',
                        ignore_above: 256,
                      },
                    },
                  },
                  id: {
                    type: 'keyword',
                  },
                  name: {
                    type: 'keyword',
                  },
                },
              },
            },
          },
        },
      },
      { meta: true }
    );
  }

  async indexDoc(source: string, reference?: string) {
    return await this.es.index({
      index: this.index,
      document: {
        source,
        reference,
      },
      refresh: true,
    });
  }

  async destroy() {
    const indexExists = await this.es.indices.exists({ index: this.index });
    if (indexExists) {
      return await this.es.indices.delete({ index: this.index }, { meta: true });
    }
  }

  async search(source: string, reference?: string) {
    const body = reference
      ? {
          query: {
            bool: {
              must: [
                {
                  term: {
                    source,
                  },
                },
                {
                  term: {
                    reference,
                  },
                },
              ],
            },
          },
        }
      : {
          query: {
            term: {
              source,
            },
          },
        };
    const params = {
      index: this.index,
      size: 1000,
      body,
    };
    return await this.es.search(params, { meta: true });
  }

  async getAll(size: number = 10) {
    const params = {
      index: this.index,
      size,
      body: {
        query: {
          match_all: {},
        },
      },
    };
    return await this.es.search(params, { meta: true });
  }

  async removeAll() {
    const params: DeleteByQueryRequest = {
      index: this.index,
      query: {
        match_all: {},
      },
      conflicts: 'proceed',
    };
    return await this.es.deleteByQuery(params);
  }

  async waitForDocs(source: string, reference: string, numDocs: number = 1) {
    return await this.retry.try(async () => {
      const searchResult = await this.search(source, reference);
      // @ts-expect-error doesn't handle total: number
      const value = searchResult.body.hits.total.value?.value || searchResult.body.hits.total.value;
      if (value < numDocs) {
        // @ts-expect-error doesn't handle total: number
        throw new Error(`Expected ${numDocs} but received ${searchResult.body.hits.total.value}.`);
      }
      return searchResult.body.hits.hits;
    });
  }
}
