/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { KbnClient } from '@kbn/test';
import pRetry from 'p-retry';
import { kibanaPackageJson } from '@kbn/repo-info';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  RETRYABLE_TRANSIENT_ERRORS,
  retryOnError,
} from '../../../../../common/endpoint/data_loaders/utils';
import { fetchFleetLatestAvailableAgentVersion } from '../../../../../common/endpoint/utils/fetch_fleet_version';
import { dump } from '../../../../../scripts/endpoint/common/utils';
import { STARTED_TRANSFORM_STATES } from '../../../../../common/constants';
import {
  ENDPOINT_ALERTS_INDEX,
  ENDPOINT_EVENTS_INDEX,
} from '../../../../../scripts/endpoint/common/constants';
import {
  METADATA_DATASTREAM,
  METADATA_UNITED_INDEX,
  METADATA_UNITED_TRANSFORM,
  metadataCurrentIndexPattern,
  metadataTransformPrefix,
  METADATA_CURRENT_TRANSFORM_V2,
  METADATA_UNITED_TRANSFORM_V2,
  POLICY_RESPONSE_INDEX,
} from '../../../../../common/endpoint/constants';
import { EndpointDocGenerator } from '../../../../../common/endpoint/generate_data';
import type { GetCustomEndpointMetadataGeneratorOptions } from '../../../../../common/endpoint/data_generators/endpoint_metadata_generator';
import { EndpointMetadataGenerator } from '../../../../../common/endpoint/data_generators/endpoint_metadata_generator';
import { indexHostsAndAlerts } from '../../../../../common/endpoint/index_data';
import type { IndexedHostsAndAlertsResponse } from '../../../../../common/endpoint/index_data';

export interface CyLoadEndpointDataOptions
  extends Pick<GetCustomEndpointMetadataGeneratorOptions, 'version' | 'os'> {
  numHosts: number;
  numHostDocs: number;
  alertsPerHost: number;
  enableFleetIntegration: boolean;
  generatorSeed: string;
  waitUntilTransformed: boolean;
  withResponseActions: boolean;
  numResponseActions?: number;
  isolation: boolean;
  bothIsolatedAndNormalEndpoints?: boolean;
  alertIds?: string[];
  isServerless?: boolean;
}

/**
 * Cypress plugin for handling loading Endpoint data into ES
 * @param esClient
 * @param kbnClient
 * @param log
 * @param options
 */
export const cyLoadEndpointDataHandler = async (
  esClient: Client,
  kbnClient: KbnClient,
  log: ToolingLog,
  options: Partial<CyLoadEndpointDataOptions> = {}
): Promise<IndexedHostsAndAlertsResponse> => {
  const {
    numHosts = 1,
    numHostDocs = 1,
    alertsPerHost = 1,
    enableFleetIntegration = true,
    generatorSeed = `cy.${Math.random()}`,
    waitUntilTransformed = true,
    version = kibanaPackageJson.version,
    os,
    withResponseActions,
    isolation,
    numResponseActions,
    alertIds,
    isServerless = false,
  } = options;

  let agentVersion = version;

  if (isServerless) {
    agentVersion = await fetchFleetLatestAvailableAgentVersion(kbnClient);
  }

  const DocGenerator = EndpointDocGenerator.custom({
    CustomMetadataGenerator: EndpointMetadataGenerator.custom({
      version: agentVersion,
      os,
      isolation,
    }),
  });

  if (waitUntilTransformed) {
    log.info(`Stopping transforms...`);

    // need this before indexing docs so that the united transform doesn't
    // create a checkpoint with a timestamp after the doc timestamps
    await stopTransform(esClient, log, metadataTransformPrefix);
    await stopTransform(esClient, log, METADATA_CURRENT_TRANSFORM_V2);
    await stopTransform(esClient, log, METADATA_UNITED_TRANSFORM);
    await stopTransform(esClient, log, METADATA_UNITED_TRANSFORM_V2);
  }

  log.info(`Calling indexHostAndAlerts() to index [${numHosts}] endpoint hosts...`);

  // load data into the system
  const indexedData = await indexHostsAndAlerts(
    esClient as Client,
    kbnClient,
    generatorSeed,
    numHosts,
    numHostDocs,
    METADATA_DATASTREAM,
    POLICY_RESPONSE_INDEX,
    ENDPOINT_EVENTS_INDEX,
    ENDPOINT_ALERTS_INDEX,
    alertsPerHost,
    enableFleetIntegration,
    undefined,
    DocGenerator,
    withResponseActions,
    numResponseActions,
    alertIds,
    isServerless,
    log
  );

  log.info(`Hosts have been indexed`);

  if (waitUntilTransformed) {
    log.info(`starting transforms...`);

    // missing transforms are ignored, start either name
    await startTransform(esClient, log, metadataTransformPrefix);
    await startTransform(esClient, log, METADATA_CURRENT_TRANSFORM_V2);

    const metadataIds = Array.from(new Set(indexedData.hosts.map((host) => host.agent.id)));
    await waitForEndpoints(esClient, log, 'endpoint_index', metadataIds);

    await startTransform(esClient, log, METADATA_UNITED_TRANSFORM);
    await startTransform(esClient, log, METADATA_UNITED_TRANSFORM_V2);

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const agentIds = Array.from(new Set(indexedData.agents.map((agent) => agent.agent!.id)));
    await waitForEndpoints(esClient, log, 'united_index', agentIds);
  }

  log.info(`Done - [${numHosts}] endpoint hosts have been indexed and are now available in kibana`);
  return indexedData;
};

