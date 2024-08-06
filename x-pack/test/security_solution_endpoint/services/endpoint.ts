/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

import { Client, errors } from '@elastic/elasticsearch';
import { AGENTS_INDEX } from '@kbn/fleet-plugin/common';
import {
  HOST_METADATA_GET_ROUTE,
  METADATA_CURRENT_TRANSFORM_V2,
  METADATA_DATASTREAM,
  METADATA_UNITED_INDEX,
  METADATA_UNITED_TRANSFORM,
  METADATA_UNITED_TRANSFORM_V2,
  metadataCurrentIndexPattern,
  metadataTransformPrefix,
} from '@kbn/security-solution-plugin/common/endpoint/constants';
import {
  deleteIndexedHostsAndAlerts,
  IndexedHostsAndAlertsResponse,
  indexHostsAndAlerts,
} from '@kbn/security-solution-plugin/common/endpoint/index_data';
import { getEndpointPackageInfo } from '@kbn/security-solution-plugin/common/endpoint/utils/package';
import { isEndpointPackageV2 } from '@kbn/security-solution-plugin/common/endpoint/utils/package_v2';
import { installOrUpgradeEndpointFleetPackage } from '@kbn/security-solution-plugin/common/endpoint/data_loaders/setup_fleet_for_endpoint';
import { EndpointError } from '@kbn/security-solution-plugin/common/endpoint/errors';
import { STARTED_TRANSFORM_STATES } from '@kbn/security-solution-plugin/common/constants';
import { DeepPartial } from 'utility-types';
import { HostInfo, HostMetadata } from '@kbn/security-solution-plugin/common/endpoint/types';
import { EndpointDocGenerator } from '@kbn/security-solution-plugin/common/endpoint/generate_data';
import { EndpointMetadataGenerator } from '@kbn/security-solution-plugin/common/endpoint/data_generators/endpoint_metadata_generator';
import { merge } from 'lodash';
// @ts-expect-error we have to check types with "allowJs: false" for now, causing this import to fail
import { kibanaPackageJson } from '@kbn/repo-info';
import seedrandom from 'seedrandom';
import { fetchFleetLatestAvailableAgentVersion } from '@kbn/security-solution-plugin/common/endpoint/utils/fetch_fleet_version';
import { KbnClient } from '@kbn/test';
import { isServerlessKibanaFlavor } from '@kbn/security-solution-plugin/common/endpoint/utils/kibana_status';
import { FtrService } from '../../functional/ftr_provider_context';

// Document Generator override that uses a custom Endpoint Metadata generator and sets the
// `agent.version` to the current version

const createDocGeneratorClass = async (kbnClient: KbnClient, isServerless: boolean) => {
  let version = kibanaPackageJson.version;
  if (isServerless) {
    version = await fetchFleetLatestAvailableAgentVersion(kbnClient);
  }
  // TS doesn't like the `version` let being used in the class definition
  const capturedVersion = version;

  return class extends EndpointDocGenerator {
    constructor(seedValue: string | seedrandom.prng) {
      const MetadataGenerator = class extends EndpointMetadataGenerator {
        protected randomVersion(): string {
          return capturedVersion;
        }
      };

      super(seedValue, MetadataGenerator);
    }
  };
};

export class EndpointTestResources extends FtrService {
  private readonly esClient = this.ctx.getService('es');
  private readonly retry = this.ctx.getService('retry');
  private readonly kbnClient = this.ctx.getService('kibanaServer');
  private readonly config = this.ctx.getService('config');
  private readonly supertest = this.ctx.getService('supertest');
  private readonly log = this.ctx.getService('log');

  private async stopTransform(transformId: string) {
    const stopRequest = {
      transform_id: `${transformId}*`,
      force: true,
      wait_for_completion: true,
      allow_no_match: true,
    };
    return this.esClient.transform.stopTransform(stopRequest);
  }

  private async startTransform(transformId: string) {
    const transformsResponse = await this.esClient.transform.getTransformStats({
      transform_id: `${transformId}*`,
    });
    return Promise.all(
      transformsResponse.transforms.map((transform) => {
        if (STARTED_TRANSFORM_STATES.has(transform.state)) {
          return Promise.resolve();
        }
        return this.esClient.transform.startTransform({ transform_id: transform.id });
      })
    );
  }

