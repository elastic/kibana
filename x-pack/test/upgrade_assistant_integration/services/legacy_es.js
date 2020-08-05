/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { format as formatUrl } from 'url';

import * as legacyElasticsearch from 'elasticsearch';

export function LegacyEsProvider({ getService }) {
  const config = getService('config');

  return new legacyElasticsearch.Client({
    host: formatUrl(config.get('servers.elasticsearch')),
    requestTimeout: config.get('timeouts.esRequestTimeout'),
  });
}
