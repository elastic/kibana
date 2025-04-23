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
  METADATA_DATASTREAM,
  METADATA_UNITED_INDEX,
} from '@kbn/security-solution-plugin/common/endpoint/constants';
import {
  deleteIndexedHostsAndAlerts,
  DeleteIndexedHostsAndAlertsResponse,
  IndexedHostsAndAlertsResponse,
  indexHostsAndAlerts,
} from '@kbn/security-solution-plugin/common/endpoint/index_data';
import { getEndpointPackageInfo } from '@kbn/security-solution-plugin/common/endpoint/utils/package';
import { isEndpointPackageV2 } from '@kbn/security-solution-plugin/common/endpoint/utils/package_v2';
import { installOrUpgradeEndpointFleetPackage } from '@kbn/security-solution-plugin/common/endpoint/data_loaders/setup_fleet_for_endpoint';
import { EndpointError } from '@kbn/security-solution-plugin/common/endpoint/errors';
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
import { DEFAULT_SPACE_ID, addSpaceIdToPath } from '@kbn/spaces-plugin/common';
import { createKbnClient } from '@kbn/security-solution-plugin/scripts/endpoint/common/stack_services';
import { catchAxiosErrorFormatAndThrow } from '@kbn/security-solution-plugin/common/endpoint/format_axios_error';
import {
  startMetadataTransforms,
  stopMetadataTransforms,
} from '@kbn/security-solution-plugin/common/endpoint/utils/transforms';
import { FtrService } from '../../functional/ftr_provider_context';

export type IndexedHostsAndAlertsResponseExtended = IndexedHostsAndAlertsResponse & {
  unloadEndpointData(): Promise<DeleteIndexedHostsAndAlertsResponse>;
  spaceId: string;
};

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

  public getScopedKbnClient(spaceId: string = DEFAULT_SPACE_ID): KbnClient {
    if (!spaceId || spaceId === DEFAULT_SPACE_ID) {
      return this.kbnClient;
    }

    const kbnClientOptions: Parameters<typeof createKbnClient>[0] = {
      url: this.kbnClient.resolveUrl('/'),
      username: this.config.get('servers.elasticsearch.username'),
      password: this.config.get('servers.elasticsearch.password'),
      spaceId,
    };

    this.log.info(`creating new KbnClient with:\n${JSON.stringify(kbnClientOptions, null, 2)}`);

    // Was not included above in order to keep the output of the log.info() above clean in the output
    kbnClientOptions.log = this.log;

    return createKbnClient(kbnClientOptions);
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
      spaceId: string;
      withResponseActions: boolean;
    }> = {}
  ): Promise<IndexedHostsAndAlertsResponseExtended> {
    const {
      numHosts = 1,
      numHostDocs = 1,
      alertsPerHost = 1,
      enableFleetIntegration = true,
      generatorSeed = 'seed',
      waitUntilTransformed = true,
      waitTimeout = 120000,
      customIndexFn,
      spaceId = DEFAULT_SPACE_ID,
      withResponseActions = true,
    } = options;

    const kbnClient = this.getScopedKbnClient(spaceId);
    const endpointPackage = await getEndpointPackageInfo(kbnClient);

    if (waitUntilTransformed && customIndexFn) {
      // need this before indexing docs so that the united transform doesn't
      // create a checkpoint with a timestamp after the doc timestamps
      await stopMetadataTransforms(this.esClient, endpointPackage.version);
    }

    const isServerless = await isServerlessKibanaFlavor(kbnClient);
    const CurrentKibanaVersionDocGenerator = await createDocGeneratorClass(kbnClient, isServerless);

    // load data into the system
    const indexedData = customIndexFn
      ? await customIndexFn()
      : await indexHostsAndAlerts(
          this.esClient as Client,
          kbnClient,
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
          withResponseActions,
          undefined,
          undefined,
          undefined,
          this.log
        );

    if (waitUntilTransformed && customIndexFn) {
      await startMetadataTransforms(
        this.esClient,
        Array.from(new Set(indexedData.hosts.map((host) => host.agent.id))),
        endpointPackage.version
      );
    }

    if (waitUntilTransformed) {
      const agentIds = Array.from(new Set(indexedData.agents.map((agent) => agent.agent!.id)));
      await this.waitForUnitedEndpoints(agentIds, waitTimeout);
    }

    return {
      ...indexedData,
      spaceId,
      unloadEndpointData: (): Promise<DeleteIndexedHostsAndAlertsResponse> => {
        return this.unloadEndpointData(indexedData, { spaceId });
      },
    };
  }

  /**
   * Deletes the loaded data created via `loadEndpointData()`
   * @param indexedData
   * @param options
   */
  async unloadEndpointData(
    indexedData: IndexedHostsAndAlertsResponse,
    { spaceId = DEFAULT_SPACE_ID }: { spaceId?: string } = {}
  ): Promise<DeleteIndexedHostsAndAlertsResponse> {
    return deleteIndexedHostsAndAlerts(
      this.esClient as Client,
      this.getScopedKbnClient(spaceId),
      indexedData
    );
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
  async installOrUpgradeEndpointFleetPackage(
    spaceId: string = DEFAULT_SPACE_ID
  ): ReturnType<typeof installOrUpgradeEndpointFleetPackage> {
    return installOrUpgradeEndpointFleetPackage(this.getScopedKbnClient(spaceId), this.log);
  }

  /**
   * Fetch (GET) the details of an endpoint
   * @param endpointAgentId
   * @param spaceId
   */
  async fetchEndpointMetadata(
    endpointAgentId: string,
    spaceId: string = DEFAULT_SPACE_ID
  ): Promise<HostInfo> {
    return this.supertest
      .get(addSpaceIdToPath('/', spaceId, HOST_METADATA_GET_ROUTE.replace('{id}', endpointAgentId)))
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
    updates: DeepPartial<HostMetadata> = {},
    spaceId: string = DEFAULT_SPACE_ID
  ): Promise<HostInfo> {
    const currentMetadata = await this.fetchEndpointMetadata(endpointAgentId, spaceId);
    const endpointPackage = await getEndpointPackageInfo(this.getScopedKbnClient(spaceId));

    await stopMetadataTransforms(this.esClient, endpointPackage.version);
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

    await this.esClient
      .index({
        index: METADATA_DATASTREAM,
        body: updatedMetadataDoc,
        op_type: 'create',
      })
      .catch(catchAxiosErrorFormatAndThrow);

    await startMetadataTransforms(this.esClient, [], endpointPackage.version);

    this.log.info(
      `Endpoint metadata update was indexed for endpoint agent id [${endpointAgentId}] in space [${spaceId}]`
    );

    let response: HostInfo | undefined;

    // Wait for the update to show up on Metadata API (after transform runs)
    await this.retry.waitFor(
      `update to endpoint id [${endpointAgentId}] to be processed by transform`,
      async () => {
        response = await this.fetchEndpointMetadata(endpointAgentId, spaceId);

        return response.metadata.event.id === updatedMetadataDoc.event.id;
      }
    );

    if (!response) {
      throw new Error(`Response object not set. Issue fetching endpoint metadata`);
    }

    this.log.info(`Endpoint metadata doc update done for agent ID [${endpointAgentId}]`);
    this.log.verbose(JSON.stringify(response, null, 2));

    return response;
  }

  async isEndpointPackageV2(spaceId: string = DEFAULT_SPACE_ID): Promise<boolean> {
    const endpointPackage = await getEndpointPackageInfo(this.getScopedKbnClient(spaceId));
    return isEndpointPackageV2(endpointPackage.version);
  }
}