const stopTransform = async (
  esClient: Client,
  log: ToolingLog,
  transformId: string
): Promise<void> => {
  log.debug(`Stopping transform id: ${transformId}`);

  await retryOnError(
    () =>
      esClient.transform.stopTransform({
        transform_id: `${transformId}*`,
        force: true,
        wait_for_completion: true,
        allow_no_match: true,
      }),
    RETRYABLE_TRANSIENT_ERRORS,
    log
  );
};

const startTransform = async (
  esClient: Client,
  log: ToolingLog,
  transformId: string
): Promise<void> => {
  const transformsResponse = await retryOnError(
    () =>
      esClient.transform.getTransformStats({
        transform_id: `${transformId}*`,
      }),
    RETRYABLE_TRANSIENT_ERRORS,
    log
  );

  log.verbose(
    `Transform status found for [${transformId}*] returned:\n${dump(transformsResponse)}`
  );

  await Promise.all(
    transformsResponse.transforms.map((transform) => {
      if (STARTED_TRANSFORM_STATES.has(transform.state)) {
        return Promise.resolve();
      }

      log.debug(`Staring transform id: [${transform.id}]`);

      return retryOnError(
        () => esClient.transform.startTransform({ transform_id: transform.id }),
        RETRYABLE_TRANSIENT_ERRORS,
        log
      );
    })
  );
};

/**
 * Waits for data to show up on the Transform destination index of either the Endpoint metadata or
 * the united metadata index
 *
 * @param esClient
 * @param log
 * @param location
 * @param ids
 */
const waitForEndpoints = async (
  esClient: Client,
  log: ToolingLog,
  location: 'endpoint_index' | 'united_index',
  ids: string[] = []
): Promise<void> => {
  const index = location === 'endpoint_index' ? metadataCurrentIndexPattern : METADATA_UNITED_INDEX;
  const body = ids.length
    ? location === 'endpoint_index'
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

  const expectedSize = ids.length || 1;

  log.info(`Waiting for [${expectedSize}] endpoint hosts to be available`);
  log.verbose(`Query for searching index [${index}]:\n${dump(body, 10)}`);

  await pRetry(
    async (attemptCount) => {
      log.debug(`Attempt [${attemptCount}]: Searching [${index}] to check if hosts are availble`);

      const response = await esClient.search({
        index,
        size: expectedSize,
        body,
        rest_total_hits_as_int: true,
      });

      log.verbose(`Attempt [${attemptCount}]: Search response:\n${dump(response, 10)}`);

      // If not the expected number of Endpoints, then throw an error so we keep trying
      if (response.hits.total !== expectedSize) {
        throw new Error(
          `Expected number of endpoints not found. Looking for ${expectedSize} but received ${response.hits.total}`
        );
      }

      log.info(`Attempt [${attemptCount}]: Done - [${expectedSize}] host are now available`);
    },
    { forever: false }
  );
};
