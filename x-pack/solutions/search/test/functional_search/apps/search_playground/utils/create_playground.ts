/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import type SuperTest from 'supertest';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import {
  type PlaygroundSavedObject,
  APIRoutes,
  ROUTE_VERSIONS,
} from '@kbn/search-playground/common';
import { ToolingLog } from '@kbn/tooling-log';

function prefixApiRouteWithSpace(route: string, space?: string) {
  if (!space) return route;
  return `/s/${space}${route}`;
}

export async function createPlayground(
  playground: PlaygroundSavedObject,
  {
    log,
    supertest,
    space,
  }: {
    log: ToolingLog;
    supertest: SuperTest.Agent;
    space?: string;
  }
): Promise<string> {
  const { body } = await supertest
    .put(prefixApiRouteWithSpace(APIRoutes.PUT_PLAYGROUND_CREATE, space))
    .set('kbn-xsrf', 'xxx')
    .set(ELASTIC_HTTP_VERSION_HEADER, ROUTE_VERSIONS.v1)
    .send(playground)
    .expect(200);

  expect(body).toBeDefined();
  expect(body._meta).toBeDefined();
  expect(body._meta.id).toBeDefined();

  log.info(
    `Created saved playground [${playground.name}] - ${space ? space + '/' : ''}${body._meta.id}`
  );
  log.debug(`Saved playground: ${JSON.stringify(playground)}`);
  return body._meta.id;
}

export async function deletePlayground(
  id: string,
  {
    log,
    supertest,
    space,
  }: {
    log: ToolingLog;
    supertest: SuperTest.Agent;
    space?: string;
  }
): Promise<void> {
  await supertest
    .delete(prefixApiRouteWithSpace(APIRoutes.DELETE_PLAYGROUND.replace('{id}', id), space))
    .set('kbn-xsrf', 'xxx')
    .set(ELASTIC_HTTP_VERSION_HEADER, ROUTE_VERSIONS.v1)
    .expect(200);
  log.info(`Deleted saved playground [${space ? space + '/' : ''}${id}]`);
}
