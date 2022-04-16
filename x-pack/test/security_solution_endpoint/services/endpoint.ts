/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { Client } from '@elastic/elasticsearch';
import {
  metadataCurrentIndexPattern,
  metadataTransformPrefix,
  METADATA_UNITED_INDEX,
} from '@kbn/security-solution-plugin/common/endpoint/constants';
import {
  deleteIndexedHostsAndAlerts,
  IndexedHostsAndAlertsResponse,
  indexHostsAndAlerts,
} from '@kbn/security-solution-plugin/common/endpoint/index_data';
import { TransformConfigUnion } from '@kbn/transform-plugin/common/types/transform';
import { GetTransformsResponseSchema } from '@kbn/transform-plugin/common/api_schemas/transforms';
import { catchAndWrapError } from '@kbn/security-solution-plugin/server/endpoint/utils';
import { installOrUpgradeEndpointFleetPackage } from '@kbn/security-solution-plugin/common/endpoint/data_loaders/setup_fleet_for_endpoint';
import { EndpointError } from '@kbn/security-solution-plugin/common/endpoint/errors';
import { FtrService } from '../../functional/ftr_provider_context';

export class EndpointTestResources extends FtrService {
  private readonly esClient = this.ctx.getService('es');
  private readonly retry = this.ctx.getService('retry');
  private readonly kbnClient = this.ctx.getService('kibanaServer');
  private readonly transform = this.ctx.getService('transform');
  private readonly config = this.ctx.getService('config');

  private generateTransformId(endpointPackageVersion?: string): string {
    return `${metadataTransformPrefix}-${endpointPackageVersion ?? ''}`;
  }

  /**
   * Fetches the information for the endpoint transform
   *
   * @param [endpointPackageVersion] if set, it will be used to get the specific transform this this package version. Else just returns first one found
   */
  async getTransform(endpointPackageVersion?: string): Promise<TransformConfigUnion> {
    const transformId = this.generateTransformId(endpointPackageVersion);
    let transform: TransformConfigUnion | undefined;

    if (endpointPackageVersion) {
      await this.transform.api.waitForTransformToExist(transformId);

      transform = (
        (
          await this.transform.api
            .getTransform(transformId)
            .catch(catchAndWrapError)
            .then((response: { body: GetTransformsResponseSchema }) => response)
        ).body as GetTransformsResponseSchema
      ).transforms[0];
    } else {
      transform = (
        await this.transform.api.getTransformList(100).catch(catchAndWrapError)
      ).transforms.find((t) => t.id.startsWith(transformId));
    }

    if (!transform) {
      throw new EndpointError('Endpoint metadata transform not found');
    }

    return transform;
  }

  async setMetadataTransformFrequency(
    frequency: string,
    /** Used to update the transform installed with the given package version */
    endpointPackageVersion?: string
  ): Promise<void> {
    const transform = await this.getTransform(endpointPackageVersion).catch(catchAndWrapError);
    await this.transform.api.updateTransform(transform.id, { frequency }).catch(catchAndWrapError);
  }

  /**
   * Loads endpoint host/alert/event data into elasticsearch
   * @param [options]
   * @param [options.numHosts=1] Number of Endpoint Hosts to be loaded
   * @param [options.numHostDocs=1] Number of Document to be loaded per Endpoint Host (Endpoint hosts index uses a append-only index)
   * @param [options.alertsPerHost=1] Number of Alerts and Events to be loaded per Endpoint Host
   * @param [options.enableFleetIntegration=true] When set to `true`, Fleet data will also be loaded (ex. Integration Policies, Agent Policies, "fake" Agents)
   * @param [options.generatorSeed='seed`] The seed to be used by the data generator. Important in order to ensure the same data is generated on very run.
   * @param [options.waitUntilTransformed=true] If set to `true`, the data loading process will wait until the endpoint hosts metadata is processed by the transform
   */
  async loadEndpointData(
    options: Partial<{
      numHosts: number;
      numHostDocs: number;
      alertsPerHost: number;
      enableFleetIntegration: boolean;
      generatorSeed: string;
      waitUntilTransformed: boolean;
    }> = {}
  ): Promise<IndexedHostsAndAlertsResponse> {
    const {
      numHosts = 1,
      numHostDocs = 1,
      alertsPerHost = 1,
      enableFleetIntegration = true,
      generatorSeed = 'seed',
      waitUntilTransformed = true,
    } = options;

    // load data into the system
    const indexedData = await indexHostsAndAlerts(
      this.esClient as Client,
      this.kbnClient,
      generatorSeed,
      numHosts,
      numHostDocs,
      'metrics-endpoint.metadata-default',
      'metrics-endpoint.policy-default',
      'logs-endpoint.events.process-default',
      'logs-endpoint.alerts-default',
      alertsPerHost,
      enableFleetIntegration
    );

    if (waitUntilTransformed) {
      await this.waitForEndpoints(indexedData.hosts.map((host) => host.agent.id));
    }

    return indexedData;
  }

