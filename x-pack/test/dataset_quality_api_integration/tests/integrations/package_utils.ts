/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SuperTest, Test } from 'supertest';

export interface IntegrationPackage {
  name: string;
  version: string;
}

export interface CustomIntegration {
  integrationName: string;
  datasets: IntegrationDataset[];
}

export interface IntegrationDataset {
  name: string;
  type: 'logs' | 'metrics' | 'synthetics';
}

export async function installCustomIntegration({
  supertest,
  customIntegration,
}: {
  supertest: SuperTest<Test>;
  customIntegration: CustomIntegration;
}) {
  const { integrationName, datasets } = customIntegration;

  return supertest
    .post(`/api/fleet/epm/custom_integrations`)
    .set('kbn-xsrf', 'xxxx')
    .send({ integrationName, datasets });
}

export async function installPackage({
  supertest,
  pkg,
}: {
  supertest: SuperTest<Test>;
  pkg: IntegrationPackage;
}) {
  const { name, version } = pkg;

  return supertest
    .post(`/api/fleet/epm/packages/${name}/${version}`)
    .set('kbn-xsrf', 'xxxx')
    .send({ force: true });
}

export async function uninstallPackage({
  supertest,
  pkg,
}: {
  supertest: SuperTest<Test>;
  pkg: IntegrationPackage;
}) {
  const { name, version } = pkg;

  return supertest.delete(`/api/fleet/epm/packages/${name}/${version}`).set('kbn-xsrf', 'xxxx');
}
