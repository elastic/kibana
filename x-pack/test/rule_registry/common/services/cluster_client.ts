/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { format as formatUrl } from 'url';
import fs from 'fs';
import { Client, HttpConnection, Transport } from '@elastic/elasticsearch';
import { CA_CERT_PATH } from '@kbn/dev-utils';
import type {
  TransportRequestParams,
  TransportRequestOptions,
  TransportResult,
} from '@elastic/elasticsearch';

import { FtrProviderContext } from '../ftr_provider_context';

/*
 registers Kibana-specific @elastic/elasticsearch client instance.
 */
export function clusterClientProvider({ getService }: FtrProviderContext): Client {
  const config = getService('config');

  class KibanaTransport extends Transport {
    request(params: TransportRequestParams, options?: TransportRequestOptions) {
      const opts: TransportRequestOptions = options || {};
      // Enforce the client to return TransportResult.
      // It's required for bwc with responses in 7.x version.
      if (opts.meta === undefined) {
        opts.meta = true;
      }
      return super.request(params, opts) as Promise<TransportResult<any, any>>;
    }
  }

  if (process.env.TEST_CLOUD) {
    return new Client({
      nodes: [formatUrl(config.get('servers.elasticsearch'))],
      requestTimeout: config.get('timeouts.esRequestTimeout'),
      Transport: KibanaTransport,
      Connection: HttpConnection,
    });
  } else {
    return new Client({
      tls: {
        ca: fs.readFileSync(CA_CERT_PATH, 'utf-8'),
      },
      nodes: [formatUrl(config.get('servers.elasticsearch'))],
      requestTimeout: config.get('timeouts.esRequestTimeout'),
      Transport: KibanaTransport,
      Connection: HttpConnection,
    });
  }
}
