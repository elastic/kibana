/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import expect from '@kbn/expect';

export class EsIndexDataProvider {
  private es: EsClient;
  private readonly index: string;

  constructor(es: EsClient, index: string) {
    this.es = es;
    this.index = index;
  }

  async addBulk(docs: Array<Record<string, any>>, overrideTimestamp = true) {
    const operations = docs.flatMap((doc) => [
      { create: { _index: this.index } },
      { ...doc, ...(overrideTimestamp ? { '@timestamp': new Date().toISOString() } : {}) },
    ]);

    const resp = await this.es.bulk({ refresh: 'wait_for', index: this.index, operations });
    expect(resp.errors).eql(false, `Error in bulk indexing: ${JSON.stringify(resp)}`);

    return resp;
  }

  async deleteAll() {
    const indexExists = await this.es.indices.exists({ index: this.index });

    if (indexExists) {
      return this.es.deleteByQuery({
        index: this.index,
        query: { match_all: {} },
        refresh: true,
      });
    }
  }

  async destroyIndex() {
    // Resolve alias to concrete indices if the name matches an alias,
    // because ES rejects indices.delete on alias names.
    try {
      const aliasResult = await this.es.indices.getAlias({ name: this.index });
      const concreteIndices = Object.keys(aliasResult);
      if (concreteIndices.length > 0) {
        await this.es.indices.delete({ index: concreteIndices });
        return;
      }
    } catch {
      // Not an alias — fall through to delete as a concrete index
    }

    const indexExists = await this.es.indices.exists({ index: this.index });

    if (indexExists) {
      return this.es.indices.delete({ index: this.index });
    }
  }
}
