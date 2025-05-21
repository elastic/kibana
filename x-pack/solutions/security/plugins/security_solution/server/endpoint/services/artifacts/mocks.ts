/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import {
  elasticsearchServiceMock,
  loggingSystemMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';
import type { ElasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
// Because mocks are for testing only, should be ok to import the FleetArtifactsClient directly
import {
  appContextService as fleetAppContextService,
  FleetArtifactsClient,
} from '@kbn/fleet-plugin/server/services';
import {
  createAppContextStartContractMock as fleetCreateAppContextStartContractMock,
  createArtifactsClientMock,
} from '@kbn/fleet-plugin/server/mocks';

import type { ProductFeatureKeys } from '@kbn/security-solution-features';
import type { ManifestManagerMockOptions } from './manifest_manager/manifest_manager.mock';
import { buildManifestManagerMockOptions } from './manifest_manager/manifest_manager.mock';
import type { ManifestManagerContext } from '..';
import { createMockEndpointAppContextService } from '../../mocks';
import { parseExperimentalConfigValue } from '../../../../common/experimental_features';
import { ManifestClient } from './manifest_client';
import { EndpointArtifactClient } from './artifact_client';
import type { EndpointArtifactClientInterface } from './artifact_client';

export const getManifestClientMock = (
  savedObjectsClient?: SavedObjectsClientContract
): ManifestClient => {
  if (savedObjectsClient !== undefined) {
    return new ManifestClient(savedObjectsClient, 'v1');
  }
  return new ManifestClient(savedObjectsClientMock.create(), 'v1');
};

/**
 * Returns back a mocked EndpointArtifactClient along with the internal FleetArtifactsClient and the Es Clients that are being used
 * @param esClient
 */
export const createEndpointArtifactClientMock = (
  esClient: ElasticsearchClientMock = elasticsearchServiceMock.createScopedClusterClient()
    .asInternalUser
): jest.Mocked<EndpointArtifactClientInterface> & {
  _esClient: ElasticsearchClientMock;
} => {
  const fleetArtifactClientMocked = createArtifactsClientMock();
  const endpointArtifactClientMocked = new EndpointArtifactClient(fleetArtifactClientMocked);

  fleetAppContextService.start(fleetCreateAppContextStartContractMock());
  // Return the interface mocked with jest.fn() that fowards calls to the real instance
  return {
    createArtifact: jest.fn(async (...args) => {
      const fleetArtifactClient = new FleetArtifactsClient(esClient, 'endpoint');
      const endpointArtifactClient = new EndpointArtifactClient(fleetArtifactClient);
      const response = await endpointArtifactClient.createArtifact(...args);
      return response;
    }),
    bulkCreateArtifacts: jest.fn(async (...args) => {
      const fleetArtifactClient = new FleetArtifactsClient(esClient, 'endpoint');
      const endpointArtifactClient = new EndpointArtifactClient(fleetArtifactClient);
      const response = await endpointArtifactClient.bulkCreateArtifacts(...args);
      return response;
    }),
    listArtifacts: jest.fn((...args) => endpointArtifactClientMocked.listArtifacts(...args)),
    getArtifact: jest.fn((...args) => endpointArtifactClientMocked.getArtifact(...args)),
    deleteArtifact: jest.fn((...args) => endpointArtifactClientMocked.deleteArtifact(...args)),
    bulkDeleteArtifacts: jest.fn(async (...args) =>
      endpointArtifactClientMocked.bulkDeleteArtifacts(...args)
    ),
    fetchAll: jest.fn((...args) => endpointArtifactClientMocked.fetchAll(...args)),
    _esClient: esClient,
  };
};

export const buildManifestManagerContextMock = (
  opts: Partial<ManifestManagerMockOptions>,
  customProductFeatures?: ProductFeatureKeys
): ManifestManagerContext => {
  // FYI: this mock was moved in order to avoid circular dependencies between mocks for
  //      EndpointAppContextService and Manifest Manager

  const fullOpts = buildManifestManagerMockOptions(opts, customProductFeatures);

  return {
    ...fullOpts,
    endpointService: createMockEndpointAppContextService(),
    artifactClient: createEndpointArtifactClientMock(),
    logger: loggingSystemMock.create().get() as jest.Mocked<Logger>,
    experimentalFeatures: parseExperimentalConfigValue([...(opts.experimentalFeatures ?? [])])
      .features,
    packagerTaskPackagePolicyUpdateBatchSize: 10,
    esClient: elasticsearchServiceMock.createElasticsearchClient(),
  };
};
