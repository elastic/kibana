/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { epmRouteService } from '@kbn/fleet-plugin/common';
import type SuperTest from 'supertest';

/**
 * Delete the security_detection_engine package using fleet API.
 *
 * @param supertest Supertest instance
 */
export async function deletePrebuiltRulesFleetPackage(
  supertest: SuperTest.SuperTest<SuperTest.Test>
) {
  const resp = await supertest
    .get(epmRouteService.getInfoPath('security_detection_engine'))
    .set('kbn-xsrf', 'true')
    .set('elastic-api-version', '2023-10-31')
    .send();

  if (resp.status === 200 && resp.body.response.status === 'installed') {
    await supertest
      .delete(
        epmRouteService.getRemovePath('security_detection_engine', resp.body.response.version)
      )
      .set('kbn-xsrf', 'true')
      .send({ force: true });
  }
}