  /**
   * Deletes the loaded data created via `loadEndpointData()`
   * @param indexedData
   */
  async unloadEndpointData(indexedData: IndexedHostsAndAlertsResponse) {
    return deleteIndexedHostsAndAlerts(this.esClient as Client, this.kbnClient, indexedData);
  }

  private async waitForIndex(
    ids: string[],
    index: string,
    body: any = {},
    timeout: number = this.config.get('timeouts.waitFor')
  ) {
    // If we have a specific number of endpoint hosts to check for, then use that number,
    // else we just want to make sure the index has data, thus just having one in the index will do
    const size = ids.length || 1;

    await this.retry.waitForWithTimeout(`endpoint hosts in ${index}`, timeout, async () => {
      try {
        const searchResponse = await this.esClient.search({
          index,
          size,
          body,
          rest_total_hits_as_int: true,
        });

        return searchResponse.hits.total === size;
      } catch (error) {
        // We ignore 404's (index might not exist)
        if (error instanceof errors.ResponseError && error.statusCode === 404) {
          return false;
        }

        // Wrap the ES error so that we get a good stack trace
        throw new EndpointError(error.message, error);
      }
    });
  }

  /**
   * Waits for endpoints to show up on the `metadata-current` index.
   * Optionally, specific endpoint IDs (agent.id) can be provided to ensure those specific ones show up.
   *
   * @param [ids] optional list of ids to check for. If empty, it will just check if data exists in the index
   * @param [timeout] optional max timeout to waitFor in ms. default is 20000.
   */
  async waitForEndpoints(ids: string[] = [], timeout = this.config.get('timeouts.waitFor')) {
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
          size: 1,
          query: {
            match_all: {},
          },
        };

    await this.waitForIndex(ids, metadataCurrentIndexPattern, body, timeout);
  }

  /**
   * Waits for endpoints to show up on the `metadata_united` index.
   * Optionally, specific endpoint IDs (agent.id) can be provided to ensure those specific ones show up.
   *
   * @param [ids] optional list of ids to check for. If empty, it will just check if data exists in the index
   * @param [timeout] optional max timeout to waitFor in ms. default is 20000.
   */
  async waitForUnitedEndpoints(ids: string[] = [], timeout = this.config.get('timeouts.waitFor')) {
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
                // make sure that both endpoint and agent portions are populated
                // since agent is likely to be populated first
                { exists: { field: 'united.endpoint.agent.id' } },
                { exists: { field: 'united.agent.agent.id' } },
              ],
            },
          },
        }
      : {
          size: 1,
          query: {
            match_all: {},
          },
        };

    await this.waitForIndex(ids, METADATA_UNITED_INDEX, body, timeout);
  }

  /**
   * installs (or upgrades) the Endpoint Fleet package
   * (NOTE: ensure that fleet is setup first before calling this function)
   */
  async installOrUpgradeEndpointFleetPackage(): ReturnType<
    typeof installOrUpgradeEndpointFleetPackage
  > {
    return installOrUpgradeEndpointFleetPackage(this.kbnClient);
  }
}
