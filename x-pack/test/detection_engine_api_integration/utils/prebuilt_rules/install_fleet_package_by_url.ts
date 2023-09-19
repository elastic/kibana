/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Client } from '@elastic/elasticsearch';
import type SuperTest from 'supertest';
import { ALL_SAVED_OBJECT_INDICES } from '@kbn/core-saved-objects-server';
import { InstallPackageResponse } from '@kbn/fleet-plugin/common/types';

/**
 * Installs prebuilt rules package `security_detection_engine` by version.
 *
 * @param es Elasticsearch client
 * @param supertest SuperTest instance
 * @param version Semver version of the `security_detection_engine` package to install
 * @returns Fleet install package response
 */

export const installPrebuiltRulesPackageByVersion = async (
  es: Client,
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  version: string
): Promise<InstallPackageResponse> => {
  const fleetResponse = await supertest
    .post(`/api/fleet/epm/packages/security_detection_engine/${version}`)
    .set('kbn-xsrf', 'xxxx')
    .type('application/json')
    .send({ force: true })
    .expect(200);

  // Before we proceed, we need to refresh saved object indices.
  // At the previous step we installed the Fleet package with prebuilt detection rules.
  // Prebuilt rules are assets that Fleet indexes as saved objects of a certain type.
  // Fleet does this via a savedObjectsClient.import() call with explicit `refresh: false`.
  // So, despite of the fact that the endpoint waits until the prebuilt rule assets will be
  // successfully indexed, it doesn't wait until they become "visible" for subsequent read
  // operations.
  // And this is usually what we do next in integration tests: we read these SOs with utility
  // function such as getPrebuiltRulesAndTimelinesStatus().
  // Now, the time left until the next refresh can be anything from 0 to the default value, and
  // it depends on the time when savedObjectsClient.import() call happens relative to the time of
  // the next refresh. Also, probably the refresh time can be delayed when ES is under load?
  // Anyway, this can cause race condition between a write and subsequent read operation, and to
  // fix it deterministically we have to refresh saved object indices and wait until it's done.
  await es.indices.refresh({ index: ALL_SAVED_OBJECT_INDICES });

  return fleetResponse.body as InstallPackageResponse;
};
