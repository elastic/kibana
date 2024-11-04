/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from './ftr_provider_context';

interface IntegrationPackage {
  name: string;
  version: string;
}

export function PackageService({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  function uninstallPackage({ name, version }: IntegrationPackage) {
    return supertest.delete(`/api/fleet/epm/packages/${name}/${version}`).set('kbn-xsrf', 'xxxx');
  }

  function installPackage({ name, version }: IntegrationPackage) {
    return supertest
      .post(`/api/fleet/epm/packages/${name}/${version}`)
      .set('kbn-xsrf', 'xxxx')
      .send({ force: true });
  }

  return { uninstallPackage, installPackage };
}
