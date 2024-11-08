/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Agent } from 'supertest';

export async function getInstallationInfo(supertest: Agent, name: string, version: string) {
  const res = await supertest.get(`/api/fleet/epm/packages/${name}/${version}`).expect(200);
  return res.body.item.installationInfo;
}
