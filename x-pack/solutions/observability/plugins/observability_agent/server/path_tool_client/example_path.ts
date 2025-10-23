/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { contextFunctionHandler } from '../functions/context';
import { elasticsearchFunctionHandler } from '../functions/elasticsearch';
import { kibanaFunctionHandler } from '../functions/kibana';
import { elasticsearchApiDocFunctionHandler } from '../functions/retrieve_es_api_doc';
import type { PathDefinition } from './types';

// Example schema for a path structure
export const PATH_EXAMPLE: PathDefinition = {
  name: 'paht-123',
  description: 'A path to a location in the system',
  root: {
    id: 'context-node',
    description: 'The root context node of the path',
    tool: contextFunctionHandler,
    nodes: [
      {
        id: 'elasticsearch-node',
        description: 'elasticsearch node of the path',
        tool: elasticsearchFunctionHandler,
      },
      {
        id: 'kibana-node',
        description: 'kibana node of the path',
        tool: kibanaFunctionHandler,
      },
    ],
  },
};

export const RETRIEVE_ES_DOC: PathDefinition = {
  name: 'retrieve-es-doc-path',
  description: 'A path to retrieve Elasticsearch API documentation',
  root: {
    id: 'elasticsearch-api-doc',
    description:
      'retrieve elasticsearch api documentation before executing any elasticsearch query',
    tool: elasticsearchApiDocFunctionHandler,
    nodes: [
      {
        id: 'elasticsearch',
        description: 'query elasticsearch',
        tool: elasticsearchFunctionHandler,
      },
    ],
  },
};
