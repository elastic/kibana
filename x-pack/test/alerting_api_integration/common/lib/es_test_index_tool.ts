/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ES_TEST_INDEX_NAME = '.kibana-alerting-test-data';

export class ESTestIndexTool {
  constructor(
    private readonly es: any,
    private readonly retry: any,
    private readonly index: string = ES_TEST_INDEX_NAME
  ) {}

  async setup() {
    return await this.es.indices.create({
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
            group: {
              type: 'keyword',
            },
          },
        },
      },
    });
  }

  async destroy() {
    const indexExists = (await this.es.indices.exists({ index: this.index })).body;
    if (indexExists) {
      return await this.es.indices.delete({ index: this.index });
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
    return await this.es.search(params);
  }

  async waitForDocs(source: string, reference: string, numDocs: number = 1) {
    return await this.retry.try(async () => {
      const searchResult = await this.search(source, reference);
      if (searchResult.body.hits.total.value < numDocs) {
        throw new Error(`Expected ${numDocs} but received ${searchResult.body.hits.total.value}.`);
      }
      return searchResult.body.hits.hits;
    });
  }
}
