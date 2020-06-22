/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  TreeOptions,
  Tree,
  EndpointDocGenerator,
} from '../../../plugins/security_solution/common/endpoint/generate_data';
import { FtrProviderContext } from '../ftr_provider_context';

/**
 * Options for build a resolver tree
 */
export interface Options extends TreeOptions {
  /**
   * Number of trees to generate.
   */
  numTrees?: number;
}

/**
 * Structure containing the generated trees and the ES index they live in
 */
export interface GeneratedTrees {
  trees: Tree[];
  index: string;
}

export function ResolverGeneratorProvider({ getService }: FtrProviderContext) {
  const client = getService('es');

  return {
    async createTrees(
      options: Options,
      eventsIndex: string = 'events-endpoint-1'
    ): Promise<GeneratedTrees> {
      const allTrees: Tree[] = [];
      const generator = new EndpointDocGenerator();
      const numTrees = options.numTrees ?? 1;
      for (let j = 0; j < numTrees; j++) {
        const tree = generator.generateTree(options);
        const body = tree.allEvents.reduce(
          (array: Array<Record<string, any>>, doc) => (
            /**
             * We're using data streams which require that a bulk use `create` instead of `index`.
             */
            array.push({ create: { _index: eventsIndex } }, doc), array
          ),
          []
        );
        // force a refresh here otherwise the documents might not be available when the tests search for them
        await client.bulk({ body, refresh: 'true' });
        allTrees.push(tree);
      }
      return { trees: allTrees, index: eventsIndex };
    },
    async deleteTrees(trees: GeneratedTrees) {
      /**
       * The ingest manager handles creating the template for the endpoint's indices. It is using a V2 template
       * with data streams. Data streams aren't included in the javascript elasticsearch client in kibana yet so we
       * need to do raw requests here. Delete a data stream is slightly different than that of a regular index which
       * is why we're using _data_stream here.
       */
      await client.transport.request({ method: 'DELETE', path: `_data_stream/${trees.index}` });
    },
  };
}
