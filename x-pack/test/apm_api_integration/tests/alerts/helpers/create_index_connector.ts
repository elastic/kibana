/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SuperTest, Test } from 'supertest';
import { APM_RULE_CONNECTOR_INDEX } from './constants';

export async function createIndexConnector({
  supertest,
  name,
}: {
  supertest: SuperTest<Test>;
  name: string;
}) {
  const { body } = await supertest
    .post(`/api/actions/connector`)
    .set('kbn-xsrf', 'foo')
    .send({
      name,
      config: {
        index: APM_RULE_CONNECTOR_INDEX,
        refresh: true,
      },
      connector_type_id: '.index',
    });
  return body.id as string;
}
