/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client, Transport } from '@elastic/elasticsearch';
import { createEsClientForFtrConfig } from '@kbn/test';
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

  return createEsClientForFtrConfig(config, {
    Transport: KibanaTransport,
  });
}
