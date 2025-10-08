/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { epmRouteService } from '@kbn/fleet-plugin/common';
import type SuperTest from 'supertest';

/**
 * Gets the security_detection_engine package using fleet API.
 *
 * @param supertest Supertest instance
 * @returns The API endpoint response. Will have status 200 if package installed or 404 if not
 */
export async function getPrebuiltRulesFleetPackage(supertest: SuperTest.Agent) {
  return await supertest
    .get(epmRouteService.getInfoPath('security_detection_engine'))
    .set('kbn-xsrf', 'true')
    .set('elastic-api-version', '2023-10-31')
    .send();
}
