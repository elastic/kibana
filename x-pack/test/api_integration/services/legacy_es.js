/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { format as formatUrl } from 'url';

import * as legacyElasticsearch from 'elasticsearch';

import { elasticsearchJsPlugin as indexManagementEsClientPlugin } from '../../../plugins/index_management/server/client/elasticsearch';
import { elasticsearchJsPlugin as snapshotRestoreEsClientPlugin } from '../../../plugins/snapshot_restore/server/client/elasticsearch_sr';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { DEFAULT_API_VERSION } from '../../../../src/core/server/elasticsearch/elasticsearch_config';

export function LegacyEsProvider({ getService }) {
  const config = getService('config');

  return new legacyElasticsearch.Client({
    apiVersion: DEFAULT_API_VERSION,
    host: formatUrl(config.get('servers.elasticsearch')),
    requestTimeout: config.get('timeouts.esRequestTimeout'),
    plugins: [indexManagementEsClientPlugin, snapshotRestoreEsClientPlugin],
  });
}
