/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';

import { CONNECTORS_INDEX, Connector } from '@kbn/search-connectors';

export async function updateHtmlExtraction(
  client: IScopedClusterClient,
  htmlExtraction: boolean,
  connector: Connector
) {
  return await client.asCurrentUser.update({
    doc: {
      configuration: {
        ...connector.configuration,
        extract_full_html: {
          label: 'Extract full HTML',
          value: htmlExtraction,
        },
      },
    },
    id: connector.id,
    index: CONNECTORS_INDEX,
  });
}
