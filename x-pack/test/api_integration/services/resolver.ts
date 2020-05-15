/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  TreeOptions,
  Tree,
  EndpointDocGenerator,
} from '../../../plugins/endpoint/common/generate_data';
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
            array.push({ create: { _index: eventsIndex } }, doc), array
          ),
          []
        );
        await client.bulk({ body, refresh: 'true' });
        allTrees.push(tree);
      }
      return { trees: allTrees, index: eventsIndex };
    },
    async deleteTrees(trees: GeneratedTrees) {
      await client.transport.request({ method: 'DELETE', path: `_data_stream/${trees.index}` });
    },
  };
}
