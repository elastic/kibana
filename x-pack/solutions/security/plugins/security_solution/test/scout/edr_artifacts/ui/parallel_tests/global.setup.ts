/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';
import { getEndpointArtifactsApiService, globalSetupHook } from '@kbn/scout-security';
import { setupFleetForEndpoint } from '../../../../../common/endpoint/data_loaders/setup_fleet_for_endpoint';
import { seedEndpointFieldCapsDocs } from '../fixtures/seed_endpoint_field_caps';

globalSetupHook(
  'Prepare Fleet for EDR artifact policy-tab tests',
  async ({ kbnClient, esClient, log }) => {
    // The blocklist specs share the agnostic `endpoint_blocklists` list and
    // create items through the API, which 404s until the list exists. Create
    // it once here: two workers racing the create POST can both pass the
    // route's existence check and leave duplicate list containers.
    log.debug('[setup] ensuring the endpoint_blocklists exception list exists');
    await getEndpointArtifactsApiService({ kbnClient, esClient, log }).ensureList({
      listId: ENDPOINT_ARTIFACT_LISTS.blocklists.id,
      name: ENDPOINT_ARTIFACT_LISTS.blocklists.name,
      description: ENDPOINT_ARTIFACT_LISTS.blocklists.description,
      type: ExceptionListTypeEnum.ENDPOINT_BLOCKLISTS,
    });
    log.debug(
      '[setup] initializing Fleet and installing the endpoint package in the default space'
    );
    // Worker fixtures create policies in `/s/{space}`. EPM getInfo and
    // ensureInstalledPackage must already have the endpoint package in `default`
    // or the per-worker loader retries package-policy create for minutes.
    await setupFleetForEndpoint(kbnClient, log);
    // Event Filters / Endpoint Exceptions autocomplete needs field caps on the
    // endpoint events and alerts data streams. No Fleet Server or enrolled hosts.
    await seedEndpointFieldCapsDocs(esClient, log);
  }
);
