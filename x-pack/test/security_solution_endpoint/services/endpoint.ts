/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ResponseError } from '@elastic/elasticsearch/lib/errors';
import { FtrService } from '../../functional/ftr_provider_context';
import { metadataCurrentIndexPattern } from '../../../plugins/security_solution/common/endpoint/constants';

export class EndpointTestResources extends FtrService {
  private readonly esClient = this.ctx.getService('es');
  private readonly retry = this.ctx.getService('retry');
  private readonly log = this.ctx.getService('log');

  /**
   * Waits for endpoints to show up on the `metadata-current` index.
   * Optionally, specific endpoint IDs (agent.id) can be provided to ensure those specific ones show up.
   *
   * @param [ids] optional list of ids to check for. If empty, it will just check if data exists in the index
   */
  async waitForEndpoints(ids: string[] = []) {
    const body = ids.length
      ? {
          query: {
            bool: {
              filter: [
                {
                  terms: {
                    'agent.id': ids,
                  },
                },
              ],
            },
          },
        }
      : {
          query: {
            match_all: {},
          },
        };

    // If we have a specific number of endpoint hosts to check for, then use that number,
    // else we just want to make sure the index has data, thus just having one in the index will do
    const size = ids.length || 1;

    await this.retry.waitFor('wait for endpoints hosts', async () => {
      try {
        const searchResponse = await this.esClient.search({
          index: metadataCurrentIndexPattern,
          size,
          body,
          rest_total_hits_as_int: true,
        });

        if (searchResponse.body.hits.total === size) {
          return true;
        }

        return false;
      } catch (error) {
        // We ignore 404's (index might not exist)
        if (error instanceof ResponseError && error.statusCode === 404) {
          return false;
        }

        // FIXME:PT use Endpoint here

        // Wrap the ES error so that we get a good stack trace
        throw new Error(error.message);
      }
    });
  }

  async setMetadataTransformInterval() {}
}
