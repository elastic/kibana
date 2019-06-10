/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { format as formatUrl } from 'url';

import elasticsearch from 'elasticsearch';
import shieldPlugin from '../../../server/lib/esjs_shield_plugin';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { DEFAULT_API_VERSION } from '../../../../src/core/server/elasticsearch/elasticsearch_config';

export function EsProvider({ getService }) {
  const config = getService('config');

  return new elasticsearch.Client({
    apiVersion: DEFAULT_API_VERSION,
    host: formatUrl(config.get('servers.elasticsearch')),
    requestTimeout: config.get('timeouts.esRequestTimeout'),
    plugins: [shieldPlugin],
  });
}
