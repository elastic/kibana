/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Agent as SuperTestAgent } from 'supertest';

export async function installPackage({
  supertest,
  pkg,
}: {
  supertest: SuperTestAgent;
  pkg: string;
}) {
  const {
    body: {
      item: { latestVersion: version },
    },
  } = await supertest
    .get(`/api/fleet/epm/packages/${pkg}`)
    .set('kbn-xsrf', 'xxxx')
    .send({ force: true });

  return supertest
    .post(`/api/fleet/epm/packages/${pkg}/${version}`)
    .set('kbn-xsrf', 'xxxx')
    .send({ force: true });
}

export async function uninstallPackage({
  supertest,
  pkg,
}: {
  supertest: SuperTestAgent;
  pkg: string;
}) {
  return supertest.delete(`/api/fleet/epm/packages/${pkg}`).set('kbn-xsrf', 'xxxx');
}