  /**
   * Loads endpoint host/alert/event data into elasticsearch
   * @param [options]
   * @param [options.numHosts=1] Number of Endpoint Hosts to be loaded
   * @param [options.numHostDocs=1] Number of Document to be loaded per Endpoint Host (Endpoint hosts index uses a append-only index)
   * @param [options.alertsPerHost=1] Number of Alerts and Events to be loaded per Endpoint Host
   * @param [options.enableFleetIntegration=true] When set to `true`, Fleet data will also be loaded (ex. Integration Policies, Agent Policies, "fake" Agents)
   * @param [options.generatorSeed='seed'] The seed to be used by the data generator. Important in order to ensure the same data is generated on very run.
   * @param [options.waitUntilTransformed=true] If set to `true`, the data loading process will wait until the endpoint hosts metadata is processed by the transform
   * @param [options.waitTimeout=120000] If waitUntilTransformed=true, number of ms to wait until timeout
   * @param [options.customIndexFn] If provided, will use this function to generate and index data instead
   */
  async loadEndpointData(
    options: Partial<{
      numHosts: number;
      numHostDocs: number;
      alertsPerHost: number;
      enableFleetIntegration: boolean;
      generatorSeed: string;
      waitUntilTransformed: boolean;
      waitTimeout: number;
      customIndexFn: () => Promise<IndexedHostsAndAlertsResponse>;
    }> = {}
  ): Promise<IndexedHostsAndAlertsResponse> {
    const {
      numHosts = 1,
      numHostDocs = 1,
      alertsPerHost = 1,
      enableFleetIntegration = true,
      generatorSeed = 'seed',
      waitUntilTransformed = true,
      waitTimeout = 120000,
      customIndexFn,
    } = options;

    let currentTransformName = metadataTransformPrefix;
    let unitedTransformName = METADATA_UNITED_TRANSFORM;
    if (waitUntilTransformed && customIndexFn) {
      const endpointPackage = await getEndpointPackageInfo(this.kbnClient);
      const isV2 = isEndpointPackageV2(endpointPackage.version);

      if (isV2) {
        currentTransformName = METADATA_CURRENT_TRANSFORM_V2;
        unitedTransformName = METADATA_UNITED_TRANSFORM_V2;
      }
    }

    if (waitUntilTransformed && customIndexFn) {
      // need this before indexing docs so that the united transform doesn't
      // create a checkpoint with a timestamp after the doc timestamps
      await this.stopTransform(currentTransformName);
      await this.stopTransform(unitedTransformName);
    }

    const isServerless = await isServerlessKibanaFlavor(this.kbnClient);
    const CurrentKibanaVersionDocGenerator = await createDocGeneratorClass(
      this.kbnClient,
      isServerless
    );

    // load data into the system
    const indexedData = customIndexFn
      ? await customIndexFn()
      : await indexHostsAndAlerts(
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
          enableFleetIntegration,
          undefined,
          CurrentKibanaVersionDocGenerator,
          undefined,
          undefined,
          undefined,
          undefined,
          this.log
        );

    if (waitUntilTransformed && customIndexFn) {
      await this.startTransform(currentTransformName);
      const metadataIds = Array.from(new Set(indexedData.hosts.map((host) => host.agent.id)));
      await this.waitForEndpoints(metadataIds, waitTimeout);
      await this.startTransform(unitedTransformName);
    }

    if (waitUntilTransformed) {
      const agentIds = Array.from(new Set(indexedData.agents.map((agent) => agent.agent!.id)));
      await this.waitForUnitedEndpoints(agentIds, waitTimeout);
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
        if (index === METADATA_UNITED_INDEX) {
          // United metadata transform occasionally can't find docs in .fleet-agents.
          // Running a search on the index first eliminates this issue.
          // Replacing the search with a refresh does not resolve flakiness.
          await this.esClient.search({ index: AGENTS_INDEX });
        }
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
    return installOrUpgradeEndpointFleetPackage(this.kbnClient, this.log);
  }

  /**
   * Fetch (GET) the details of an endpoint
   * @param endpointAgentId
   */
  async fetchEndpointMetadata(endpointAgentId: string): Promise<HostInfo> {
    return this.supertest
      .get(HOST_METADATA_GET_ROUTE.replace('{id}', endpointAgentId))
      .set('kbn-xsrf', 'true')
      .set('Elastic-Api-Version', '2023-10-31')
      .send()
      .expect(200)
      .then((response) => response.body as HostInfo);
  }

  /**
   * Sends an updated metadata document for a given endpoint to the datastream and waits for the
   * update to show up on the Metadata API (after transform runs)
   */
  async sendEndpointMetadataUpdate(
    endpointAgentId: string,
    updates: DeepPartial<HostMetadata> = {}
  ): Promise<HostInfo> {
    const currentMetadata = await this.fetchEndpointMetadata(endpointAgentId);
    const generatedMetadataDoc = new EndpointDocGenerator().generateHostMetadata();

    const updatedMetadataDoc = merge(
      { ...currentMetadata.metadata },
      // Grab the updated `event` and timestamp from the generator data
      {
        event: generatedMetadataDoc.event,
        '@timestamp': generatedMetadataDoc['@timestamp'],
      },
      updates
    );

    await this.esClient.index({
      index: METADATA_DATASTREAM,
      body: updatedMetadataDoc,
      op_type: 'create',
    });

    let response: HostInfo | undefined;

    // Wait for the update to show up on Metadata API (after transform runs)
    await this.retry.waitFor(
      `Waiting for update to endpoint id [${endpointAgentId}] to be processed by transform`,
      async () => {
        response = await this.fetchEndpointMetadata(endpointAgentId);

        return response.metadata.event.id === updatedMetadataDoc.event.id;
      }
    );

    if (!response) {
      throw new Error(`Response object not set. Issue fetching endpoint metadata`);
    }

    this.log.info(`Endpoint metadata doc update done: \n${JSON.stringify(response)}`);

    return response;
  }

  async isEndpointPackageV2(): Promise<boolean> {
    const endpointPackage = await getEndpointPackageInfo(this.kbnClient);
    return isEndpointPackageV2(endpointPackage.version);
  }
}
